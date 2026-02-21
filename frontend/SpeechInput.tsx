import React, { useState, useRef, useCallback, useEffect } from 'react';
import { transcribeSpeech, SpeechTranscriptionResult } from './utils/api';
import './SpeechInput.css';

// ── Types ─────────────────────────────────────────────────────────

interface SpeechInputProps {
  /** Called when final text is ready (corrected transcript) */
  onTranscript: (text: string) => void;
  /** Called with transcription metadata for parent state */
  onMetadata?: (meta: SpeechTranscriptionResult) => void;
  /** Whether the user is authenticated */
  isLoggedIn: boolean;
  /** Disable the component */
  disabled?: boolean;
  /** Speaker role for context priming */
  userRole?: 'advocate' | 'judge_clerk' | 'paralegal' | 'student' | 'consumer' | 'litigant';
  /** Compact mode — smaller button */
  compact?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'reviewing';

interface CorrectionItem {
  original: string;
  corrected: string;
  confidence: number;
  reason: string;
}

interface LowConfidenceWord {
  word: string;
  position: number;
  suggestions: string[];
  confidence: number;
}

// ── Audio Preprocessing Constants ─────────────────────────────────

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,           // Mono — best for STT
  sampleRate: 16000,         // 16 kHz — optimal for Whisper
  echoCancellation: true,    // Remove echo
  noiseSuppression: true,    // Suppress background noise
  autoGainControl: true,     // Normalize volume
};

// ── Component ─────────────────────────────────────────────────────

