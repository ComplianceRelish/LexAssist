// Centralized API helper for frontend/backend integration
const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export async function analyzeBrief(text: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000); // 120s timeout
  try {
    const response = await fetch(`${BASE_URL}/api/analyze-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch profile');
  return data.profile;
}

export async function logout() {
  const response = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
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
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch history');
  return data.history;
}
