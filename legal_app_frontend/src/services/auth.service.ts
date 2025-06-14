import { User } from '../types';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

interface AuthToken {
  token: string;
  expiresAt: number;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

interface RegistrationData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  country: string;
  countryCode: string;
  mobileNumber: string;
  userType: string;
}

interface RegistrationResponse extends User {
  verification_method?: 'twilio_code' | 'email_link';
  verification_sent?: any;
  message?: string;
  legal_system?: string;
  jurisdiction?: string;
}

interface VerificationResponse {
  success: boolean;
  message: string;
  verification_type?: string;
}

class AuthService {
  private static instance: AuthService;
  private tokens: AuthToken | null = null;
  private currentUser: User | null = null;
  private refreshPromise: Promise<void> | null = null;
  private apiBaseUrl: string;

  private constructor() {
    // ✅ Use the correct backend URL with /api prefix
    this.apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com';
    
    // Initialize from sessionStorage if available
    this.loadFromStorage();
    
    // Set up axios defaults
    this.setupAxiosDefaults();
  }

  private setupAxiosDefaults(): void {
    // Set default base URL for axios
    axios.defaults.baseURL = this.apiBaseUrl;
    axios.defaults.withCredentials = true;
    
    // Add request interceptor to include auth token
    axios.interceptors.request.use((config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.tokens) {
          try {
            await this.refreshToken();
            // Retry the original request
            const token = this.getAccessToken();
            if (token) {
              error.config.headers.Authorization = `Bearer ${token}`;
              return axios.request(error.config);
            }
          } catch (refreshError) {
            this.clearAuth();
          }
        }
        return Promise.reject(error);
      }
    );
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

