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
  signUp: async (email: string, password: string, metadata: { full_name: string }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      return error ? handleSupabaseError(error) : { data };
    } catch (error) {
      return handleSupabaseError(error);
    }
  },
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

// Database Service
export const dbService = {
  // Briefs operations
  briefs: {
    create: async (userId: string, briefData: { title: string; content: string }) => {
      const { data, error } = await supabase
        .from('briefs')
        .insert({ user_id: userId, ...briefData })
        .select();
      return error ? handleSupabaseError(error) : { data };
    },
    getById: async (briefId: string) => {
      const { data, error } = await supabase
        .from('briefs')
        .select('*')
        .eq('id', briefId)
        .single();
      return error ? handleSupabaseError(error) : { data };
    }
  },

  // Analysis operations
  analysis: {
    saveResults: async (userId: string, briefId: string, results: AnalysisResult) => {
      const { data, error } = await supabase
        .from('analysis_results')
        .insert({ user_id: userId, brief_id: briefId, ...results })
        .select();
      return error ? handleSupabaseError(error) : { data };
    }
  }
};

// Storage Service
export const storageService = {
  uploadFile: async (userId: string, path: string, file: File) => {
    const { data, error } = await supabase.storage
      .from('user_files')
      .upload(`${userId}/${path}`, file);
    return error ? handleSupabaseError(error) : { data };
  },
  getPublicUrl: (userId: string, path: string) => {
    const { data } = supabase.storage
      .from('user_files')
      .getPublicUrl(`${userId}/${path}`);
    return data.publicUrl;
  }
};

export default {
  auth: authService,
  db: dbService,
  storage: storageService,
  client: supabase
};