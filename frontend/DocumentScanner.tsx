import React, { useState, useRef, useCallback, useEffect } from 'react';
import { scanDocument, DocumentScanResult } from './utils/api';
import './DocumentScanner.css';

// ── Types ─────────────────────────────────────────────────────────

interface DocumentScannerProps {
  /** Called when document text is extracted and ready */
  onTextExtracted: (text: string) => void;
  /** Called with full scan result for parent state */
  onScanResult?: (result: DocumentScanResult) => void;
  /** Whether user is logged in */
  isLoggedIn: boolean;
  /** Disable controls */
  disabled?: boolean;
  /** Optional case ID to link document to */
  caseId?: string;
}

type ScanState = 'idle' | 'capturing' | 'processing' | 'preview';

// Device detection
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const ACCEPTED_FORMATS = '.pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp,.bmp,.doc,.docx';
const MAX_FILE_SIZE_MB = 20;

// ── Supported Indian Vernacular Languages ─────────────────────────
const LANGUAGE_OPTIONS = [
  { code: 'auto',  label: 'Auto-detect' },
  { code: 'en',    label: 'English' },
  { code: 'hi',    label: 'Hindi / हिंदी' },
  { code: 'ta',    label: 'Tamil / தமிழ்' },
  { code: 'te',    label: 'Telugu / తెలుగు' },
  { code: 'kn',    label: 'Kannada / ಕನ್ನಡ' },
  { code: 'ml',    label: 'Malayalam / മലയാളം' },
  { code: 'bn',    label: 'Bengali / বাংলা' },
  { code: 'mr',    label: 'Marathi / मराठी' },
  { code: 'gu',    label: 'Gujarati / ગુજરાતી' },
  { code: 'pa',    label: 'Punjabi / ਪੰਜਾਬੀ' },
  { code: 'or',    label: 'Odia / ଓଡ଼ିଆ' },
  { code: 'ur',    label: 'Urdu / اردو' },
  { code: 'mixed', label: 'Mixed / Multiple' },
] as const;

type LanguageCode = typeof LANGUAGE_OPTIONS[number]['code'];

// ── Component ─────────────────────────────────────────────────────

