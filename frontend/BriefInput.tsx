import React, { useState, useRef, useEffect, useCallback } from 'react';
import { analyzeBrief } from './utils/api';
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
}

const BriefInput: React.FC<BriefInputProps> = ({ isLoggedIn }) => {
  const [brief, setBrief] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

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
    if (!isLoggedIn) { setShowLoginPrompt(true); return; }
    if (!brief.trim()) { setError('Please enter or dictate your case brief'); return; }

    setLoading(true);
    try {
      const res = await analyzeBrief(brief);
      setResult(res);
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
    recognition.lang = 'en-IN'; // Indian English
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
      // Auto-restart if still recording (browser sometimes stops after silence)
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
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleClear = () => {
    setBrief('');
    setResult(null);
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
    analysis: {
      summary: result.analysis?.summary || result.brief_summary || '',
      arguments: result.analysis?.arguments || [],
      challenges: result.analysis?.challenges || [],
      recommendations: result.analysis?.recommendations || [],
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
      <div className="lex-card mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="brief" className="block text-lg font-medium text-gray-700 mb-2">
              Enter Your Case Brief
            </label>
            <textarea
              id="brief"
              rows={8}
              className="lex-input"
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
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg mb-4 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <div className="font-semibold">Analyzing your brief...</div>
                <div className="text-xs mt-1">Extracting entities, searching precedents, mapping statutes</div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={loading || (!speechSupported && !isRecording)}
                title={speechSupported ? (isRecording ? 'Stop recording' : 'Start voice dictation') : 'Speech not supported in this browser'}
                className={`flex items-center px-4 py-2 rounded-md transition-all ${
                  isRecording
                    ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                    : speechSupported
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isRecording ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    Stop ({formatTime(recordingTime)})
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                    🎙 Voice Input
                  </>
                )}
              </button>

              {brief.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  disabled={loading}
                >
                  Clear
                </button>
              )}

              {showLoginPrompt && !isLoggedIn && (
                <span className="text-red-600 text-sm">Please log in to use this feature</span>
              )}
            </div>

            <button
              type="submit"
              className="lex-button-primary w-full sm:w-auto flex items-center justify-center"
              disabled={loading || !brief.trim()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
              </svg>
              Analyze Brief
            </button>
          </div>
        </form>
      </div>

      {/* Structured analysis results */}
      {transformedResult && (
        <>
          {/* Quick summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="lex-card text-center">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Case Type</div>
              <div className="text-lg font-bold text-[#0a2e5c] mt-1">
                {transformedResult.caseType?.primary || 'General'}
              </div>
              {transformedResult.caseType?.confidence && (
                <div className="text-xs text-gray-400 mt-1">
                  {Math.round(transformedResult.caseType.confidence * 100)}% confidence
                </div>
              )}
            </div>
            <div className="lex-card text-center">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Jurisdiction</div>
              <div className="text-lg font-bold text-[#0a2e5c] mt-1">
                {transformedResult.jurisdiction?.suggested || 'TBD'}
              </div>
            </div>
            <div className="lex-card text-center">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Legal Issues</div>
              <div className="text-lg font-bold text-[#0a2e5c] mt-1">
                {transformedResult.legalIssues?.length || 0} identified
              </div>
            </div>
          </div>

          {/* Main tabbed results */}
          <ResponseTabs
            lawSections={transformedResult.lawSections}
            caseHistories={transformedResult.caseHistories}
            analysis={transformedResult.analysis}
          />

          {/* Evidence checklist & Next steps */}
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
