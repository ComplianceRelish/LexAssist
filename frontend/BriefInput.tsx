import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeBrief, aiAnalyzeBrief, triggerDeepDive, getDeepDiveStatus, SpeechTranscriptionResult, DocumentScanResult, AnalysisProgress } from './utils/api';
import SpeechInput from './SpeechInput';
import DocumentScanner from './DocumentScanner';
import ResponseTabs from './ResponseTabs';

// Web Speech API types (kept as fallback)
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface BriefInputProps {
  isLoggedIn: boolean;
  onBriefChange?: (text: string) => void;
  onOpenChat?: () => void;
}

type AnalysisMode = 'basic' | 'ai';

const BriefInput: React.FC<BriefInputProps> = ({ isLoggedIn, onBriefChange, onOpenChat }) => {
  const navigate = useNavigate();
  const [brief, setBrief] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('ai');
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastSpeechMeta, setLastSpeechMeta] = useState<SpeechTranscriptionResult | null>(null);
  const [lastScanResult, setLastScanResult] = useState<DocumentScanResult | null>(null);
  const [showDocScanner, setShowDocScanner] = useState(false);
  const [deepDiveStatus, setDeepDiveStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deepDivePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  // Keep isRecordingRef in sync with isRecording state
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Notify parent of brief text changes
  useEffect(() => {
    onBriefChange?.(brief);
  }, [brief, onBriefChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (deepDivePollRef.current) clearInterval(deepDivePollRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setAiResult(null);
    setAnalysisProgress(null);
    setDeepDiveStatus('idle');
    if (deepDivePollRef.current) { clearInterval(deepDivePollRef.current); deepDivePollRef.current = null; }
    if (!isLoggedIn) { setShowLoginPrompt(true); return; }
    if (!brief.trim()) { setError('Please enter or dictate your case brief'); return; }

    setLoading(true);
    try {
      if (analysisMode === 'ai') {
        // AI-enhanced analysis (Claude + regex + Indian Kanoon) — with live progress
        const res = await aiAnalyzeBrief(brief, (progress) => {
          setAnalysisProgress(progress);
        });
        setAiResult(res);
        // Also extract the regex part for backward compat
        setResult({
          status: 'success',
          statutes: res.statutes_regex || [],
          precedents: res.precedents_kanoon || [],
          entities: res.entities || {},
          case_type: res.case_type_regex || {},
          jurisdiction: res.jurisdiction_regex || {},
          timeline: res.timeline || [],
          analysis: res.ai_analysis?.strategic_recommendations
            ? {
                summary: res.ai_analysis.case_summary || '',
                arguments: res.ai_analysis.arguments_for_petitioner || [],
                challenges: res.ai_analysis.arguments_for_respondent || [],
                recommendations: res.ai_analysis.strategic_recommendations || [],
              }
            : { summary: '', arguments: [], challenges: [], recommendations: [] },
        });
      } else {
        // Basic regex-only analysis
        const res = await analyzeBrief(brief);
        setResult(res);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to analyze brief');
    } finally {
      setLoading(false);
      setAnalysisProgress(null);
    }
  };

  // ── Deep Dive: trigger background multi-pass analysis ──────────
  const startDeepDive = async () => {
    if (!aiResult?.brief_id) return;
    try {
      setDeepDiveStatus('running');
      await triggerDeepDive(aiResult.brief_id, aiResult.case_id);

      // Poll for completion every 8 seconds
      deepDivePollRef.current = setInterval(async () => {
        try {
          const res = await getDeepDiveStatus(aiResult.brief_id);
          if (res.status === 'complete' && res.analysis) {
            if (deepDivePollRef.current) { clearInterval(deepDivePollRef.current); deepDivePollRef.current = null; }
            setDeepDiveStatus('complete');
            // Swap in the deep analysis results
            setAiResult(res.analysis);
            // Update the basic result for backward compat
            const deepAI = res.analysis?.ai_analysis;
            if (deepAI) {
              setResult((prev: any) => prev ? ({
                ...prev,
                analysis: {
                  summary: deepAI.case_summary || prev.analysis?.summary || '',
                  arguments: deepAI.arguments_for_petitioner || prev.analysis?.arguments || [],
                  challenges: deepAI.arguments_for_respondent || prev.analysis?.challenges || [],
                  recommendations: deepAI.strategic_recommendations || prev.analysis?.recommendations || [],
                },
              }) : prev);
            }
          } else if (res.status === 'error') {
            if (deepDivePollRef.current) { clearInterval(deepDivePollRef.current); deepDivePollRef.current = null; }
            setDeepDiveStatus('error');
          }
        } catch {
          // Transient poll error — keep polling
        }
      }, 8000);
    } catch {
      setDeepDiveStatus('error');
    }
  };

  const startRecording = useCallback(() => {
    if (!isLoggedIn) { setShowLoginPrompt(true); return; }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setRecordingTime(0);
      setInterimTranscript('');
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        setBrief(prev => (prev ? prev + ' ' : '') + finalText.trim());
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
      stopRecording();
    };

    recognition.onend = () => {
      if (recognitionRef.current && isRecordingRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isLoggedIn]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setInterimTranscript('');
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const handleVoiceInput = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // Handler for the new Whisper-powered SpeechInput component
  const handleSpeechTranscript = useCallback((text: string) => {
    setBrief(prev => (prev ? prev + ' ' : '') + text.trim());
  }, []);

  const handleSpeechMeta = useCallback((meta: SpeechTranscriptionResult) => {
    setLastSpeechMeta(meta);
  }, []);

  // Handler for the Document Scanner component
  const handleDocumentText = useCallback((text: string) => {
    setBrief(prev => (prev ? prev + '\n\n--- Scanned Document ---\n' : '') + text.trim());
    setShowDocScanner(false);
  }, []);

  const handleDocScanResult = useCallback((result: DocumentScanResult) => {
    setLastScanResult(result);
  }, []);

  const handleClear = () => {
    setBrief('');
    setResult(null);
    setAiResult(null);
    setError(null);
    setInterimTranscript('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Transform analysis result into ResponseTabs format
  const transformedResult = useMemo(() => result && result.status === 'success' ? {
    lawSections: (result.statutes || []).map((s: any, i: number) => ({
      title: s.full_name || s.short_name,
      sectionNumber: (s.sections || []).join(', ') || 'N/A',
      content: `${s.full_name}${s.sections?.length ? ' — Section(s) ' + s.sections.join(', ') : ''}`,
      relevance: s.relevance === 'high' ? 9 : s.relevance === 'medium' ? 6 : 4,
    })),
    caseHistories: (result.precedents || []).map((p: any) => ({
      citation: p.citation || p.doc_id || '',
      parties: p.title || '',
      holdings: p.headline || 'View full judgment on Indian Kanoon',
      relevance: 7,
      date: '',
    })),
    analysis: result.analysis || {
      summary: result.brief_summary || '',
      arguments: [],
      challenges: [],
      recommendations: [],
    },
    caseType: result.case_type,
    jurisdiction: result.jurisdiction,
    legalIssues: result.legal_issues,
    timeline: result.timeline,
    evidenceChecklist: result.analysis?.evidence_checklist || [],
    nextSteps: result.analysis?.next_steps || [],
    entities: result.entities,
    nlpEnrichment: result.nlp_enrichment,
  } : null, [result, aiResult]);
  
  return (
    <div>
      {/* Brief Input Card */}
      <div className="lex-card lex-brief-card mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <label htmlFor="brief" className="block text-lg font-semibold text-[#0a2e5c]">
                Case Brief
              </label>
              
              {/* Analysis Mode Toggle */}
              <div className="lex-mode-toggle">
                <button
                  type="button"
                  className={`lex-mode-btn ${analysisMode === 'basic' ? 'lex-mode-active' : ''}`}
                  onClick={() => setAnalysisMode('basic')}
                >
                  📊 Basic
                </button>
                <button
                  type="button"
                  className={`lex-mode-btn ${analysisMode === 'ai' ? 'lex-mode-active lex-mode-ai' : ''}`}
                  onClick={() => setAnalysisMode('ai')}
                >
                  🧠 AI Analysis
                  <span className="lex-mode-sparkle">✨</span>
                </button>
              </div>
            </div>

            <textarea
              id="brief"
              rows={10}
              className="lex-textarea"
              placeholder="Describe your case in detail — include parties, facts, dates, sections/acts involved, and the relief sought. You can also use the Voice Input button to dictate..."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={loading}
            />
            
            {interimTranscript && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm italic">
                🎙️ Hearing: "{interimTranscript}"
              </div>
            )}
            
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{brief.length} characters</span>
              {brief.trim() && <span>{brief.trim().split(/\s+/).length} words</span>}
            </div>
          </div>

          {error && (
            <div className="lex-alert lex-alert-error mb-4">
              <span className="lex-alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="lex-alert lex-alert-info mb-4">
              <div className="flex items-center gap-3">
                <div className="lex-spinner-sm"></div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {analysisMode === 'ai'
                      ? (analysisProgress?.message || 'AI is analyzing your brief...')
                      : 'Analyzing your brief...'}
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {analysisMode === 'ai'
                      ? (analysisProgress
                          ? `Step: ${analysisProgress.step.replace(/_/g, ' ')}`
                          : 'LexAssist AI is performing deep legal analysis — extracting entities, identifying precedents, mapping statutes, assessing risk')
                      : 'Extracting entities, searching precedents, mapping statutes'}
                  </div>
                  {/* Progress bar for AI analysis */}
                  {analysisMode === 'ai' && analysisProgress && analysisProgress.pct > 0 && (
                    <div className="mt-2 w-full bg-blue-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(analysisProgress.pct, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full">
              {/* Enterprise Voice Input (Whisper AI + Legal Correction) */}
              <SpeechInput
                onTranscript={handleSpeechTranscript}
                onMetadata={handleSpeechMeta}
                isLoggedIn={isLoggedIn}
                disabled={loading}
              />

              {/* Document Scanner Toggle */}
              <button
                type="button"
                onClick={() => setShowDocScanner(!showDocScanner)}
                className={`lex-btn-ghost ${showDocScanner ? 'lex-btn-active' : ''}`}
                disabled={loading}
              >
                📄 {showDocScanner ? 'Hide Scanner' : 'Scan Document'}
              </button>

              {brief.trim() && (
                <button type="button" onClick={handleClear} className="lex-btn-ghost" disabled={loading}>
                  Clear
                </button>
              )}

              {/* Chat with AI about brief */}
              {brief.trim() && onOpenChat && (
                <button type="button" onClick={onOpenChat} className="lex-btn-chat" disabled={loading}>
                  💬 Ask AI
                </button>
              )}

              {showLoginPrompt && !isLoggedIn && (
                <span className="text-red-600 text-sm">Please log in to use this feature</span>
              )}
            </div>

            {/* Document Scanner Panel */}
            {showDocScanner && (
              <div className="mt-2">
                <DocumentScanner
                  onTextExtracted={handleDocumentText}
                  onScanResult={handleDocScanResult}
                  isLoggedIn={isLoggedIn}
                  disabled={loading}
                />
              </div>
            )}

            {/* Last scan metadata */}
            {lastScanResult && lastScanResult.classification && (
              <div className="text-xs text-gray-400 flex items-center gap-3 flex-wrap">
                <span>📄 Last scan: {lastScanResult.classification.document_type?.replace(/_/g, ' ')}</span>
                {lastScanResult.metadata?.word_count && (
                  <span>{lastScanResult.metadata.word_count} words extracted</span>
                )}
                {lastScanResult.metadata?.ocr_used && (
                  <span className="text-blue-600">OCR applied</span>
                )}
              </div>
            )}

            {/* Speech metadata summary */}
            {lastSpeechMeta && lastSpeechMeta.metadata?.status === 'success' && (
              <div className="text-xs text-gray-400 flex items-center gap-3">
                <span>🎙️ Last dictation: {lastSpeechMeta.metadata.word_count} words</span>
                {lastSpeechMeta.metadata.correction_applied && (
                  <span className="text-green-600">✓ {lastSpeechMeta.metadata.corrections_count} legal corrections applied</span>
                )}
                <span>{lastSpeechMeta.metadata.duration_ms}ms</span>
              </div>
            )}

            <button
              type="submit"
              className={`lex-btn-primary w-full ${analysisMode === 'ai' ? 'lex-btn-ai' : ''}`}
              disabled={loading || !brief.trim()}
            >
              {analysisMode === 'ai' ? (
                <>🧠 AI Analyze</>
              ) : (
                <>📊 Analyze Brief</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Structured analysis results */}
      {transformedResult && (
        <>
          {/* Case Diary link — auto-saved case */}
          {aiResult?.case_id && (
            <div className="lex-card mb-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📁</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.9rem' }}>Case saved to your Case Diary</div>
                  <div style={{ fontSize: '0.78rem', color: '#4ade80' }}>Your analysis, briefs, and timeline are saved automatically</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/cases')}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                📁 View Case Diary
              </button>
            </div>
          )}

          {/* Quick summary cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-6">
            <div className="lex-stat-card">
              <div className="lex-stat-label">Case Type</div>
              <div className="lex-stat-value">
                {(aiResult?.ai_analysis?.case_type?.primary) || transformedResult.caseType?.primary || 'General'}
              </div>
              {(aiResult?.ai_analysis?.case_type?.confidence || transformedResult.caseType?.confidence) && (
                <div className="lex-stat-sub">
                  {aiResult?.ai_analysis?.case_type?.confidence || (transformedResult.caseType?.confidence
                    ? Math.round(transformedResult.caseType.confidence * 100) + '%'
                    : '')} confidence
                </div>
              )}
            </div>
            <div className="lex-stat-card">
              <div className="lex-stat-label">Jurisdiction</div>
              <div className="lex-stat-value">
                {aiResult?.ai_analysis?.jurisdiction?.recommended_court || transformedResult.jurisdiction?.suggested || 'TBD'}
              </div>
            </div>
            <div className="lex-stat-card">
              <div className="lex-stat-label">Legal Issues</div>
              <div className="lex-stat-value">
                {aiResult?.ai_analysis?.legal_issues?.length || transformedResult.legalIssues?.length || 0} identified
              </div>
            </div>
          </div>

          {/* Deep Dive Option */}
          {aiResult && aiResult.brief_id && (
            <div className="mb-4">
              {deepDiveStatus === 'idle' && (
                <button
                  onClick={startDeepDive}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl hover:from-indigo-100 hover:to-blue-100 hover:border-indigo-300 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔬</span>
                    <div className="text-left">
                      <div className="font-semibold text-[#0a2e5c] text-sm">Deep Dive Analysis</div>
                      <div className="text-xs text-gray-500">Multi-pass analysis with citation verification &bull; Runs in background</div>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
              {deepDiveStatus === 'running' && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <svg className="animate-spin h-5 w-5 text-amber-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <div>
                    <div className="font-medium text-amber-800 text-sm">Deep analysis running in background...</div>
                    <div className="text-xs text-amber-600">This takes 30–90 seconds. You can continue working — results update automatically.</div>
                  </div>
                </div>
              )}
              {deepDiveStatus === 'complete' && (
                <div className="flex items-center gap-3 px-5 py-3.5 bg-green-50 border border-green-200 rounded-xl">
                  <span className="text-green-600 text-xl flex-shrink-0">✓</span>
                  <div>
                    <div className="font-medium text-green-800 text-sm">Deep analysis complete</div>
                    <div className="text-xs text-green-600">Results updated with thorough analysis &amp; verified citations below.</div>
                  </div>
                </div>
              )}
              {deepDiveStatus === 'error' && (
                <div className="flex items-center justify-between px-5 py-3.5 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-red-500 text-xl flex-shrink-0">⚠</span>
                    <div>
                      <div className="font-medium text-red-800 text-sm">Deep analysis encountered an error</div>
                      <div className="text-xs text-red-600">The preliminary results below are still valid.</div>
                    </div>
                  </div>
                  <button onClick={() => setDeepDiveStatus('idle')} className="text-xs text-red-600 hover:text-red-800 underline ml-3 flex-shrink-0">Retry</button>
                </div>
              )}
            </div>
          )}

          {/* Main tabbed results */}
          <ResponseTabs
            lawSections={transformedResult.lawSections}
            caseHistories={transformedResult.caseHistories}
            analysis={transformedResult.analysis}
            aiAnalysis={aiResult}
          />

          {/* Only show these extra sections for non-AI results */}
          {!aiResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {transformedResult.evidenceChecklist?.length > 0 && (
                <div className="lex-card">
                  <h3 className="text-lg font-semibold text-[#0a2e5c] mb-3">📋 Evidence Checklist</h3>
                  <ul className="space-y-2">
                    {transformedResult.evidenceChecklist.map((item: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <input type="checkbox" className="mt-0.5 accent-[#0a2e5c]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {transformedResult.nextSteps?.length > 0 && (
                <div className="lex-card">
                  <h3 className="text-lg font-semibold text-[#0a2e5c] mb-3">🚀 Next Steps</h3>
                  <ol className="space-y-2">
                    {transformedResult.nextSteps.map((step: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700 pl-2">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Entities extracted */}
          {transformedResult.entities && (
            <div className="lex-card mt-6">
              <h3 className="text-lg font-semibold text-[#0a2e5c] mb-3">🔍 Extracted Entities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                {transformedResult.entities.parties?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-600 mb-1">Parties</div>
                    {transformedResult.entities.parties.map((p: any, i: number) => (
                      <div key={i} className="text-gray-700">{p.petitioner} vs {p.respondent}</div>
                    ))}
                  </div>
                )}
                {transformedResult.entities.sections?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-600 mb-1">Sections</div>
                    <div className="flex flex-wrap gap-1">
                      {transformedResult.entities.sections.map((s: string, i: number) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">S. {s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {transformedResult.entities.courts?.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-600 mb-1">Courts</div>
                    {transformedResult.entities.courts.map((c: string, i: number) => (
                      <div key={i} className="text-gray-700">{c}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BriefInput;
