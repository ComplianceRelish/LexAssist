// CORRECTED: src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { User, Subscription } from '../types';

// This will be a pro tier subscription to assign to new users
const defaultProSubscription: Subscription = {
  id: 'default-subscription',
  tier: 'pro', // Using pro to access more features
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  features: ['advanced_search', 'download_pdf', 'citation_export', 'case_comparison']
};

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

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<User>; // Return user instead of void
  logout: () => Promise<void>;
  signUp: (userData: RegistrationData) => Promise<User>; // Return user instead of void
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  autoLogin: () => Promise<User>; // New function for auto-login bypass
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    subscription: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const initializeAuth = async () => {
      setState(prev => ({ ...prev, loading: true }));
      try {
        // Check if user is already logged in from local storage
        const storedUser = localStorage.getItem('lexAssistUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          
          // CRITICAL FIX: Detect and remove fake auto-user
          if (user.id === 'auto-user-1') {
            console.log('Detected auto-user in local storage, clearing invalid user data');
            localStorage.removeItem('lexAssistUser');
            localStorage.removeItem('lexassist_token');
            setState(prev => ({ ...prev, loading: false }));
            return;
          }
          
          // Set the stored user in auth service only if it's a real user
          authService.setCurrentUser(user);
          setState(prev => ({
            ...prev,
            user,
            subscription: user.subscription || null,
            loading: false
          }));
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any potentially corrupted data
        localStorage.removeItem('lexAssistUser');
        localStorage.removeItem('lexassist_token');
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize authentication'
        }));
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Clear any previous auth state to ensure clean login
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_tokens');
      sessionStorage.removeItem('auth_user');
      
      // Perform login - this should set the token in authService
      const user = await authService.login(email, password);
      
      console.log('Login successful, token acquired');
      
      // Verify we have a token before proceeding
      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('Authentication succeeded but no token was received');
      }
      
      // Now that we have a valid token, fetch the user profile
      try {
        // This will use the token to fetch the complete user profile
        const profileData = await authService.refreshUser();
        console.log('User profile fetched successfully');
        
        // Update our user object with the complete profile data
        Object.assign(user, profileData);
      } catch (profileError) {
        console.warn('User profile not found in database, syncing with Supabase Auth');
        // If profile fetch fails, create user record in database
        try {
          // Create user with default subscription
          await authService.updateProfile({
            name: user.name || `${user.email.split('@')[0]}`,
            email: user.email,
            country: user.country || 'IN',
            userType: user.userType || 'client',
            subscription: {
              id: 'default-subscription',
              tier: 'pro',
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              features: ['advanced_search', 'download_pdf', 'citation_export', 'case_comparison']
            }
          });
          console.log('Created user record in database');
        } catch (createError) {
          console.error('Failed to create user record:', createError);
        }
      }
      
      // Set the authenticated user
      setState(prev => ({
        ...prev,
        user,
        subscription: user.subscription || null,
        loading: false
      }));
      
      return user;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Invalid credentials or server error'
      }));
      throw error;
    }
  };

  const signUp = async (userData: RegistrationData): Promise<User> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Register the user – backend returns basic user object but **NO AUTH TOKEN** yet
      const user = await authService.register(userData);
      
      // Registration succeeded. Ask user to verify and then log in.
      console.log('Registration successful. Redirecting to login page…');
      
      // Clear any existing auth state – we are NOT auto-logging in
      setState(prev => ({ ...prev, loading: false }));
      
      // Navigate caller back to login (do not set current user)
      window.location.href = '/login';
      
      return user as unknown as User;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Registration failed. Please try again.'
      }));
      throw error;
    }
  };

  const logout = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await authService.logout();
      setState({
        user: null,
        subscription: null,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Logout failed'
      }));
      throw error;
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const updatedUser = await authService.updateProfile(data);
      setState(prev => ({
        ...prev,
        user: updatedUser,
        subscription: updatedUser.subscription || null,
        loading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to update profile'
      }));
      throw error;
    }
  };

  const refreshUser = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.refreshUser();
      setState(prev => ({
        ...prev,
        user,
        subscription: user.subscription || null,
        loading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to refresh user data'
      }));
    }
  };

  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  // Assign pro subscription to an authenticated user
  const assignProSubscription = async (user: User): Promise<User> => {
    if (!user) {
      throw new Error('Cannot assign subscription to undefined user');
    }
    
    const userWithPro = {
      ...user,
      subscription: defaultProSubscription
    };
    
    localStorage.setItem('lexAssistUser', JSON.stringify(userWithPro));
    
    setState(prev => ({
      ...prev,
      user: userWithPro,
      subscription: userWithPro.subscription || null, // Ensure null fallback
      loading: false
    }));
    
    return userWithPro;
  };
  
  // Redirect to login instead of auto-login
  const redirectToLogin = async (): Promise<User> => {
    console.log('Auto-login is disabled. Redirecting to login...');
    window.location.href = '/auth/login';
    throw new Error('Please login to continue');
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      signUp,
      updateProfile,
      refreshUser,
      clearError,
      autoLogin: redirectToLogin // Use redirectToLogin instead of autoLogin
    }}>
      {!state.loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};