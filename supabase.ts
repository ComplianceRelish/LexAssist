import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials are missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export const auth = {
  /**
   * Sign up a new user with email and password
   */
  signUp: async (email: string, password: string, metadata: { 
    full_name: string;
    mobile_number: string;
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      }
    });
    
    return { data, error };
  },

  /**
   * Sign in with email and password
   */
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    return { data, error };
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  /**
   * Get the current user session
   */
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { data, error };
  },

  /**
   * Get the current user
   */
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  /**
   * Send a magic link to the user's email
   */
  sendMagicLink: async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    return { data, error };
  },

  /**
   * Send OTP to mobile number
   */
  sendMobileOTP: async (phone: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
    });
    
    return { data, error };
  },

  /**
   * Verify mobile OTP
   */
  verifyMobileOTP: async (phone: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    
    return { data, error };
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    return { data, error };
  },

  /**
   * Update user password
   */
  updatePassword: async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    return { data, error };
  },

  /**
   * Update user profile
   */
  updateProfile: async (updates: {
    full_name?: string;
    mobile_number?: string;
    email?: string;
  }) => {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });
    
    return { data, error };
  },
};

// Database functions for briefs
export const briefs = {
  /**
   * Create a new brief
   */
  create: async (userId: string, briefData: {
    title: string;
    content: string;
    tags?: string[];
  }) => {
    const { data, error } = await supabase
      .from('briefs')
      .insert([
        {
          user_id: userId,
          title: briefData.title,
          content: briefData.content,
          tags: briefData.tags || [],
          created_at: new Date().toISOString(),
        }
      ])
      .select();
    
    return { data, error };
  },

  /**
   * Get all briefs for a user
   */
  getByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  /**
   * Get a specific brief by ID
   */
  getById: async (briefId: string) => {
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', briefId)
      .single();
    
    return { data, error };
  },

  /**
   * Update a brief
   */
  update: async (briefId: string, updates: {
    title?: string;
    content?: string;
    tags?: string[];
  }) => {
    const { data, error } = await supabase
      .from('briefs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', briefId)
      .select();
    
    return { data, error };
  },

  /**
   * Delete a brief
   */
  delete: async (briefId: string) => {
    const { error } = await supabase
      .from('briefs')
      .delete()
      .eq('id', briefId);
    
    return { error };
  },
};

// Database functions for analysis results
export const analysisResults = {
  /**
   * Save analysis results
   */
  save: async (userId: string, briefId: string, results: {
    law_sections: any[];
    case_histories: any[];
    analysis: any;
  }) => {
    const { data, error } = await supabase
      .from('analysis_results')
      .insert([
        {
          user_id: userId,
          brief_id: briefId,
          law_sections: results.law_sections,
          case_histories: results.case_histories,
          analysis: results.analysis,
          created_at: new Date().toISOString(),
        }
      ])
      .select();
    
    return { data, error };
  },

  /**
   * Get analysis results for a brief
   */
  getByBriefId: async (briefId: string) => {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('brief_id', briefId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return { data, error };
  },

  /**
   * Get all analysis results for a user
   */
  getByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('analysis_results')
      .select(`
        *,
        briefs:brief_id (
          title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  /**
   * Delete analysis results
   */
  delete: async (resultId: string) => {
    const { error } = await supabase
      .from('analysis_results')
      .delete()
      .eq('id', resultId);
    
    return { error };
  },
};

// Database functions for case files
export const caseFiles = {
  /**
   * Create a new case file
   */
  create: async (userId: string, briefId: string, analysisId: string, fileData: {
    title: string;
    content: string;
    file_type: 'petition' | 'reply' | 'rejoinder' | 'affidavit' | 'other';
  }) => {
    const { data, error } = await supabase
      .from('case_files')
      .insert([
        {
          user_id: userId,
          brief_id: briefId,
          analysis_id: analysisId,
          title: fileData.title,
          content: fileData.content,
          file_type: fileData.file_type,
          created_at: new Date().toISOString(),
        }
      ])
      .select();
    
    return { data, error };
  },

  /**
   * Get all case files for a user
   */
  getByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('case_files')
      .select(`
        *,
        briefs:brief_id (
          title
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  /**
   * Get case files for a specific brief
   */
  getByBriefId: async (briefId: string) => {
    const { data, error } = await supabase
      .from('case_files')
      .select('*')
      .eq('brief_id', briefId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  },

  /**
   * Get a specific case file by ID
   */
  getById: async (fileId: string) => {
    const { data, error } = await supabase
      .from('case_files')
      .select('*')
      .eq('id', fileId)
      .single();
    
    return { data, error };
  },

  /**
   * Update a case file
   */
  update: async (fileId: string, updates: {
    title?: string;
    content?: string;
    file_type?: 'petition' | 'reply' | 'rejoinder' | 'affidavit' | 'other';
  }) => {
    const { data, error } = await supabase
      .from('case_files')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select();
    
    return { data, error };
  },

  /**
   * Delete a case file
   */
  delete: async (fileId: string) => {
    const { error } = await supabase
      .from('case_files')
      .delete()
      .eq('id', fileId);
    
    return { error };
  },
};

// Storage functions for file uploads
export const storage = {
  /**
   * Upload a file to storage
   */
  uploadFile: async (userId: string, filePath: string, file: File) => {
    const { data, error } = await supabase.storage
      .from('user_files')
      .upload(`${userId}/${filePath}`, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    return { data, error };
  },

  /**
   * Get a public URL for a file
   */
  getPublicUrl: (userId: string, filePath: string) => {
    const { data } = supabase.storage
      .from('user_files')
      .getPublicUrl(`${userId}/${filePath}`);
    
    return data.publicUrl;
  },

  /**
   * Delete a file from storage
   */
  deleteFile: async (userId: string, filePath: string) => {
    const { error } = await supabase.storage
      .from('user_files')
      .remove([`${userId}/${filePath}`]);
    
    return { error };
  },

  /**
   * List all files for a user
   */
  listFiles: async (userId: string, folderPath: string = '') => {
    const { data, error } = await supabase.storage
      .from('user_files')
      .list(`${userId}/${folderPath}`);
    
    return { data, error };
  },
};

export default {
  supabase,
  auth,
  briefs,
  analysisResults,
  caseFiles,
  storage,
};
