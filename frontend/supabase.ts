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
    detectSessionInUrl: true
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
    return error ? handleSupabaseError(error) : { data };
  }
};

export default {
  auth: authService,
  client: supabase
};