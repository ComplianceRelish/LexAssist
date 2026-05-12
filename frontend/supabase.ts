import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Type definitions
interface LawSection {
  id: string;
  title: string;
  content: string;
  reference: string;
  relevance_score?: number;
}

interface CaseHistory {
  id: string;
  case_name: string;
  citation: string;
  court: string;
  year: number;
  summary: string;
  relevance_score?: number;
}

interface AnalysisResult {
  law_sections: LawSection[];
  case_histories: CaseHistory[];
  analysis: {
    summary: string;
    key_points: string[];
    recommendations: string[];
    risk_assessment?: {
      level: 'low' | 'medium' | 'high';
      details: string;
    };
  };
}

// Initialize Supabase with proper typing
const env = import.meta.env;
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`
    Supabase credentials are missing. 
    Received:
    - VITE_SUPABASE_URL: ${supabaseUrl ? 'set' : 'missing'}
    - VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'set' : 'missing'}
  `);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

const TOKEN_KEY = 'lex_access_token';
const REFRESH_KEY = 'lex_refresh_token';

const syncLocalApiTokens = (session: any | null) => {
  try {
    if (session?.access_token) {
      localStorage.setItem(TOKEN_KEY, session.access_token);
      localStorage.setItem(REFRESH_KEY, session.refresh_token || '');
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // Ignore storage write failures (private mode, quota exceeded, etc.)
  }
};

const isRefreshTokenReuseError = (error: any): boolean => {
  const msg = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return code === 'refresh_token_already_used' ||
    msg.includes('refresh_token_already_used') ||
    (msg.includes('invalid refresh token') && msg.includes('already used'));
};

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    syncLocalApiTokens(null);
    return;
  }
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
    syncLocalApiTokens(session);
  }
});

// Error handling wrapper
const handleSupabaseError = (error: any) => {
  console.error('Supabase Error:', error);
  return { error: error instanceof Error ? error : new Error(String(error)) };
};

// Authentication Service
export const authService = {
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? handleSupabaseError(error) : { data };
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error && isRefreshTokenReuseError(error)) {
      // Local recovery path for rotated/reused refresh tokens.
      await supabase.auth.signOut({ scope: 'local' });
      syncLocalApiTokens(null);
      return { data: { session: null } as any };
    }
    if (!error) {
      syncLocalApiTokens(data?.session || null);
    }
    return error ? handleSupabaseError(error) : { data };
  }
};

export default {
  auth: authService,
  client: supabase
};