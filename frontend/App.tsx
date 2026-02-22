import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from './supabase';
import { fetchAdminMe, clearAuthTokens } from './utils/api';
import Login from './Login';
import Header from './Header';
import BriefInput from './BriefInput';
import ChatPanel from './ChatPanel';
import './App.css';

// Lazy-load heavy route components to reduce initial bundle
const UserProfile = lazy(() => import('./UserProfile'));
const ProfileModal = lazy(() => import('./ProfileModal'));
const AdminPanel = lazy(() => import('./AdminPanel'));
const MyCases = lazy(() => import('./MyCases'));

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
  const [userRole, setUserRole] = useState<string>('user');
  const [userFullName, setUserFullName] = useState<string>('');
  const fetchedMeRef = useRef(false);

  // Check auth state on mount
  useEffect(() => {
    let mounted = true;

    const loadUserMeta = async () => {
      if (fetchedMeRef.current) return;
      fetchedMeRef.current = true;
      try {
        const me = await fetchAdminMe();
        if (mounted) {
          setUserRole(me.role || 'user');
          setUserFullName(me.full_name || '');
        }
      } catch { /* ignore */ }
    };

    const checkAuth = async () => {
      const result = await authService.getSession();
      if ('error' in result) {
        console.error('Session error:', result.error);
        setUser(null);
      } else {
        const session = result.data?.session;
        if (session?.user) {
          setUser(session.user);
          await loadUserMeta();
        } else {
          setUser(null);
        }
      }
      if (mounted) setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: Session | null) => {
        const newUser = session?.user || null;
        if (mounted) setUser(newUser);
        if (session && newUser) {
          await loadUserMeta();
        } else {
          fetchedMeRef.current = false;
          if (mounted) {
            setUserRole('user');
            setUserFullName('');
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    clearAuthTokens();
    await authService.signOut();
    setUser(null);
    setUserFullName('');
    setUserRole('user');
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
            userName={userFullName || user.email?.split('@')[0]}
            onOpenChat={() => setShowChat(true)}
            userRole={userRole}
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
                        Welcome back, <span className="lex-welcome-name">{(userFullName ? userFullName.split(' ')[0] : user.email?.split('@')[0]) || 'Advocate'}</span>
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

            <Route path="/cases" element={
              user ? <Suspense fallback={<div className="lex-loading-spinner"><div className="lex-spinner"></div></div>}><MyCases /></Suspense> : <Navigate to="/" />
            } />

            <Route path="/profile" element={
              user ? (
                <Suspense fallback={<div className="lex-loading-spinner"><div className="lex-spinner"></div></div>}>
                  <UserProfile user={{ id: user.id, email: user.email || '' }} />
                </Suspense>
              ) : <Navigate to="/" />
            } />

            <Route path="/admin" element={
              user && (userRole === 'super_admin' || userRole === 'admin') ? (
                <Suspense fallback={<div className="lex-loading-spinner"><div className="lex-spinner"></div></div>}>
                  <AdminPanel currentUserId={user.id} />
                </Suspense>
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
        <Suspense fallback={null}>
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
          />
        </Suspense>
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
