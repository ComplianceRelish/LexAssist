// Centralized API helper for frontend/backend integration
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// ── Token management ──────────────────────────────────────────────
// Stores the Supabase JWT in localStorage so it can be sent as a
// Bearer token on every request (avoids cross-site cookie issues).

const TOKEN_KEY = 'lex_access_token';
const REFRESH_KEY = 'lex_refresh_token';

export function setAuthTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Build headers with Authorization Bearer token */
function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function analyzeBrief(text: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000); // 120s timeout
  try {
    const response = await fetch(`${BASE_URL}/api/analyze-brief`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text }),
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze brief');
    }
    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Analysis timed out — please try with a shorter brief or try again later.');
    }
    throw err;
  }
}

// ── AI-Powered Analysis (Claude) ──────────────────────────────────

export async function aiAnalyzeBrief(text: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3min timeout for AI
  try {
    const response = await fetch(`${BASE_URL}/api/ai/analyze`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text }),
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'AI analysis failed');
    }
    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('AI analysis timed out — please try again.');
    }
    throw err;
  }
}

// ── AI Chat (Streaming SSE) ──────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function aiChatStream(
  messages: ChatMessage[],
  briefContext: string | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<() => void> {
  const controller = new AbortController();

  fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      messages,
      brief_context: briefContext,
    }),
    credentials: 'include',
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Chat failed' }));
        onError(err.error || 'Chat failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('Streaming not supported');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                onChunk(data.text);
              } else if (data.type === 'done') {
                onDone();
              } else if (data.type === 'error') {
                onError(data.text);
              }
            } catch {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Chat connection failed');
      }
    });

  return () => controller.abort();
}

// ── AI Document Drafting (Streaming SSE) ──────────────────────────

export async function aiDraftStream(
  docType: string,
  details: Record<string, string>,
  briefContext: string | null,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<() => void> {
  const controller = new AbortController();

  fetch(`${BASE_URL}/api/ai/draft`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      doc_type: docType,
      details,
      brief_context: briefContext,
    }),
    credentials: 'include',
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Draft failed' }));
        onError(err.error || 'Draft failed');
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('Streaming not supported');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') onChunk(data.text);
              else if (data.type === 'done') onDone();
              else if (data.type === 'error') onError(data.text);
            } catch { /* skip */ }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Draft connection failed');
      }
    });

  return () => controller.abort();
}

// ── Existing endpoints ────────────────────────────────────────────

export async function healthCheck() {
  const response = await fetch(`${BASE_URL}/api/health`);
  return response.json();
}

export async function sendOtp({ email, phone }: { email?: string; phone?: string }) {
  const response = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, phone }),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
  return data;
}

export async function verifyOtp({ email, phone, token, type }: { email?: string; phone?: string; token: string; type: 'email' | 'sms' }) {
  const response = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, phone, token, type }),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to verify OTP');
  return data;
}

