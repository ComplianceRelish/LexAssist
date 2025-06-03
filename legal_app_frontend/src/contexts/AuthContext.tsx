import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { User, Subscription } from '../types';

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
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
  const navigate = useNavigate();

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

  const login = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const user = await authService.login(email, password);
      setState(prev => ({
        ...prev,
        user,
        subscription: user.subscription || null,
        loading: false
      }));
      navigate('/dashboard');
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Invalid credentials or server error'
      }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      await authService.register(email, password);
      setState(prev => ({ ...prev, loading: false }));
      navigate('/login?registered=true');
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Registration failed. Please try again.'
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
      navigate('/login');
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Logout failed'
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
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to update profile'
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
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to refresh user data'
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
