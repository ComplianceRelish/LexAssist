/**
 * Frontend-Backend Integration for Lex Assist
 *
 * This module implements the secure API client for connecting the frontend to the backend,
 * handling authentication, role-based access control, and AI feature integration.
 */

import axios from 'axios';
import supabase from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'user';
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

interface LawSection {
  section_id: string;
  act_name: string;
  section_number: string;
  section_title?: string;
  section_text: string;
  relevance_score: number;
  citations?: string[];
}

interface CaseReference {
  case_name: string;
  citation: string;
  court: string;
  year: number;
  judgment_summary?: string;
  relevance_score: number;
  key_points?: string[];
}

interface LegalAnalysis {
  summary: string;
  key_issues: string[];
  legal_principles: string[];
  recommendations?: string[];
  risk_assessment?: Record<string, any>;
}

interface AnalysisResults {
  law_sections: LawSection[];
  case_references: CaseReference[];
  analysis: LegalAnalysis;
  processing_time: number;
  model_version: string;
}

interface SubscriptionTier {
  id: string;
  name: 'free' | 'pro' | 'enterprise';
  display_name: string;
  price: number;
  currency: string;
  billing_period: 'monthly' | 'annual';
  features: Record<string, any>;
  is_active: boolean;
}

// API Client Class
class LexAssistApiClient {
  private baseUrl: string;
  private supabaseClient: SupabaseClient;
  private accessToken: string | null = null;
  private user: User | null = null;

  constructor(baseUrl: string, _supabaseUrl?: string, _supabaseKey?: string) {
    this.baseUrl = baseUrl;
    this.supabaseClient = supabase;
    
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('lexassist_token');
      const storedUser = localStorage.getItem('lexassist_user');
      
      if (storedToken) {
        this.accessToken = storedToken;
      }
      
      if (storedUser) {
        try {
          this.user = JSON.parse(storedUser);
        } catch (e) {
          console.error('Failed to parse stored user data');
        }
      }
    }
  }

  // Authentication Methods
