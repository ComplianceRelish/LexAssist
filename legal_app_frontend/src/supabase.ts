/**
 * Supabase Client Configuration
 * 
 * This module initializes and exports the Supabase client for use throughout the application.
 * It provides typed interfaces for database tables and authentication functions.
 */

import { createClient } from '@supabase/supabase-js';
import { User, Subscription } from '../../types';

// Define database types for type safety
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string; // UUID, primary key, references auth.users(id)
          full_name: string | null; // TEXT
          organization: string | null; // TEXT
          created_at: string; // TIMESTAMP WITH TIME ZONE
          updated_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id: string; // UUID, must match auth.users(id)
          full_name?: string | null; // Optional
          organization?: string | null; // Optional
          created_at?: string; // Default: now()
          updated_at?: string; // Default: now()
        };
        Update: {
          full_name?: string | null;
          organization?: string | null;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'user' | 'admin' | 'super_admin';
          created_at: string;
          updated_at: string;
          mobile?: string;
        };
        Insert: {
          email: string;
          full_name: string;
          role?: 'user' | 'admin' | 'super_admin';
          mobile?: string;
        };
        Update: {
          email?: string;
          full_name?: string;
          role?: 'user' | 'admin' | 'super_admin';
          mobile?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string; // UUID, primary key
          user_id: string; // UUID, references auth.users(id)
          plan_type: 'free' | 'pro' | 'enterprise'; // TEXT with CHECK constraint
          status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled'; // TEXT with CHECK constraint
          start_date: string; // TIMESTAMP WITH TIME ZONE
          end_date: string | null; // TIMESTAMP WITH TIME ZONE, can be null
          created_at: string; // TIMESTAMP WITH TIME ZONE
          updated_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          user_id: string; // Required
          plan_type: 'free' | 'pro' | 'enterprise'; // Required
          status: 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled'; // Required
          start_date?: string; // Optional, defaults to now()
          end_date?: string | null; // Optional
          created_at?: string; // Optional, defaults to now()
          updated_at?: string; // Optional, defaults to now()
        };
        Update: {
          user_id?: string;
          plan_type?: 'free' | 'pro' | 'enterprise';
          status?: 'active' | 'inactive' | 'trialing' | 'past_due' | 'cancelled';
          start_date?: string;
          end_date?: string | null;
          updated_at?: string;
        };
      };
      subscription_features: {
        Row: {
          id: string;
          tier: 'free' | 'pro' | 'enterprise';
          feature_key: string;
          feature_value: string;
          created_at: string;
        };
      };
      legal_domains: {
        Row: {
          id: string; // UUID, primary key
          name: string; // TEXT
          parent_id: string | null; // UUID, can be null for top-level domains
          description: string | null; // TEXT
          created_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          name: string; // Required
          parent_id?: string | null; // Optional
          description?: string | null; // Optional
          created_at?: string; // Optional, defaults to now()
        };
        Update: {
          name?: string;
          parent_id?: string | null;
          description?: string | null;
        };
      };
      jurisdictions: {
        Row: {
          id: string; // UUID, primary key
          name: string; // TEXT
          level: 'international' | 'national' | 'state' | 'local'; // TEXT with CHECK constraint
          parent_id: string | null; // UUID, can be null for top-level jurisdictions
          country: string | null; // TEXT
          state: string | null; // TEXT
          description: string | null; // TEXT
          created_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          name: string; // Required
          level: 'international' | 'national' | 'state' | 'local'; // Required
          parent_id?: string | null; // Optional
          country?: string | null; // Optional
          state?: string | null; // Optional
          description?: string | null; // Optional
          created_at?: string; // Optional, defaults to now()
        };
        Update: {
          name?: string;
          level?: 'international' | 'national' | 'state' | 'local';
          parent_id?: string | null;
          country?: string | null;
          state?: string | null;
          description?: string | null;
        };
      };
      legal_sources: {
        Row: {
          id: string; // UUID, primary key
          name: string; // TEXT
          source_type: string; // TEXT
          jurisdiction_id: string; // UUID, references jurisdictions(id)
          weight: number; // INTEGER
          created_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          name: string; // Required
          source_type: string; // Required
          jurisdiction_id: string; // Required
          weight: number; // Required
          created_at?: string; // Optional, defaults to now()
        };
        Update: {
          name?: string;
          source_type?: string;
          jurisdiction_id?: string;
          weight?: number;
        };
      };
      clients: {
        Row: {
          id: string; // UUID, primary key
          user_id: string; // UUID, references auth.users(id)
          name: string; // TEXT
          email: string | null; // TEXT
          phone: string | null; // TEXT
          address: string | null; // TEXT
          notes: string | null; // TEXT
          created_at: string; // TIMESTAMP WITH TIME ZONE
          updated_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          user_id: string; // Required
          name: string; // Required
          email?: string | null; // Optional
          phone?: string | null; // Optional
          address?: string | null; // Optional
          notes?: string | null; // Optional
          created_at?: string; // Optional, defaults to now()
          updated_at?: string; // Optional, defaults to now()
        };
        Update: {
          user_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      cases: {
        Row: {
          id: string; // UUID, primary key
          user_id: string; // UUID, references auth.users(id)
          client_id: string; // UUID, references clients(id)
          title: string; // TEXT
          case_number: string | null; // TEXT
          jurisdiction_id: string; // UUID, references jurisdictions(id)
          legal_domain_id: string; // UUID, references legal_domains(id)
          status: string; // TEXT
          description: string | null; // TEXT
          created_at: string; // TIMESTAMP WITH TIME ZONE
          updated_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          user_id: string; // Required
          client_id: string; // Required
          title: string; // Required
          case_number?: string | null; // Optional
          jurisdiction_id: string; // Required
          legal_domain_id: string; // Required
          status: string; // Required
          description?: string | null; // Optional
          created_at?: string; // Optional, defaults to now()
          updated_at?: string; // Optional, defaults to now()
        };
        Update: {
          user_id?: string;
          client_id?: string;
          title?: string;
          case_number?: string | null;
          jurisdiction_id?: string;
          legal_domain_id?: string;
          status?: string;
          description?: string | null;
          updated_at?: string;
        };
      };
      case_diary_entries: {
        Row: {
          id: string; // UUID, primary key
          case_id: string; // UUID, references cases(id)
          entry_text: string; // TEXT
          entry_date: string; // DATE
          entry_type: string; // TEXT
          created_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          case_id: string; // Required
          entry_text: string; // Required
          entry_date: string; // Required
          entry_type: string; // Required
          created_at?: string; // Optional, defaults to now()
        };
        Update: {
          case_id?: string;
          entry_text?: string;
          entry_date?: string;
          entry_type?: string;
        };
      };
      documents: {
        Row: {
          id: string; // UUID, primary key
          user_id: string; // UUID, references auth.users(id)
          case_id: string | null; // UUID, references cases(id), can be null for standalone documents
          title: string; // TEXT
          document_type: string; // TEXT
          jurisdiction_id: string | null; // UUID, references jurisdictions(id)
          legal_domain_id: string | null; // UUID, references legal_domains(id)
          file_path: string | null; // TEXT
          content: string | null; // TEXT
          citation: string | null; // TEXT
          source_id: string | null; // UUID, references legal_sources(id)
          published_date: string | null; // DATE
          created_at: string; // TIMESTAMP WITH TIME ZONE
          updated_at: string; // TIMESTAMP WITH TIME ZONE
          embedding_status: 'pending' | 'processing' | 'completed' | 'failed'; // TEXT with CHECK constraint
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          user_id: string; // Required
          case_id?: string | null; // Optional
          title: string; // Required
          document_type: string; // Required
          jurisdiction_id?: string | null; // Optional
          legal_domain_id?: string | null; // Optional
          file_path?: string | null; // Optional
          content?: string | null; // Optional
          citation?: string | null; // Optional
          source_id?: string | null; // Optional
          published_date?: string | null; // Optional
          created_at?: string; // Optional, defaults to now()
          updated_at?: string; // Optional, defaults to now()
          embedding_status?: 'pending' | 'processing' | 'completed' | 'failed'; // Optional, likely defaults to 'pending'
        };
        Update: {
          user_id?: string;
          case_id?: string | null;
          title?: string;
          document_type?: string;
          jurisdiction_id?: string | null;
          legal_domain_id?: string | null;
          file_path?: string | null;
          content?: string | null;
          citation?: string | null;
          source_id?: string | null;
          published_date?: string | null;
          updated_at?: string;
          embedding_status?: 'pending' | 'processing' | 'completed' | 'failed';
        };
      };
      document_chunks: {
        Row: {
          id: string; // UUID, primary key
          document_id: string; // UUID, references documents(id)
          chunk_index: number; // INTEGER
          chunk_text: string; // TEXT
          metadata: any; // JSONB
          created_at: string; // TIMESTAMP WITH TIME ZONE
          vector_id: string | null; // TEXT
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          document_id: string; // Required
          chunk_index: number; // Required
          chunk_text: string; // Required
          metadata?: any; // Optional
          created_at?: string; // Optional, defaults to now()
          vector_id?: string | null; // Optional
        };
        Update: {
          document_id?: string;
          chunk_index?: number;
          chunk_text?: string;
          metadata?: any;
          vector_id?: string | null;
        };
      };
      citations: {
        Row: {
          id: string; // UUID, primary key
          source_document_id: string; // UUID, references documents(id)
          target_document_id: string; // UUID, references documents(id)
          citation_text: string; // TEXT
          context: string | null; // TEXT
          created_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          source_document_id: string; // Required - document that contains the citation
          target_document_id: string; // Required - document being cited
          citation_text: string; // Required
          context?: string | null; // Optional
          created_at?: string; // Optional, defaults to now()
        };
        Update: {
          source_document_id?: string;
          target_document_id?: string;
          citation_text?: string;
          context?: string | null;
        };
      };
      search_history: {
        Row: {
          id: string; // UUID, primary key
          user_id: string; // UUID, references auth.users(id)
          query: string; // TEXT
          legal_domain_id: string | null; // UUID, references legal_domains(id)
          jurisdiction_id: string | null; // UUID, references jurisdictions(id)
          created_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          user_id: string; // Required - user who performed the search
          query: string; // Required - the search query text
          legal_domain_id?: string | null; // Optional - filter by legal domain
          jurisdiction_id?: string | null; // Optional - filter by jurisdiction
          created_at?: string; // Optional, defaults to now()
        };
        Update: {
          user_id?: string;
          query?: string;
          legal_domain_id?: string | null;
          jurisdiction_id?: string | null;
        };
      };
      user_activity: {
        Row: {
          id: string; // UUID, primary key
          user_id: string; // UUID, references auth.users(id)
          activity_type: string; // TEXT
          activity_details: any; // JSONB
          created_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          user_id: string; // Required - user who performed the activity
          activity_type: string; // Required - type of activity (e.g., 'login', 'document_view', 'case_update')
          activity_details?: any; // Optional - additional details about the activity
          created_at?: string; // Optional, defaults to now()
        };
        Update: {
          user_id?: string;
          activity_type?: string;
          activity_details?: any;
        };
      };
      vector_references: {
        Row: {
          id: string; // UUID, primary key
          document_id: string; // UUID, references documents(id)
          chunk_id: string; // UUID, references document_chunks(id)
          vector_id: string; // TEXT
          database_name: string; // TEXT
          index_name: string; // TEXT
          status: string; // TEXT
          metadata: any; // JSONB
          created_at: string; // TIMESTAMP WITH TIME ZONE
          updated_at: string; // TIMESTAMP WITH TIME ZONE
        };
        Insert: {
          id?: string; // Optional, will be generated with uuid_generate_v4() if not provided
          document_id: string; // Required - document this vector belongs to
          chunk_id: string; // Required - document chunk this vector represents
          vector_id: string; // Required - ID of the vector in the vector database
          database_name: string; // Required - name of the vector database
          index_name: string; // Required - name of the index in the vector database
          status: string; // Required - status of the vector reference (e.g., 'active', 'deleted')
          metadata?: any; // Optional - additional metadata about the vector
          created_at?: string; // Optional, defaults to now()
          updated_at?: string; // Optional, defaults to now()
        };
        Update: {
          document_id?: string;
          chunk_id?: string;
          vector_id?: string;
          database_name?: string;
          index_name?: string;
          status?: string;
          metadata?: any;
          updated_at?: string;
        };
      };
      legal_briefs: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
          title?: string;
        };
        Insert: {
          user_id: string;
          content: string;
          title?: string;
        };
        Update: {
          content?: string;
          title?: string;
        };
      };
      analysis_results: {
        Row: {
          id: string;
          brief_id: string;
          law_sections: any;
          case_histories: any;
          analysis: any;
          created_at: string;
        };
        Insert: {
          brief_id: string;
          law_sections: any;
          case_histories: any;
          analysis: any;
        };
      };
    };
  };
};

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
  );
}

