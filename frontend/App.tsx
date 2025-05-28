import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from './supabase';
import Login from './Login';
import LandingPage from './LandingPage';
import RegisterModal from './RegisterModal';
import './App.css';
import './LandingPage.css';

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean; error: any}> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('App Error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error ? String(this.state.error) : 'Unknown error'}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// Route listener component to handle modal registration
function RouteListener({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  useEffect(() => {
    // Check for register=true in URL parameters
    const params = new URLSearchParams(location.search);
    if (params.get('register') === 'true') {
      setShowRegisterModal(true);
    }
  }, [location]);

  const handleRegistrationSuccess = () => {
    // Handle successful registration
    console.log("Registration successful!");
  };

  return (
    <>
      {children}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={handleRegistrationSuccess}
      />
    </>
  );
}

// Main App Component
function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const result = await authService.getSession();
      // Handle potential error case
      if ('error' in result) {
        console.error('Session error:', result.error);
        setUser(null);
      } else {
        setUser(result.data?.session?.user || null);
      }
      setLoading(false);
    };

    checkAuth();

    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  return (
    <Router>
      <RouteListener>
        <div className="app-container">
          <header className="app-header">
            <nav className="nav-menu">
              {user && (
                <button 
                  className="sign-out-btn"
                  onClick={() => authService.signOut()}
                >
                  Sign Out
                </button>
              )}
            </nav>
          </header>

          <main className="main-content">
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route 
                path="/dashboard" 
                element={
                  user ? (
                    <div className="dashboard">
                      <h1>Welcome back, {user.email}</h1>
                      {/* Dashboard content */}
                    </div>
                  ) : <Navigate to="/login" />
                } 
              />
              <Route path="/" element={<LandingPage />} />
              {/* Redirect /register to home with flag to open modal */}
              <Route path="/register" element={<Navigate to="/?register=true" replace />} />
            </Routes>
          </main>

          <footer className="app-footer">
            <p>&copy; {new Date().getFullYear()} My App. All rights reserved.</p>
          </footer>
        </div>
      </RouteListener>
    </Router>
  );
}

// App Wrapper with Error Boundary
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
