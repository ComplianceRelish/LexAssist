import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeBrief, aiAnalyzeBrief } from './utils/api';
import ResponseTabs from './ResponseTabs';

// Web Speech API types
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
  const [brief, setBrief] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('ai');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);

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
    if (!isLoggedIn) { setShowLoginPrompt(true); return; }
    if (!brief.trim()) { setError('Please enter or dictate your case brief'); return; }

    setLoading(true);
    try {
      if (analysisMode === 'ai') {
        // AI-enhanced analysis (Claude + regex + Indian Kanoon)
        const res = await aiAnalyzeBrief(brief);
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
      if (recognitionRef.current && isRecording) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isLoggedIn, isRecording]);

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
  const transformedResult = result && result.status === 'success' ? {
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
  } : null;
  
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
                <div>
                  <div className="font-semibold">
                    {analysisMode === 'ai' ? 'AI is analyzing your brief...' : 'Analyzing your brief...'}
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    {analysisMode === 'ai'
                      ? 'Claude AI is performing deep legal analysis — extracting entities, identifying precedents, mapping statutes, assessing risk'
                      : 'Extracting entities, searching precedents, mapping statutes'}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Voice Input */}
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={loading || (!speechSupported && !isRecording)}
                title={speechSupported ? (isRecording ? 'Stop recording' : 'Start voice dictation') : 'Speech not supported'}
                className={`lex-btn-voice ${isRecording ? 'lex-btn-voice-active' : ''}`}
              >
                {isRecording ? (
                  <>⏹ Stop ({formatTime(recordingTime)})</>
                ) : (
                  <>🎙 Voice Input</>
                )}
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

            <button
              type="submit"
              className={`lex-btn-primary w-full sm:w-auto ${analysisMode === 'ai' ? 'lex-btn-ai' : ''}`}
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
          {/* Quick summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