// Create and export the typed Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper functions for authentication and user management

/**
 * Sign up a new user with email and password
 */
export const signUp = async (email: string, password: string, userData: { 
  firstName: string; 
  lastName: string; 
  mobile?: string;
}) => {
  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${userData.firstName} ${userData.lastName}`,
          mobile: userData.mobile
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    // 2. Insert user profile data
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: `${userData.firstName} ${userData.lastName}`,
        role: 'user',
        mobile: userData.mobile
      });

    if (profileError) throw profileError;

    // 3. Create default free subscription
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Default 1 year free tier

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: authData.user.id,
        tier: 'free',
        status: 'active',
        expires_at: expiresAt.toISOString()
      });

    if (subscriptionError) throw subscriptionError;

    return { user: authData.user, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error };
  }
};

/**
 * Sign in a user with email and password
 */
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { session: data.session, user: data.user, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { session: null, user: null, error };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

/**
 * Get the current logged-in user with their profile data
 */
export const getCurrentUser = async () => {
  try {
    // Get current auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) return { user: null, error: null };

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    // Get user subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      // PGRST116 is the error code for no rows returned
      throw subscriptionError;
    }

    // Get subscription features
    const tier = subscription?.tier || 'free';
    const { data: features, error: featuresError } = await supabase
      .from('subscription_features')
      .select('feature_key, feature_value')
      .eq('tier', tier);

    if (featuresError) throw featuresError;

    // Format features as an array of feature keys
    const featuresList = features?.map(f => f.feature_key) || [];

    // Construct the complete user object with subscription
    const userWithSubscription: User = {
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
      subscription: {
        tier: tier,
        features: featuresList,
        expiresAt: subscription?.expires_at || new Date().toISOString()
      }
    };

    return { user: userWithSubscription, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
};

/**
 * Update a user's subscription tier
 */
export const updateSubscription = async (userId: string, tier: 'free' | 'pro' | 'enterprise') => {
  try {
    // Calculate new expiration date based on tier
    const expiresAt = new Date();
    if (tier === 'free') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year for free tier
    } else if (tier === 'pro') {
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month for pro tier
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 12); // 12 months for enterprise tier
    }

    // Check if user has an active subscription
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existingSubscription) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          tier,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubscription.id);

      if (updateError) throw updateError;
    } else {
      // Create new subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier,
          status: 'active',
          expires_at: expiresAt.toISOString()
        });

      if (insertError) throw insertError;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error };
  }
};

/**
 * Check if a user has access to a specific feature
 */
export const hasFeatureAccess = async (userId: string, featureKey: string) => {
  try {
    // Get user's active subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subscriptionError) throw subscriptionError;
    
    const tier = subscription?.tier || 'free';
    
    // Check if feature exists for the user's tier
    const { data: feature, error: featureError } = await supabase
      .from('subscription_features')
      .select('feature_key')
      .eq('tier', tier)
      .eq('feature_key', featureKey)
      .single();

    if (featureError && featureError.code !== 'PGRST116') {
      throw featureError;
    }

    return { hasAccess: !!feature, error: null };
  } catch (error) {
    console.error('Error checking feature access:', error);
    return { hasAccess: false, error };
  }
};

/**
 * Request OTP for phone login
 */
export const requestOTP = async (phone: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone
    });

    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    console.error('Error requesting OTP:', error);
    return { success: false, error };
  }
};

/**
 * Verify OTP for phone login
 */
export const verifyOTP = async (phone: string, token: string) => {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    });

    if (error) throw error;
    return { session: data.session, user: data.user, error: null };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { session: null, user: null, error };
  }
};

/**
 * Create a new case
 */
export const createCase = async (caseData: Database['public']['Tables']['cases']['Insert']) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .insert(caseData)
      .select()
      .single();

    if (error) throw error;
    return { case: data, error: null };
  } catch (error) {
    console.error('Error creating case:', error);
    return { case: null, error };
  }
};

/**
 * Get a case by ID
 */
export const getCaseById = async (caseId: string) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, client:clients(*), jurisdiction:jurisdictions(*), legal_domain:legal_domains(*)')
      .eq('id', caseId)
      .single();

    if (error) throw error;
    return { case: data, error: null };
  } catch (error) {
    console.error('Error getting case:', error);
    return { case: null, error };
  }
};

/**
 * Get all cases for a user
 */
export const getUserCases = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .select('*, client:clients(id, full_name), jurisdiction:jurisdictions(id, name), legal_domain:legal_domains(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { cases: data, error: null };
  } catch (error) {
    console.error('Error getting user cases:', error);
    return { cases: [], error };
  }
};

/**
 * Update a case
 */
export const updateCase = async (caseId: string, caseData: Database['public']['Tables']['cases']['Update']) => {
  try {
    const { data, error } = await supabase
      .from('cases')
      .update({
        ...caseData,
        updated_at: new Date().toISOString()
      })
      .eq('id', caseId)
      .select()
      .single();

    if (error) throw error;
    return { case: data, error: null };
  } catch (error) {
    console.error('Error updating case:', error);
    return { case: null, error };
  }
};

/**
 * Add a case diary entry
 */
export const addCaseDiaryEntry = async (entryData: Database['public']['Tables']['case_diary_entries']['Insert']) => {
  try {
    const { data, error } = await supabase
      .from('case_diary_entries')
      .insert(entryData)
      .select()
      .single();

    if (error) throw error;
    return { entry: data, error: null };
  } catch (error) {
    console.error('Error adding case diary entry:', error);
    return { entry: null, error };
  }
};

/**
 * Get case diary entries for a case
 */
export const getCaseDiaryEntries = async (caseId: string) => {
  try {
    const { data, error } = await supabase
      .from('case_diary_entries')
      .select('*')
      .eq('case_id', caseId)
      .order('entry_date', { ascending: false });

    if (error) throw error;
    return { entries: data, error: null };
  } catch (error) {
    console.error('Error getting case diary entries:', error);
    return { entries: [], error };
  }
};

/**
 * Upload a document
 */
export const uploadDocument = async (
  file: File,
  userId: string,
  metadata: {
    title: string;
    document_type: string;
    case_id?: string;
    jurisdiction_id?: string;
    legal_domain_id?: string;
    citation?: string;
    source_id?: string;
    published_date?: string;
  }
) => {
  try {
    // 1. Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Create document record in database
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: metadata.title,
        document_type: metadata.document_type,
        case_id: metadata.case_id || null,
        jurisdiction_id: metadata.jurisdiction_id || null,
        legal_domain_id: metadata.legal_domain_id || null,
        file_path: filePath,
        citation: metadata.citation || null,
        source_id: metadata.source_id || null,
        published_date: metadata.published_date || null,
        embedding_status: 'pending'
      })
      .select()
      .single();

    if (documentError) throw documentError;

    return { document, error: null };
  } catch (error) {
    console.error('Error uploading document:', error);
    return { document: null, error };
  }
};

/**
 * Get documents for a user
 */
export const getUserDocuments = async (userId: string, filters?: {
  case_id?: string;
  document_type?: string;
  jurisdiction_id?: string;
  legal_domain_id?: string;
}) => {
  try {
    let query = supabase
      .from('documents')
      .select('*, case:cases(id, title), jurisdiction:jurisdictions(id, name), legal_domain:legal_domains(id, name)')
      .eq('user_id', userId);

    // Apply filters if provided
    if (filters?.case_id) {
      query = query.eq('case_id', filters.case_id);
    }
    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }
    if (filters?.jurisdiction_id) {
      query = query.eq('jurisdiction_id', filters.jurisdiction_id);
    }
    if (filters?.legal_domain_id) {
      query = query.eq('legal_domain_id', filters.legal_domain_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { documents: data, error: null };
  } catch (error) {
    console.error('Error getting user documents:', error);
    return { documents: [], error };
  }
};

/**
 * Get document by ID
 */
export const getDocumentById = async (documentId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*, case:cases(id, title), jurisdiction:jurisdictions(id, name), legal_domain:legal_domains(id, name)')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return { document: data, error: null };
  } catch (error) {
    console.error('Error getting document:', error);
    return { document: null, error };
  }
};

/**
 * Update document embedding status
 */
export const updateDocumentEmbeddingStatus = async (documentId: string, status: 'pending' | 'processing' | 'completed' | 'failed') => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .update({
        embedding_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)
      .select()
      .single();

    if (error) throw error;
    return { document: data, error: null };
  } catch (error) {
    console.error('Error updating document embedding status:', error);
    return { document: null, error };
  }
};

/**
 * Add document chunks
 */
export const addDocumentChunks = async (chunks: Database['public']['Tables']['document_chunks']['Insert'][]) => {
  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .insert(chunks)
      .select();

    if (error) throw error;
    return { chunks: data, error: null };
  } catch (error) {
    console.error('Error adding document chunks:', error);
    return { chunks: [], error };
  }
};

/**
 * Get document chunks
 */
export const getDocumentChunks = async (documentId: string) => {
  try {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .eq('document_id', documentId)
      .order('chunk_index', { ascending: true });

    if (error) throw error;
    return { chunks: data, error: null };
  } catch (error) {
    console.error('Error getting document chunks:', error);
    return { chunks: [], error };
  }
};

/**
 * Add a citation between documents
 */
export const addCitation = async (citationData: Database['public']['Tables']['citations']['Insert']) => {
  try {
    const { data, error } = await supabase
      .from('citations')
      .insert(citationData)
      .select()
      .single();

    if (error) throw error;
    return { citation: data, error: null };
  } catch (error) {
    console.error('Error adding citation:', error);
    return { citation: null, error };
  }
};

/**
 * Get citations for a document
 */
export const getDocumentCitations = async (documentId: string, direction: 'source' | 'target' = 'source') => {
  try {
    let query;
    if (direction === 'source') {
      // Get documents that this document cites
      query = supabase
        .from('citations')
        .select('*, target_document:documents!citations_target_document_id_fkey(id, title, document_type)')
        .eq('source_document_id', documentId);
    } else {
      // Get documents that cite this document
      query = supabase
        .from('citations')
        .select('*, source_document:documents!citations_source_document_id_fkey(id, title, document_type)')
        .eq('target_document_id', documentId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { citations: data, error: null };
  } catch (error) {
    console.error('Error getting document citations:', error);
    return { citations: [], error };
  }
};

/**
 * Record a search in search history
 */
export const recordSearch = async (searchData: Database['public']['Tables']['search_history']['Insert']) => {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .insert(searchData)
      .select()
      .single();

    if (error) throw error;
    return { search: data, error: null };
  } catch (error) {
    console.error('Error recording search:', error);
    return { search: null, error };
  }
};

/**
 * Get search history for a user
 */
export const getUserSearchHistory = async (userId: string, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('search_history')
      .select('*, legal_domain:legal_domains(id, name), jurisdiction:jurisdictions(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { searches: data, error: null };
  } catch (error) {
    console.error('Error getting user search history:', error);
    return { searches: [], error };
  }
};

/**
 * Record user activity
 */
export const recordUserActivity = async (activityData: Database['public']['Tables']['user_activity']['Insert']) => {
  try {
    const { data, error } = await supabase
      .from('user_activity')
      .insert(activityData)
      .select()
      .single();

    if (error) throw error;
    return { activity: data, error: null };
  } catch (error) {
    console.error('Error recording user activity:', error);
    return { activity: null, error };
  }
};

/**
 * Get user activity
 */
export const getUserActivity = async (userId: string, limit = 20) => {
  try {
    const { data, error } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { activities: data, error: null };
  } catch (error) {
    console.error('Error getting user activity:', error);
    return { activities: [], error };
  }
};

/**
 * Create a vector reference
 */
export const createVectorReference = async (vectorData: Database['public']['Tables']['vector_references']['Insert']) => {
  try {
    const { data, error } = await supabase
      .from('vector_references')
      .insert(vectorData)
      .select()
      .single();

    if (error) throw error;
    return { vector: data, error: null };
  } catch (error) {
    console.error('Error creating vector reference:', error);
    return { vector: null, error };
  }
};

/**
 * Get vector references for a document
 */
export const getDocumentVectorReferences = async (documentId: string) => {
  try {
    const { data, error } = await supabase
      .from('vector_references')
      .select('*')
      .eq('document_id', documentId)
      .eq('status', 'active');

    if (error) throw error;
    return { vectors: data, error: null };
  } catch (error) {
    console.error('Error getting document vector references:', error);
    return { vectors: [], error };
  }
};

/**
 * Update vector reference status
 */
export const updateVectorReferenceStatus = async (vectorId: string, status: string) => {
  try {
    const { data, error } = await supabase
      .from('vector_references')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', vectorId)
      .select()
      .single();

    if (error) throw error;
    return { vector: data, error: null };
  } catch (error) {
    console.error('Error updating vector reference status:', error);
    return { vector: null, error };
  }
};

// Export default for convenience
export default supabase;