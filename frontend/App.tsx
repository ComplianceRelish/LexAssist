import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from './supabase';
import Login from './Login';
import LandingPage from './LandingPage';
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
      <div className="app-container">
        <header className="app-header">
          <div className="logo-container">
            <img 
              src="/logo.png" 
              alt="App Logo" 
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                img.src = '/favicon.png';
              }}
            />
          </div>
          <nav className="nav-menu">
            {user ? (
              <button 
                className="sign-out-btn"
                onClick={() => authService.signOut()}
              >
                Sign Out
              </button>
            ) : (
              <Link to="/login" className="login-link">Login</Link>
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
          </Routes>
        </main>

        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} My App. All rights reserved.</p>
        </footer>
      </div>
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