const SpeechInput: React.FC<SpeechInputProps> = ({
  onTranscript,
  onMetadata,
  isLoggedIn,
  disabled = false,
  userRole,
  compact = false,
}) => {
  // State
  const [state, setState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SpeechTranscriptionResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [mode, setMode] = useState<'dictation' | 'conversational'>('dictation');
  const [selectedRole, setSelectedRole] = useState(userRole || '');
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording(true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Audio Level Monitoring ──────────────────────────────────────

  const startAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setAudioLevel(Math.min(100, (avg / 128) * 100));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      // Audio monitoring is non-critical; ignore errors
    }
  }, []);

  const stopAudioMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setAudioLevel(0);
  }, []);

  // ── Recording Controls ──────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!isLoggedIn) {
      setError('Please log in to use voice dictation.');
      return;
    }

    setError(null);
    setResult(null);
    setShowReview(false);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
      });
      streamRef.current = stream;

      // Start audio level monitoring
      startAudioMonitoring(stream);

      // Use WAV-compatible format for best Whisper accuracy
      // Prefer audio/webm;codecs=opus as it's widely supported and Whisper handles it well
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000, // Good quality for speech
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Audio is collected; processing happens in stopRecording
      };

      recorder.onerror = (e) => {
        setError('Recording error. Please try again.');
        setState('idle');
        cleanupStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // Collect chunks every second

      setState('recording');
      setRecordingTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
      setState('idle');
    }
  }, [isLoggedIn, startAudioMonitoring]);

  const cleanupStream = useCallback(() => {
    stopAudioMonitoring();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [stopAudioMonitoring]);

  const stopRecording = useCallback(async (cleanup = false) => {
    if (cleanup) {
      // Just cleanup without processing
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      cleanupStream();
      setState('idle');
      return;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    setState('processing');
    cleanupStream();

    // Stop recorder and wait for final data
    await new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    const audioBlob = new Blob(audioChunksRef.current, {
      type: mediaRecorderRef.current!.mimeType || 'audio/webm',
    });

    if (audioBlob.size === 0) {
      setError('No audio recorded. Please try again.');
      setState('idle');
      return;
    }

    // Determine file extension from MIME type
    const mimeToExt: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/webm;codecs=opus': 'webm',
      'audio/mp4': 'mp4',
      'audio/ogg': 'ogg',
    };
    const ext = mimeToExt[mediaRecorderRef.current!.mimeType] || 'webm';

    try {
      const transcriptionResult = await transcribeSpeech(audioBlob, {
        language: 'en',
        role: selectedRole || undefined,
        mode,
        filename: `recording.${ext}`,
      });

      if (transcriptionResult.error) {
        setError(transcriptionResult.error);
        setState('idle');
        return;
      }

      setResult(transcriptionResult);
      onMetadata?.(transcriptionResult);

      const finalText = transcriptionResult.corrected_transcript || transcriptionResult.raw_transcript;
      setEditedText(finalText);

      // If there are corrections or low-confidence words, show review panel
      const hasIssues =
        (transcriptionResult.corrections?.length > 0) ||
        (transcriptionResult.low_confidence_words?.length > 0);

      if (hasIssues) {
        setShowReview(true);
        setState('reviewing');
      } else {
        // No issues — send directly
        onTranscript(finalText);
        setState('idle');
      }

    } catch (err: any) {
      setError(err.message || 'Transcription failed. Please try again.');
      setState('idle');
    }
  }, [cleanupStream, mode, selectedRole, onTranscript, onMetadata]);

  const handleAcceptTranscript = useCallback(() => {
    onTranscript(editedText);
    setShowReview(false);
    setResult(null);
    setState('idle');
  }, [editedText, onTranscript]);

  const handleRejectTranscript = useCallback(() => {
    setShowReview(false);
    setResult(null);
    setState('idle');
  }, []);

  const handleApplySuggestion = useCallback((original: string, replacement: string) => {
    setEditedText(prev => prev.replace(original, replacement));
  }, []);

  // ── Format helpers ──────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.5) return 'confidence-medium';
    return 'confidence-low';
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className={`speech-input ${compact ? 'speech-input-compact' : ''}`}>
      {/* Main Controls */}
      <div className="speech-controls">
        {/* Record Button */}
        <button
          type="button"
          onClick={() => {
            if (state === 'recording') stopRecording();
            else if (state === 'idle') startRecording();
          }}
          disabled={disabled || state === 'processing' || !isLoggedIn}
          className={`speech-record-btn ${state === 'recording' ? 'speech-record-active' : ''} ${state === 'processing' ? 'speech-processing' : ''}`}
          title={
            !isLoggedIn ? 'Log in to use voice dictation' :
            state === 'recording' ? 'Stop recording & transcribe' :
            state === 'processing' ? 'Transcribing...' :
            'Start voice dictation (Whisper AI)'
          }
        >
          {state === 'recording' ? (
            <>
              <span className="speech-pulse"></span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span className="speech-timer">{formatTime(recordingTime)}</span>
            </>
          ) : state === 'processing' ? (
            <>
              <div className="speech-spinner"></div>
              <span>Transcribing...</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              {!compact && <span>Voice Input</span>}
            </>
          )}
        </button>

        {/* Audio Level Indicator (during recording) */}
        {state === 'recording' && (
          <div className="speech-level-container" title={`Audio level: ${Math.round(audioLevel)}%`}>
            <div className="speech-level-bar">
              <div
                className="speech-level-fill"
                style={{ width: `${audioLevel}%` }}
              />
            </div>
          </div>
        )}

        {/* Settings Toggle */}
        {!compact && (
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="speech-settings-btn"
            title="Speech settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="speech-settings-panel">
          <div className="speech-setting">
            <label className="speech-setting-label">Mode</label>
            <div className="speech-mode-toggle">
              <button
                type="button"
                className={`speech-mode-btn ${mode === 'dictation' ? 'active' : ''}`}
                onClick={() => setMode('dictation')}
              >
                📝 Dictation
              </button>
              <button
                type="button"
                className={`speech-mode-btn ${mode === 'conversational' ? 'active' : ''}`}
                onClick={() => setMode('conversational')}
              >
                💬 Quick Query
              </button>
            </div>
            <span className="speech-setting-hint">
              {mode === 'dictation'
                ? 'Best for longer input — full Whisper + correction pipeline'
                : 'Faster for short questions — optimised for speed'}
            </span>
          </div>

          <div className="speech-setting">
            <label className="speech-setting-label">Speaker Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="speech-role-select"
            >
              <option value="">Auto-detect</option>
              <option value="advocate">Advocate / Lawyer</option>
              <option value="judge_clerk">Judge's Clerk</option>
              <option value="paralegal">Paralegal</option>
              <option value="student">Law Student</option>
              <option value="consumer">Consumer Complainant</option>
              <option value="litigant">Self-represented Litigant</option>
            </select>
            <span className="speech-setting-hint">
              Helps the AI better recognise domain-specific vocabulary
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="speech-error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="speech-error-dismiss">×</button>
        </div>
      )}

      {/* Review Panel */}
      {showReview && result && (
        <div className="speech-review-panel">
          <div className="speech-review-header">
            <h4>📋 Review Transcript</h4>
            <div className="speech-review-meta">
              {result.metadata?.corrections_count > 0 && (
                <span className="speech-badge speech-badge-correction">
                  {result.metadata.corrections_count} correction{result.metadata.corrections_count > 1 ? 's' : ''}
                </span>
              )}
              {result.metadata?.low_confidence_count > 0 && (
                <span className="speech-badge speech-badge-warning">
                  {result.metadata.low_confidence_count} uncertain
                </span>
              )}
              <span className="speech-badge speech-badge-info">
                {result.metadata?.word_count} words · {result.metadata?.duration_ms}ms
              </span>
            </div>
          </div>

          {/* Editable transcript */}
          <textarea
            className="speech-review-textarea"
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={Math.min(8, Math.max(3, editedText.split('\n').length + 1))}
          />

          {/* Corrections list */}
          {result.corrections && result.corrections.length > 0 && (
            <div className="speech-corrections">
              <h5>✅ Auto-Corrections Applied</h5>
              <div className="speech-correction-list">
                {result.corrections.map((c: CorrectionItem, i: number) => (
                  <div key={i} className="speech-correction-item">
                    <span className="speech-correction-original">{c.original}</span>
                    <span className="speech-correction-arrow">→</span>
                    <span className="speech-correction-fixed">{c.corrected}</span>
                    <span className={`speech-correction-confidence ${getConfidenceColor(c.confidence)}`}>
                      {Math.round(c.confidence * 100)}%
                    </span>
                    {c.reason && <span className="speech-correction-reason">{c.reason}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low confidence words */}
          {result.low_confidence_words && result.low_confidence_words.length > 0 && (
            <div className="speech-low-confidence">
              <h5>⚠️ Uncertain Words — Please Review</h5>
              <div className="speech-suggestion-list">
                {result.low_confidence_words.map((w: LowConfidenceWord, i: number) => (
                  <div key={i} className="speech-suggestion-item">
                    <span className="speech-suggestion-word">{w.word}</span>
                    <span className={`speech-suggestion-confidence ${getConfidenceColor(w.confidence)}`}>
                      {Math.round(w.confidence * 100)}%
                    </span>
                    {w.suggestions && w.suggestions.length > 0 && (
                      <div className="speech-suggestion-options">
                        <span className="speech-suggestion-label">Did you mean:</span>
                        {w.suggestions.map((s, j) => (
                          <button
                            key={j}
                            type="button"
                            className="speech-suggestion-btn"
                            onClick={() => handleApplySuggestion(w.word, s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segment confidence visualization */}
          {result.segment_confidences && result.segment_confidences.length > 0 && (
            <div className="speech-confidence-bar-container">
              <h5>🎯 Segment Confidence</h5>
              <div className="speech-confidence-segments">
                {result.segment_confidences.map((seg, i) => (
                  <div
                    key={i}
                    className={`speech-confidence-segment ${seg.level}`}
                    title={`"${seg.text.trim()}" — ${Math.round(seg.confidence * 100)}% confidence`}
                    style={{ flex: Math.max(1, (seg.text || '').length) }}
                  />
                ))}
              </div>
              <div className="speech-confidence-legend">
                <span className="legend-item"><span className="legend-dot high" /> High</span>
                <span className="legend-item"><span className="legend-dot medium" /> Medium</span>
                <span className="legend-item"><span className="legend-dot low" /> Low</span>
              </div>
            </div>
          )}

          {/* Accept / Reject */}
          <div className="speech-review-actions">
            <button
              type="button"
              onClick={handleAcceptTranscript}
              className="speech-accept-btn"
            >
              ✓ Accept & Use
            </button>
            <button
              type="button"
              onClick={handleRejectTranscript}
              className="speech-reject-btn"
            >
              ✗ Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeechInput;