// Method 1: Update the existing method to accept an object
async register(userData: {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string; // Make mobile optional for backward compatibility
  mobileNumber?: string; // Add new property
  country?: string; // Add country code
  countryCode?: string; // Add phone country code
  password: string;
  userType: string;
}) {
  try {
    // Format the data for the backend API
    // Convert userData to a format compatible with backend
    const requestData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      password: userData.password,
      userType: userData.userType,
      mobileNumber: userData.mobileNumber || userData.mobile || '', // Support both formats
      country: userData.country || 'US',
      countryCode: userData.countryCode || '+1'
    };
    
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    return true;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

  async login(email: string, password: string): Promise<boolean> {
    try {
      // First try authenticating with Supabase
      try {
        const { data, error } = await this.supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        
        if (!error && data.session) {
          // Successfully authenticated with Supabase
          this.accessToken = data.session.access_token;
          
          // Get user data from our backend using the verified session
          const userResponse = await this.getCurrentUser();
          if (userResponse) {
            if (typeof window !== 'undefined' && this.accessToken) {
              localStorage.setItem('lexassist_token', this.accessToken);
              if (this.user) {
                localStorage.setItem('lexassist_user', JSON.stringify(this.user));
              }
            }
            return true;
          }
        }
      } catch (supabaseError) {
        console.log('Supabase authentication not available, falling back to API:', supabaseError);
      }
      
      // Fall back to our own API
      const response = await axios.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
        username: email,
        password
      });
      
      this.accessToken = response.data.access_token;
      this.user = response.data.user;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('lexassist_token', this.accessToken);
        localStorage.setItem('lexassist_user', JSON.stringify(this.user));
      }
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }

  async loginWithOTP(mobile: string, otp: string): Promise<boolean> {
    try {
      // First try using Supabase OTP verification if available
      try {
        const { error } = await this.supabaseClient.auth.verifyOtp({
          phone: mobile,
          token: otp,
          type: 'sms'
        });
        
        if (!error) {
          // Successfully authenticated with Supabase
          const { data } = await this.supabaseClient.auth.getSession();
          if (data.session) {
            this.accessToken = data.session.access_token;
            
            // Get user data from our backend using the verified session
            const userResponse = await this.getCurrentUser();
            if (userResponse) {
              if (typeof window !== 'undefined') {
                if (this.accessToken) {
                  localStorage.setItem('lexassist_token', this.accessToken);
                }
                if (this.user) {
                  localStorage.setItem('lexassist_user', JSON.stringify(this.user));
                }
              }
              return true;
            }
          }
        }
      } catch (supabaseError) {
        console.log('Supabase OTP verification not available, falling back to API:', supabaseError);
      }
      
      // Fall back to our own API
      const response = await axios.post<AuthResponse>(`${this.baseUrl}/auth/verify-otp`, {
        mobile,
        otp
      });
      
      this.accessToken = response.data.access_token;
      this.user = response.data.user;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('lexassist_token', this.accessToken);
        localStorage.setItem('lexassist_user', JSON.stringify(this.user));
      }
      
      return true;
    } catch (error) {
      console.error('OTP verification failed:', error);
      return false;
    }
  }

  async requestOTP(phone: string): Promise<boolean> {
    try {
      await axios.post(`${this.baseUrl}/auth/otp/request`, { phone });
      return true;
    } catch (error) {
      console.error('OTP request failed:', error);
      return false;
    }
  }

  async logout(): Promise<boolean> {
    try {
      if (this.accessToken) {
        await axios.post(`${this.baseUrl}/auth/logout`, {}, {
          headers: this.getAuthHeaders()
        });
      }
      
      this.accessToken = null;
      this.user = null;
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lexassist_token');
        localStorage.removeItem('lexassist_user');
      }
      
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  async refreshToken(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false;
      }
      
      const response = await axios.post<{ access_token: string }>(`${this.baseUrl}/auth/refresh`, {}, {
        headers: this.getAuthHeaders()
      });
      
      this.accessToken = response.data.access_token;
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('lexassist_token', this.accessToken);
      }
      
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.accessToken = null;
      this.user = null;
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lexassist_token');
        localStorage.removeItem('lexassist_user');
      }
      
      return false;
    }
  }

  // User and Role Management
  async updateUserRole(userId: string, role: 'super_admin' | 'admin' | 'user'): Promise<boolean> {
    try {
      if (!this.isSuperAdmin()) {
        throw new Error('Unauthorized: Only Super Admins can update user roles');
      }
      
      await axios.put(`${this.baseUrl}/auth/role`, {
        user_id: userId,
        role
      }, {
        headers: this.getAuthHeaders()
      });
      
      return true;
    } catch (error) {
      console.error('Role update failed:', error);
      return false;
    }
  }

  async getUserProfile(): Promise<User | null> {
    try {
      if (!this.accessToken) {
        return null;
      }
      
      const response = await axios.get<User>(`${this.baseUrl}/users/profile`, {
        headers: this.getAuthHeaders()
      });
      
      this.user = response.data;
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('lexassist_user', JSON.stringify(this.user));
      }
      
      return this.user;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      if (!this.isAdmin() && !this.isSuperAdmin()) {
        throw new Error('Unauthorized: Only Admins and Super Admins can view all users');
      }
      
      const response = await axios.get<User[]>(`${this.baseUrl}/users`, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get users:', error);
      return [];
    }
  }

  // Subscription Management
  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    try {
      const response = await axios.get<SubscriptionTier[]>(`${this.baseUrl}/subscriptions/tiers`);
      return response.data;
    } catch (error) {
      console.error('Failed to get subscription tiers:', error);
      return [];
    }
  }

  async updateSubscriptionTier(tierId: string, tierData: Partial<SubscriptionTier>): Promise<boolean> {
    try {
      if (!this.isSuperAdmin()) {
        throw new Error('Unauthorized: Only Super Admins can update subscription tiers');
      }
      
      await axios.put(`${this.baseUrl}/subscriptions/tiers/${tierId}`, tierData, {
        headers: this.getAuthHeaders()
      });
      
      return true;
    } catch (error) {
      console.error('Failed to update subscription tier:', error);
      return false;
    }
  }

  async upgradeSubscription(tierId: string): Promise<boolean> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Unauthorized: Must be logged in to upgrade subscription');
      }
      
      await axios.post(`${this.baseUrl}/subscriptions/upgrade`, {
        tier_id: tierId
      }, {
        headers: this.getAuthHeaders()
      });
      
      // Refresh user profile to get updated subscription
      await this.getUserProfile();
      
      return true;
    } catch (error) {
      console.error('Subscription upgrade failed:', error);
      return false;
    }
  }

  // Legal Analysis Features
  async analyzeBrief(briefText: string): Promise<AnalysisResults | null> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Unauthorized: Must be logged in to analyze briefs');
      }
      
      const response = await axios.post<AnalysisResults>(`${this.baseUrl}/briefs/analyze`, {
        brief_text: briefText
      }, {
        headers: this.getAuthHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Brief analysis failed:', error);
      return null;
    }
  }

  async draftCaseFile(briefId: string): Promise<string | null> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Unauthorized: Must be logged in to draft case files');
      }
      
      if (!this.hasFeatureAccess('case_drafting')) {
        throw new Error('Feature not available in your subscription tier');
      }
      
      const response = await axios.post<{ content: string }>(`${this.baseUrl}/briefs/draft`, {
        brief_id: briefId
      }, {
        headers: this.getAuthHeaders()
      });
      
      return response.data.content;
    } catch (error) {
      console.error('Case file drafting failed:', error);
      return null;
    }
  }

  async exportAnalysis(briefId: string, format: 'pdf' | 'docx' | 'rtf'): Promise<string | null> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Unauthorized: Must be logged in to export analysis');
      }
      
      const response = await axios.get<{ download_url: string }>(`${this.baseUrl}/briefs/export/${briefId}`, {
        params: { format },
        headers: this.getAuthHeaders()
      });
      
      return response.data.download_url;
    } catch (error) {
      console.error('Analysis export failed:', error);
      return null;
    }
  }

  // Helper Methods
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user;
  }

  isSuperAdmin(): boolean {
    return this.isAuthenticated() && this.user?.role === 'super_admin';
  }

  isAdmin(): boolean {
    return this.isAuthenticated() && (this.user?.role === 'admin' || this.user?.role === 'super_admin');
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getSubscriptionTier(): string | null {
    return this.user?.subscription_tier || null;
  }

  hasFeatureAccess(featureKey: string): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    // Super admins have access to all features
    if (this.isSuperAdmin()) {
      return true;
    }
    
    // Feature access based on subscription tier
    const tier = this.getSubscriptionTier();
    
    switch (featureKey) {
      case 'case_briefs':
        // All tiers have access to case briefs
        return true;
      
      case 'law_sections':
      case 'case_histories':
        // All tiers have access to these features
        return true;
      
      case 'ai_analysis':
        // Pro and Enterprise tiers only
        return tier === 'pro' || tier === 'enterprise';
      
      case 'case_drafting':
        // Enterprise tier only
        return tier === 'enterprise';
      
      case 'priority_support':
      case 'custom_integrations':
        // Enterprise tier only
        return tier === 'enterprise';
      
      default:
        return false;
    }
  }

  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`
    };
  }
}

export default LexAssistApiClient;
export type {
  User,
  AuthResponse,
  LawSection,
  CaseReference,
  LegalAnalysis,
  AnalysisResults,
  SubscriptionTier
};