export async function updateUserProfile(profile: {
  fullName?: string;
  address?: string;
  age?: string;
  email?: string;
  phone?: string;
}) {
  const response = await fetch(`${BASE_URL}/api/user/profile`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(profile),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update profile');
  return data;
}

export async function fetchUserProfile() {
  const response = await fetch(`${BASE_URL}/api/user/profile`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch profile');
  return data.profile;
}

export async function logout() {
  clearAuthTokens();
  const response = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to logout');
  }
  return response.json();
}

// --- Usage stats (real data from activity_log) ---

export async function fetchUserStats() {
  const response = await fetch(`${BASE_URL}/api/user/stats`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch stats');
  return data;
}

// --- Activity history (real data from activity_log) ---

export async function fetchUserHistory(params?: { limit?: number; offset?: number; action?: string }) {
  const q = new URLSearchParams();
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.offset) q.set('offset', String(params.offset));
  if (params?.action) q.set('action', params.action);

  const response = await fetch(`${BASE_URL}/api/user/history?${q.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch history');
  return data.history;
}

// --- Full case detail (brief + analysis) by activity_log ID ---

export async function fetchCaseDetail(activityId: string) {
  const response = await fetch(`${BASE_URL}/api/user/case/${activityId}`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch case detail');
  return data;
}

// ── Case Diary API ────────────────────────────────────────────────

export async function fetchCases(status?: string) {
  const q = new URLSearchParams();
  if (status) q.set('status', status);
  const response = await fetch(`${BASE_URL}/api/cases?${q.toString()}`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch cases');
  return data.cases;
}

export async function fetchCaseDiary(caseId: string) {
  const response = await fetch(`${BASE_URL}/api/cases/${caseId}`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch case diary');
  return data;
}

export async function createCase(title: string, notes?: string) {
  const response = await fetch(`${BASE_URL}/api/cases`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ title, notes: notes || '' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create case');
  return data.case;
}

export async function updateCase(caseId: string, updates: { title?: string; notes?: string; status?: string }) {
  const response = await fetch(`${BASE_URL}/api/cases/${caseId}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update case');
  return data.case;
}

export async function addCaseEntry(caseId: string, text: string, analyze: boolean = false) {
  const response = await fetch(`${BASE_URL}/api/cases/${caseId}/entry`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ text, analyze }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to add entry');
  return data;
}

// ── Speech-to-Text API ────────────────────────────────────────────

export interface SpeechTranscriptionResult {
  raw_transcript: string;
  corrected_transcript: string;
  corrections: Array<{
    original: string;
    corrected: string;
    confidence: number;
    reason: string;
  }>;
  low_confidence_words: Array<{
    word: string;
    position: number;
    suggestions: string[];
    confidence: number;
  }>;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    avg_logprob: number;
    no_speech_prob: number;
  }>;
  words: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  segment_confidences: Array<{
    text: string;
    start: number;
    end: number;
    confidence: number;
    level: 'high' | 'medium' | 'low';
  }>;
  metadata: {
    duration_ms: number;
    whisper_ms: number;
    model: string;
    correction_model: string | null;
    language: string;
    correction_applied: boolean;
    corrections_count: number;
    low_confidence_count: number;
    word_count: number;
    user_role: string | null;
    mode: string;
    status: string;
  };
  error?: string;
  status?: string;
}

export interface SpeechServiceStatus {
  whisper_stt: string;
  correction_layer: string;
  whisper_model: string;
  correction_model: string | null;
  supported_formats: string[];
  max_file_size_mb: number;
}

/**
 * Transcribe audio via Whisper + legal vocabulary boosting + Claude correction.
 * Sends audio as multipart form data.
 */
export async function transcribeSpeech(
  audioBlob: Blob,
  options?: {
    language?: string;
    role?: string;
    mode?: 'dictation' | 'conversational';
    filename?: string;
  }
): Promise<SpeechTranscriptionResult> {
  const formData = new FormData();
  const filename = options?.filename || 'recording.wav';
  formData.append('audio', audioBlob, filename);
  if (options?.language) formData.append('language', options.language);
  if (options?.role) formData.append('role', options.role);
  if (options?.mode) formData.append('mode', options.mode);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}/api/speech/transcribe`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Transcription failed');
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Transcription timed out — please try with a shorter recording.');
    }
    throw err;
  }
}

/**
 * Get speech service health & capabilities.
 */
export async function getSpeechStatus(): Promise<SpeechServiceStatus> {
  const response = await fetch(`${BASE_URL}/api/speech/status`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to get speech status');
  return data;
}

/**
 * Run LLM correction on existing text (no audio).
 */
export async function correctTranscript(
  text: string,
  role?: string,
): Promise<{ original: string; corrected_text: string; corrections: any[]; low_confidence_words: any[] }> {
  const response = await fetch(`${BASE_URL}/api/speech/correct`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ text, role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Correction failed');
  return data;
}

// ── Document Scanner & OCR API ────────────────────────────────────

export interface DocumentScanResult {
  text: string;
  classification: {
    document_type: string;
    document_title: string;
    parties: {
      petitioner: string | null;
      respondent: string | null;
      judge: string | null;
    };
    court: string | null;
    case_number: string | null;
    date: string | null;
    key_sections: string[];
    summary: string;
    language: string;
    confidence: number;
  };
  pages: number;
  metadata: {
    filename: string;
    file_size_bytes: number;
    file_type: string;
    ocr_used: boolean;
    processing_ms: number;
    word_count: number;
    char_count: number;
    status: string;
  };
  error?: string;
  status?: string;
}

export interface DocumentServiceStatus {
  ocr_engine: string;
  image_enhancement: string;
  pdf_processing: string;
  supported_formats: string[];
  max_file_size_mb: number;
  max_ocr_pages: number;
}

/**
 * Upload and process a document (OCR + classification + text extraction).
 * Accepts PDF, images, DOCX.
 */
export async function scanDocument(
  file: File,
  caseId?: string,
): Promise<DocumentScanResult> {
  const formData = new FormData();
  formData.append('file', file);
  if (caseId) formData.append('case_id', caseId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000); // 3min for large docs

  try {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${BASE_URL}/api/documents/scan`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Document processing failed');
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Document processing timed out — please try with a smaller file.');
    }
    throw err;
  }
}

/**
 * Get document service health & capabilities.
 */
export async function getDocumentStatus(): Promise<DocumentServiceStatus> {
  const response = await fetch(`${BASE_URL}/api/documents/status`, {
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to get document status');
  return data;
}

/**
 * Classify already-extracted text.
 */
export async function classifyDocument(text: string): Promise<DocumentScanResult['classification']> {
  const response = await fetch(`${BASE_URL}/api/documents/classify`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ text }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Classification failed');
  return data;
}

// ── Auth: Name + Phone Login ──────────────────────────────────────

export async function loginWithNamePhone(name: string, phone: string) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone }),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Login failed');
  // Store tokens in localStorage for Bearer auth
  if (data.access_token) {
    setAuthTokens(data.access_token, data.refresh_token || '');
  }
  return data;
}

// ── Admin: Current user info ──────────────────────────────────────

export async function fetchAdminMe() {
  const response = await fetch(`${BASE_URL}/api/admin/me`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch admin info');
  return data;
}

// ── Admin: User Management CRUD ──────────────────────────────────

export async function adminListUsers() {
  const response = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'GET',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to list users');
  return data.users;
}

export async function adminCreateUser(user: {
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
}) {
  const response = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(user),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create user');
  return data;
}

export async function adminUpdateUser(userId: string, updates: {
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
}) {
  const response = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update user');
  return data;
}

export async function adminDeleteUser(userId: string) {
  const response = await fetch(`${BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete user');
  return data;
}
