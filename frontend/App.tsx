import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from './supabase';
import Login from './Login';
import Header from './Header';
import BriefInput from './BriefInput';
import UserProfile from './UserProfile';
import ProfileModal from './ProfileModal';
import ChatPanel from './ChatPanel';
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
  const [showChat, setShowChat] = useState(false);
  const [briefContext, setBriefContext] = useState<string | null>(null);

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
    setBriefContext(null);
    setShowChat(false);
  };

  if (loading) {
    return (
      <div className="lex-loading-screen">
        <div className="lex-loading-logo">⚖️</div>
        <div className="lex-loading-title">LexAssist</div>
        <div className="lex-loading-sub">AI-Powered Legal Research</div>
        <div className="lex-loading-spinner">
          <div className="lex-spinner"></div>
        </div>
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
            onOpenChat={() => setShowChat(true)}
          />
        )}

        <main style={{ flex: 1, background: '#f8fafc' }}>
          <Routes>
            {/* Login is the landing page */}
            <Route path="/" element={!user ? <Login /> : <Navigate to="/dashboard" />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              user ? (
                <div className="lex-dashboard">
                  {/* Welcome Banner */}
                  <div className="lex-welcome-banner">
                    <div className="lex-welcome-text">
                      <h1>
                        Welcome back, <span className="lex-welcome-name">{user.email?.split('@')[0] || 'Advocate'}</span>
                      </h1>
                      <p>
                        Enter your case brief below for AI-powered legal analysis with precedents, statutes, and strategic recommendations.
                      </p>
                    </div>
                    <div className="lex-welcome-actions">
                      <button
                        className="lex-quick-action"
                        onClick={() => setShowChat(true)}
                      >
                        💬 Ask AI Legal Query
                      </button>
                    </div>
                  </div>

                  {/* Main Content */}
                  <BriefInput
                    isLoggedIn={true}
                    onBriefChange={(text: string) => setBriefContext(text)}
                    onOpenChat={() => setShowChat(true)}
                  />
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
          <footer className="lex-footer">
            <div className="lex-footer-inner">
              <span>© {new Date().getFullYear()} LexAssist — AI-Powered Legal Research</span>
              <span className="lex-footer-divider">•</span>
              <span>Built by Adv. Tarun Philip ⚖️</span>
            </div>
          </footer>
        )}

        {/* AI Chat Panel */}
        {user && (
          <ChatPanel
            briefContext={briefContext}
            isOpen={showChat}
            onClose={() => setShowChat(false)}
          />
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
