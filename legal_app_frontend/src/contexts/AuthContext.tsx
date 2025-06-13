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
          // Set the stored user in auth service
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
      // Register the user
      const user = await authService.register(userData);
      
      // Assign pro subscription and bypass verification
      const enhancedUser = await assignProSubscription(user);
      
      // Set as current user
      setState(prev => ({ 
        ...prev, 
        loading: false,
        user: enhancedUser,
        subscription: enhancedUser.subscription || null // Ensure null fallback
      }));
      
      return enhancedUser; // Return enhanced user data
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

  // Assign pro subscription to a user - helps bypass subscription requirement
  // This function serves both as assignProSubscription and as autoLogin replacement
  const assignProSubscription = async (user?: User): Promise<User> => {
    // If no user is provided, create a default user for autoLogin functionality
    const targetUser = user || {
      id: 'auto-user-1',
      name: 'Auto User',
      email: 'auto@lexassist.com',
      role: 'user'
    };
    
    const userWithPro = {
      ...targetUser,
      subscription: defaultProSubscription
    };
    
    localStorage.setItem('lexAssistUser', JSON.stringify(userWithPro));
    authService.setCurrentUser(userWithPro);
    
    setState(prev => ({
      ...prev,
      user: userWithPro,
      subscription: userWithPro.subscription || null, // Ensure null fallback
      loading: false
    }));
    
    return userWithPro;
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
      autoLogin: assignProSubscription // Replace autoLogin with assignProSubscription
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