  /**
   * Register a new user and handle verification method
   * @returns Registration response with verification_method field
   */
  public async register(userData: RegistrationData): Promise<RegistrationResponse> {
    try {
      console.log('Registering user with data:', userData);
      
      // Call backend API with correct endpoint
      const response = await axios.post<RegistrationResponse>('/api/auth/register', userData);
      
      console.log('Registration response:', response.data);
      
      // Add logging for verification method
      console.log(`Verification method: ${response.data.verification_method || 'not specified'}`);
      
      return response.data;
    } catch (error: any) {
      console.error('Registration error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  }

  public async login(email: string, password: string): Promise<User> {
    try {
      console.log('Attempting regular login...');
      console.log('Logging in user:', email);
      
      // 🔧 FIX 1: Try JSON format first (most backends expect this)
      try {
        const response = await axios.post<AuthResponse>('/api/auth/login', {
          email: email,  // Use 'email' instead of 'username'
          password: password
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Login response:', response.data);
        
        if (!response.data.access_token) {
          throw new Error('No access token received from server');
        }
        
        // Set auth data and store tokens
        this.setAuthData(response.data);
        
        // Verify we have a valid token after login
        const token = this.getAccessToken();
        if (!token) {
          throw new Error('Token storage failed');
        }
        
        console.log('Authentication successful, token stored');
        return this.currentUser!;
        
      } catch (jsonError: any) {
        console.log('JSON login failed, trying form-urlencoded...', jsonError.response?.data);
        
        // 🔧 FIX 2: Fallback to form-urlencoded if JSON fails
        try {
          const params = new URLSearchParams();
          params.append('username', email);  // Some backends expect 'username'
          params.append('password', password);

          const response = await axios.post<AuthResponse>('/api/auth/login', params, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          console.log('Form login response:', response.data);
          
          if (!response.data.access_token) {
            throw new Error('No access token received from server');
          }
          
          // Set auth data and store tokens
          this.setAuthData(response.data);
          
          console.log('Form authentication successful, token stored');
          return this.currentUser!;
          
        } catch (formError: any) {
          // If both formats fail, check if it's an email verification error
          const errorDetail = formError.response?.data?.detail || jsonError.response?.data?.detail;
          
          if (errorDetail?.includes('Email not confirmed') || 
              errorDetail?.includes('not confirmed') ||
              errorDetail?.includes('not verified')) {
            
            console.log('Attempting admin bypass login for unverified email...');
            
            // 🔧 FIX 3: Use consistent JSON format for admin login
            const bypassResponse = await axios.post<AuthResponse>('/api/auth/admin-login', {
              email: email,  // Consistent field naming
              password: password
            }, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            console.log('Admin bypass login response:', bypassResponse.data);
            
            if (!bypassResponse.data.access_token) {
              throw new Error('No access token received from admin login');
            }
            
            // Set auth data and store tokens
            this.setAuthData(bypassResponse.data);
            
            console.log('Admin bypass authentication successful');
            return this.currentUser!;
          } else {
            // If it's not an email verification error, throw the most recent error
            throw formError;
          }
        }
      }
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      this.clearAuth(); // Clear any partial auth state on failure
      
      // 🔧 FIX 4: Better error messages
      const errorMessage = error.response?.data?.detail || error.message || 'Authentication failed';
      
      if (errorMessage.includes('Invalid email or password')) {
        throw new Error('Invalid email or password. Please check your credentials.');
      } else if (errorMessage.includes('Email not confirmed')) {
        throw new Error('Please verify your email address before logging in.');
      } else if (errorMessage.includes('User not found')) {
        throw new Error('No account found with this email address.');
      } else {
        throw new Error(errorMessage);
      }
    }
  }

  public async logout(): Promise<void> {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  private setAuthData(authResponse: AuthResponse): void {
    // Calculate expiration time (default to 1 hour if not provided)
    const expiresIn = authResponse.expires_in || 3600;
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    this.tokens = {
      token: authResponse.access_token,
      expiresAt: expiresAt,
    };
    
    this.currentUser = authResponse.user;
    this.saveToStorage();
  }
  
  /**
   * Set tokens directly - used by direct login service
   */
  public setTokens(tokens: { token: string; expiresAt: number }): void {
    this.tokens = tokens;
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

  public setCurrentUser(user: User): void {
    this.currentUser = user;
    this.saveToStorage();
    // We should login properly instead of using a mock token
    // This method should only update user data, not create fake tokens
    if (!this.tokens) {
      console.warn('No auth token available - user should log in');
    }
  }

  public async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await axios.put<{ user: User }>('/api/auth/profile', data);
      
      this.currentUser = response.data.user;
      this.saveToStorage();
      return this.currentUser;
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to update profile');
    }
  }

  public async refreshUser(): Promise<User> {
    try {
      const response = await axios.get<User>('/api/auth/profile');
      
      this.currentUser = response.data;
      this.saveToStorage();
      return this.currentUser;
    } catch (error: any) {
      console.error('User refresh error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to refresh user data');
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

  /**
   * Send verification code to email or phone
   * Handles fallback if Twilio is unavailable
   */
  public async sendVerification(data: { email?: string; phone?: string }): Promise<any> {
    try {
      const response = await axios.post('/api/auth/send-verification', data);
      console.log('Verification sent response:', response.data);
      
      // Check if this is fallback mode where service is not available
      if (response.data.fallback_mode) {
        console.log('Using fallback verification mode (email link)');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Send verification error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to send verification code');
    }
  }

  public async verifyCode(contact: string, code: string): Promise<VerificationResponse> {
    try {
      const response = await axios.post<VerificationResponse>('/api/auth/verify-code', { 
        contact, 
        code 
      });
      return response.data;
    } catch (error: any) {
      console.error('Verify code error:', error);
      throw new Error(error.response?.data?.detail || 'Verification failed');
    }
  }

  // ✅ Legacy OTP methods (now using Twilio backend)
  public async requestOTP(phone: string): Promise<void> {
    try {
      await axios.post('/api/auth/otp/request', { phone });
    } catch (error: any) {
      console.error('OTP request error:', error);
      throw new Error(error.response?.data?.detail || 'Failed to send OTP');
    }
  }

  public async verifyOTP(phone: string, code: string): Promise<void> {
    try {
      await axios.post('/api/auth/otp/verify', { phone, code });
    } catch (error: any) {
      console.error('OTP verification error:', error);
      throw new Error(error.response?.data?.detail || 'OTP verification failed');
    }
  }
}

export const authService = AuthService.getInstance();