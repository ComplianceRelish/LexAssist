// CORRECTED: src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// ❌ REMOVE: import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { User, Subscription } from '../types';

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
  login: (email: string, password: string) => Promise<User>; // ✅ Return user instead of void
  logout: () => Promise<void>;
  signUp: (userData: RegistrationData) => Promise<User>; // ✅ Return user instead of void
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    subscription: null,
    loading: true,
    error: null
  });
  
  // ❌ REMOVE: const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const user = authService.getCurrentUser();
          setState(prev => ({
            ...prev,
            user,
            subscription: user?.subscription || null,
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
      // ✅ REMOVE navigation - let components handle it
      // navigate('/dashboard');
      return user; // ✅ Return user data
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
      
      // ✅ REMOVE navigation and alert - let components handle it
      // alert('Registration successful! Please check your email for verification code.');
      // navigate('/verify-email?email=' + encodeURIComponent(userData.email));
      return user; // ✅ Return user data
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
      // ✅ REMOVE navigation - let components handle it
      // navigate('/login');
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

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      signUp,
      updateProfile,
      refreshUser,
      clearError
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