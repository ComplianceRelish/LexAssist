import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from './supabase';
import Login from './Login';
import Header from './Header';
import BriefInput from './BriefInput';
import UserProfile from './UserProfile';
import ProfileModal from './ProfileModal';
import './App.css';

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
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const checkAuth = async () => {
      const result = await authService.getSession();
      if ('error' in result) {
        console.error('Session error:', result.error);
        setUser(null);
      } else {
        setUser(result.data?.session?.user || null);
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', background: '#f8f9fb'
      }}>
        <div style={{ fontSize: '2rem', color: '#0a2e5c', fontWeight: 700, marginBottom: '0.5rem' }}>
          ⚖️ LexAssist
        </div>
        <div style={{ color: '#6b7280' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header — shown on all authenticated pages */}
        {user && (
          <Header
            isLoggedIn={true}
            onLoginClick={() => {}}
            onLogoutClick={handleLogout}
            userName={user.email?.split('@')[0]}
          />
        )}

        <main style={{ flex: 1 }}>
          <Routes>
            {/* Login is the landing page */}
            <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              user ? (
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0a2e5c', marginBottom: '0.3rem' }}>
                      Welcome, {user.email?.split('@')[0] || 'Advocate'}
                    </h1>
                    <p style={{ color: '#6b7280' }}>
                      Enter your case brief below to get AI-powered legal analysis with precedents, statutes, and strategic recommendations.
                    </p>
                  </div>
                  <BriefInput isLoggedIn={true} />
                </div>
              ) : <Navigate to="/" />
            } />

            <Route path="/profile" element={
              user ? (
                <UserProfile user={{ id: user.id, email: user.email || '' }} />
              ) : <Navigate to="/" />
            } />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Footer for authenticated pages */}
        {user && (
          <footer style={{
            background: '#0a2e5c', color: 'rgba(255,255,255,0.7)',
            textAlign: 'center', padding: '1rem', fontSize: '0.85rem'
          }}>
            © {new Date().getFullYear()} LexAssist — Built by Adv. Tarun Philip ⚖️
          </footer>
        )}

        {/* Profile Modal */}
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
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
