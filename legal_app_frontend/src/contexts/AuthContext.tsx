// CORRECTED: src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { User, Subscription } from '../types';

// Mock user for auto-login (bypassing verification)
const mockUser: User = {
  id: 'auto-user-1',
  name: 'Auto User',
  email: 'auto@lexassist.com',
  role: 'user',
  subscription: {
    id: 'auto-subscription-1',
    tier: 'pro', // Using pro to access more features
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    features: ['advanced_search', 'download_pdf', 'citation_export', 'case_comparison']
  }
  // Removed 'verified' property as it doesn't exist in the User type
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
      try {
        // Auto-login functionality - always authenticate with mock user
        // Store mock user in local storage
        localStorage.setItem('lexAssistUser', JSON.stringify(mockUser));
        authService.setCurrentUser(mockUser);
        
        setState(prev => ({
          ...prev,
          user: mockUser,
          subscription: mockUser.subscription || null,
          loading: false
        }));
      } catch (error) {
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
      const user = await authService.login(email, password);
      setState(prev => ({
        ...prev,
        user,
        subscription: user.subscription || null,
        loading: false
      }));
      return user; // Return user data
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
      const user = await authService.register(userData);
      setState(prev => ({ 
        ...prev, 
        loading: false,
        user
      }));
      return user; // Return user data
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

  // Auto login functionality - creates a mock authenticated session
  const autoLogin = async (): Promise<User> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Set the mock user
      localStorage.setItem('lexAssistUser', JSON.stringify(mockUser));
      authService.setCurrentUser(mockUser);
      
      setState(prev => ({
        ...prev,
        user: mockUser,
        subscription: mockUser.subscription || null, // Fix TypeScript error with explicit null fallback
        loading: false
      }));
      
      return mockUser;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Auto-login failed'
      }));
      throw error;
    }
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
      autoLogin
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