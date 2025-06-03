import { User } from '../types';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface AuthToken {
  token: string;
  expiresAt: number;
}

interface AuthResponse {
  access_token: string;
  user: User;
}

class AuthService {
  private static instance: AuthService;
  private tokens: AuthToken | null = null;
  private currentUser: User | null = null;
  private refreshPromise: Promise<void> | null = null;
  private supabaseClient: any;

  private constructor() {
    // Initialize Supabase client
    this.supabaseClient = createClient(
      process.env.REACT_APP_SUPABASE_URL || '',
      process.env.REACT_APP_SUPABASE_KEY || ''
    );

    // Initialize from sessionStorage if available
    this.loadFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private loadFromStorage(): void {
    try {
      const storedTokens = sessionStorage.getItem('auth_tokens');
      const storedUser = sessionStorage.getItem('auth_user');

      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens);
        // Check if token is expired
        if (this.tokens && this.isTokenExpired()) {
          this.clearAuth();
        }
      }

      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error loading auth from storage:', error);
      this.clearAuth();
    }
  }

  private saveToStorage(): void {
    if (this.tokens) {
      sessionStorage.setItem('auth_tokens', JSON.stringify(this.tokens));
    }
    if (this.currentUser) {
      sessionStorage.setItem('auth_user', JSON.stringify(this.currentUser));
    }
  }

  private clearAuth(): void {
    this.tokens = null;
    this.currentUser = null;
    sessionStorage.removeItem('auth_tokens');
    sessionStorage.removeItem('auth_user');
  }

  private isTokenExpired(): boolean {
    if (!this.tokens) return true;
    return Date.now() >= this.tokens.expiresAt;
  }

  public async register(email: string, password: string): Promise<void> {
    try {
      const { data: supabaseData, error: supabaseError } = await this.supabaseClient.auth.signUp({
        email,
        password,
      });

      if (supabaseError) throw supabaseError;

      // Call our backend to complete registration
      await axios.post('/api/auth/register', {
        email,
        supabaseId: supabaseData.user?.id,
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Registration failed');
    }
  }

  public async login(email: string, password: string): Promise<User> {
    try {
      // Try Supabase authentication first
      const { data: supabaseData, error: supabaseError } = await this.supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (supabaseError) throw supabaseError;

      if (supabaseData?.user) {
        const response = await axios.post<AuthResponse>('/api/auth/verify', {
          supabaseToken: supabaseData.session?.access_token
        });

        this.setAuthData(response.data);
        return this.currentUser!;
      }

      // Fallback to traditional login
      const response = await axios.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });

      this.setAuthData(response.data);
      return this.currentUser!;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Authentication failed');
    }
  }

  public async logout(): Promise<void> {
    try {
      await this.supabaseClient.auth.signOut();
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  private setAuthData(authResponse: AuthResponse): void {
    const decodedToken = jwtDecode<{ exp: number }>(authResponse.access_token);
    
    this.tokens = {
      token: authResponse.access_token,
      expiresAt: decodedToken.exp * 1000, // Convert to milliseconds
    };
    
    this.currentUser = authResponse.user;
    this.saveToStorage();
  }

  public getAccessToken(): string | null {
    if (this.tokens && !this.isTokenExpired()) {
      return this.tokens.token;
    }
    return null;
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await axios.put<{ user: User }>('/api/users/profile', data, {
        headers: { Authorization: `Bearer ${this.getAccessToken()}` }
      });
      
      this.currentUser = response.data.user;
      this.saveToStorage();
      return this.currentUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw new Error('Failed to update profile');
    }
  }

  public async refreshUser(): Promise<User> {
    try {
      const response = await axios.get<{ user: User }>('/api/users/me', {
        headers: { Authorization: `Bearer ${this.getAccessToken()}` }
      });
      
      this.currentUser = response.data.user;
      this.saveToStorage();
      return this.currentUser;
    } catch (error) {
      console.error('User refresh error:', error);
      throw new Error('Failed to refresh user data');
    }
  }

  public isAuthenticated(): boolean {
    return !!(this.tokens && !this.isTokenExpired() && this.currentUser);
  }

  public async refreshToken(): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await axios.post<AuthResponse>('/api/auth/refresh');
        this.setAuthData(response.data);
      } catch (error) {
        this.clearAuth();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}

export const authService = AuthService.getInstance();
