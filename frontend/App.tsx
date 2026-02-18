import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { authService, supabase } from './supabase';
import Login from './Login';
import LandingPage from './LandingPage';
import RegisterModal from './RegisterModal';
import Header from './Header';
import BriefInput from './BriefInput';
import UserProfile from './UserProfile';
import SubscriptionPlans from './SubscriptionPlans';
import AdminTiersDashboard from './AdminTiersDashboard';
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
      <RouteListener>
        <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {/* Header — shown on all pages except landing & login */}
          <Routes>
            <Route path="/" element={null} />
            <Route path="/login" element={null} />
            <Route path="*" element={
              <Header
                isLoggedIn={!!user}
                onLoginClick={() => window.location.href = '/login'}
                onLogoutClick={handleLogout}
                userName={user?.email?.split('@')[0]}
              />
            } />
          </Routes>

          <main style={{ flex: 1 }}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
              <Route path="/register" element={<Navigate to="/?register=true" replace />} />

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
                ) : <Navigate to="/login" />
              } />

              <Route path="/profile" element={
                user ? (
                  <UserProfile
                    user={{ id: user.id, email: user.email || '' }}
                    subscription={{ tier: 'free', status: 'active' }}
                  />
                ) : <Navigate to="/login" />
              } />

              <Route path="/subscription" element={
                user ? (
                  <SubscriptionPlans
                    subscription={{ tier: 'free', status: 'active' }}
                  />
                ) : <Navigate to="/login" />
              } />

              <Route path="/admin" element={
                user ? <AdminTiersDashboard /> : <Navigate to="/login" />
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