const DocumentScanner: React.FC<DocumentScannerProps> = ({
  onTextExtracted,
  onScanResult,
  isLoggedIn,
  disabled = false,
  caseId,
}) => {
  const [state, setState] = useState<ScanState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentScanResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);        // Data URL for image preview
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [languageHint, setLanguageHint] = useState<LanguageCode>('auto');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Check camera availability
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        setHasCamera(devices.some(d => d.kind === 'videoinput'));
      }).catch(() => setHasCamera(false));
    }
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── File Selection ──────────────────────────────────────────────

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Validate
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setError(`File too large (${sizeMB.toFixed(1)} MB). Maximum: ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setError(null);
    setResult(null);
    setPreviewFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setPreview(null); // PDF preview handled separately
    } else {
      setPreview(null);
    }

    // Auto-process
    await processFile(file);
  }, []);

  // ── File Processing ─────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!isLoggedIn) {
      setError('Please log in to scan documents.');
      return;
    }

    setState('processing');
    setError(null);

    try {
      const scanResult = await scanDocument(file, caseId, languageHint === 'auto' ? undefined : languageHint);

      if (scanResult.error) {
        setError(scanResult.error);
        setState('idle');
        return;
      }

      setResult(scanResult);
      setExtractedText(scanResult.text);
      onScanResult?.(scanResult);
      setState('preview');

    } catch (err: any) {
      setError(err.message || 'Document processing failed. Please try again.');
      setState('idle');
    }
  }, [isLoggedIn, caseId, onScanResult, languageHint]);

  // ── Camera Capture (Mobile) ─────────────────────────────────────

  const startCamera = useCallback(async () => {
    if (!isLoggedIn) {
      setError('Please log in to use camera scanning.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },  // Rear camera
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
      });

      streamRef.current = stream;
      setShowCamera(true);
      setState('capturing');

      // Wait for video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera access in browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please use file upload instead.');
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  }, [isLoggedIn]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Capture at full resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError('Failed to capture image.');
        return;
      }

      // Stop camera
      stopCamera();

      // Create File from blob
      const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Preview
      setPreview(canvas.toDataURL('image/jpeg', 0.92));
      setPreviewFile(file);

      // Process
      await processFile(file);
    }, 'image/jpeg', 0.92);
  }, [processFile]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    if (state === 'capturing') setState('idle');
  }, [state]);

  // ── Mobile Camera Input (native file picker with capture) ──────

  const handleMobileCameraCapture = useCallback(() => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }, []);

  // ── Drag & Drop ─────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // ── Actions ─────────────────────────────────────────────────────

  const handleUseText = useCallback(() => {
    onTextExtracted(extractedText);
    setState('idle');
  }, [extractedText, onTextExtracted]);

  const handleReset = useCallback(() => {
    setState('idle');
    setResult(null);
    setPreview(null);
    setPreviewFile(null);
    setExtractedText('');
    setError(null);
  }, []);

  // ── Format helpers ──────────────────────────────────────────────

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      petition: '📜', affidavit: '📋', contract: '📄', court_order: '⚖️',
      legal_notice: '📬', judgment: '🔨', plaint: '📝', charge_sheet: '🔍',
      bail_application: '🏛️', vakalatnama: '🤝', fir: '🚨', other: '📎',
    };
    return icons[type] || '📎';
  };

  const getDocTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="doc-scanner">
      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />
      {/* Native mobile camera capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera Viewfinder (live camera mode) */}
      {showCamera && (
        <div className="doc-camera-overlay">
          <div className="doc-camera-viewport">
            <video ref={videoRef} autoPlay playsInline muted className="doc-camera-video" />
            <div className="doc-camera-guide">
              <div className="doc-camera-corner tl" />
              <div className="doc-camera-corner tr" />
              <div className="doc-camera-corner bl" />
              <div className="doc-camera-corner br" />
              <p className="doc-camera-hint">Align document within the frame</p>
            </div>
          </div>
          <div className="doc-camera-controls">
            <button type="button" onClick={stopCamera} className="doc-camera-cancel">
              ✕ Cancel
            </button>
            <button type="button" onClick={capturePhoto} className="doc-camera-shutter">
              <span className="doc-shutter-ring" />
            </button>
            <div style={{ width: 64 }} /> {/* Spacer for centering */}
          </div>
        </div>
      )}

      {/* Main idle state — Input Options */}
      {state === 'idle' && !showCamera && (
        <div
          ref={dropZoneRef}
          className={`doc-drop-zone ${isDragOver ? 'doc-drop-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="doc-drop-content">
            <div className="doc-drop-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="12" y2="12" />
                <line x1="15" y1="15" x2="12" y2="12" />
              </svg>
            </div>

            <p className="doc-drop-title">Scan or Upload Document</p>
            <p className="doc-drop-hint">
              Drag &amp; drop a file here, or use the buttons below
            </p>
            <p className="doc-drop-formats">
              PDF, JPG, PNG, TIFF, DOCX — up to {MAX_FILE_SIZE_MB} MB
            </p>

            {/* Language Selector */}
            <div className="doc-lang-selector">
              <label className="doc-lang-label" htmlFor="doc-lang-select">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Document language
              </label>
              <select
                id="doc-lang-select"
                className="doc-lang-select"
                value={languageHint}
                onChange={(e) => setLanguageHint(e.target.value as LanguageCode)}
                disabled={disabled || !isLoggedIn}
              >
                {LANGUAGE_OPTIONS.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            <div className="doc-input-buttons">
              {/* Upload Button (always available) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || !isLoggedIn}
                className="doc-btn doc-btn-upload"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload File
              </button>

              {/* Camera Button (mobile: native capture, desktop: live viewfinder if camera exists) */}
              {(isMobile || hasCamera) && (
                <button
                  type="button"
                  onClick={isMobile ? handleMobileCameraCapture : startCamera}
                  disabled={disabled || !isLoggedIn}
                  className="doc-btn doc-btn-camera"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  {isMobile ? 'Camera Scan' : 'Camera'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {state === 'processing' && (
        <div className="doc-processing">
          {preview && (
            <div className="doc-processing-preview">
              <img src={preview} alt="Document preview" className="doc-thumb" />
            </div>
          )}
          <div className="doc-processing-info">
            <div className="doc-processing-spinner" />
            <p className="doc-processing-title">Processing Document...</p>
            <p className="doc-processing-detail">
              {previewFile?.name && <span className="doc-filename">{previewFile.name}</span>}
              <br />
              {languageHint && languageHint !== 'auto' && languageHint !== 'en'
                ? `Running multilingual OCR (${LANGUAGE_OPTIONS.find(l => l.code === languageHint)?.label ?? languageHint}), classifying and extracting legal text`
                : 'Running OCR, classifying document type, and extracting legal text'
              }
            </p>
          </div>
        </div>
      )}

      {/* Results / Preview State */}
      {state === 'preview' && result && (
        <div className="doc-results">
          {/* Header */}
          <div className="doc-results-header">
            <div className="doc-results-title-row">
              <span className="doc-type-icon">{getDocTypeIcon(result.classification?.document_type)}</span>
              <div>
                <h4 className="doc-results-title">
                  {result.classification?.document_title || 'Scanned Document'}
                </h4>
                <div className="doc-results-badges">
                  <span className="doc-badge doc-badge-type">
                    {getDocTypeLabel(result.classification?.document_type || 'other')}
                  </span>
                  {result.classification?.confidence && (
                    <span className={`doc-badge ${result.classification.confidence > 0.8 ? 'doc-badge-high' : result.classification.confidence > 0.5 ? 'doc-badge-medium' : 'doc-badge-low'}`}>
                      {Math.round(result.classification.confidence * 100)}% confidence
                    </span>
                  )}
                  {result.metadata?.ocr_used && (
                    <span className="doc-badge doc-badge-ocr">OCR</span>
                  )}
                  {/* Show vernacular badge when significant non-English content is detected */}
                  {result.classification?.vernacular_content_percent !== undefined &&
                   Number(result.classification.vernacular_content_percent) > 10 && (
                    <span className="doc-badge doc-badge-vernacular" title="Document contains vernacular (Indic) script content">
                      🌐 Vernacular {result.classification.vernacular_content_percent}%
                    </span>
                  )}
                  <span className="doc-badge doc-badge-info">
                    {result.pages} page{result.pages !== 1 ? 's' : ''} · {result.metadata?.word_count} words · {result.metadata?.processing_ms}ms
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Classification Details */}
          {result.classification && (
            <div className="doc-classification">
              <div className="doc-class-grid">
            {result.classification?.language && (
                  <div className="doc-class-item">
                    <span className="doc-class-label">Language</span>
                    <span className="doc-class-value">
                      {result.classification.language.toUpperCase()}
                      {result.classification.scripts_detected && result.classification.scripts_detected.length > 1 && (
                        <span className="doc-lang-scripts"> · {result.classification.scripts_detected.join(', ')}</span>
                      )}
                    </span>
                  </div>
                )}
                {result.classification.court && (
                  <div className="doc-class-item">
                    <span className="doc-class-label">Court</span>
                    <span className="doc-class-value">{result.classification.court}</span>
                  </div>
                )}
                {result.classification.case_number && (
                  <div className="doc-class-item">
                    <span className="doc-class-label">Case No.</span>
                    <span className="doc-class-value">{result.classification.case_number}</span>
                  </div>
                )}
                {result.classification.date && (
                  <div className="doc-class-item">
                    <span className="doc-class-label">Date</span>
                    <span className="doc-class-value">{result.classification.date}</span>
                  </div>
                )}
                {result.classification.parties?.petitioner && (
                  <div className="doc-class-item">
                    <span className="doc-class-label">Petitioner</span>
                    <span className="doc-class-value">{result.classification.parties.petitioner}</span>
                  </div>
                )}
                {result.classification.parties?.respondent && (
                  <div className="doc-class-item">
                    <span className="doc-class-label">Respondent</span>
                    <span className="doc-class-value">{result.classification.parties.respondent}</span>
                  </div>
                )}
                {result.classification.key_sections?.length > 0 && (
                  <div className="doc-class-item doc-class-wide">
                    <span className="doc-class-label">Key Sections</span>
                    <div className="doc-sections-chips">
                      {result.classification.key_sections.map((s, i) => (
                        <span key={i} className="doc-section-chip">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {result.classification.summary && (
                <p className="doc-summary">{result.classification.summary}</p>
              )}
            </div>
          )}

          {/* Extracted Text Preview */}
          <div className="doc-text-preview">
            <div className="doc-text-header">
              <h5>Extracted Text</h5>
              <span className="doc-text-count">{result.metadata?.char_count} chars</span>
            </div>
            <div className="doc-text-content">
              {extractedText.slice(0, 2000)}
              {extractedText.length > 2000 && (
                <span className="doc-text-truncated">
                  ... ({extractedText.length - 2000} more characters)
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="doc-actions">
            <button
              type="button"
              onClick={handleUseText}
              className="doc-btn doc-btn-primary"
            >
              ✓ Use Extracted Text
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="doc-btn doc-btn-ghost"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="doc-error">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError(null)} className="doc-error-dismiss">×</button>
        </div>
      )}
    </div>
  );
};

export default DocumentScanner;
