import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { createClient, User, Session } from '@supabase/supabase-js';
import Login from './Login';
import './App.css';

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Define TypeScript interfaces
interface SubscriptionTier {
  tier: 'free' | 'pro' | 'enterprise';
  id?: string;
  user_id?: string;
  status?: string;
  created_at?: string;
}

interface UserRole {
  role: 'user' | 'admin' | 'super_admin';
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionTier | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState('');
  const [analysisResults, setAnalysisResults] = useState<any | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Check for authenticated user on load
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
        // Fetch user's subscription and role
        fetchUserDetails(session.user.id);
      }
      
      setLoading(false);
    };
    
    checkUser();
    
    // Set up auth state change listener
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          fetchUserDetails(session.user.id);
        } else {
          setUser(null);
          setSubscription(null);
          setUserRole(null);
        }
      }
    );
    
    return () => {
      authListener?.unsubscribe();
    };
  }, []);
  
  // Fetch user's subscription and role
  const fetchUserDetails = async (userId: string) => {
    try {
      // Fetch subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      
      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subscriptionError);
      } else {
        setSubscription(subscriptionData || { tier: 'free' });
      }
      
      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role:', roleError);
      } else if (roleData && roleData.role) {
        setUserRole(roleData.role);
      } else {
        setUserRole('user'); // Default role
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };
  
  // Check if user is admin or super admin
  const isAdmin = (): boolean => {
    return userRole === 'admin' || userRole === 'super_admin';
  };
  
  // Check if user is super admin
  const isSuperAdmin = (): boolean => {
    return userRole === 'super_admin';
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <Router>
      <div className="app">
        <header className="header">
          <div className="logo">
            <img src="/images/logo.png" alt="Lex Assist Logo" onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/favicon.png';
            }} />
          </div>
          <nav className="nav">
            {user ? (
              <>
                <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
              </>
            )}
          </nav>
        </header>
        
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={
            <main className="main-content">
              <h1>Welcome to Lex Assist</h1>
              <p>Your AI-powered legal research assistant</p>
              {user ? (
                <div className="dashboard">
                  <h2>Dashboard</h2>
                  <p>Hello, {user.email}</p>
                  <p>Subscription: {subscription?.tier || 'Free'}</p>
                </div>
              ) : (
                <div className="cta">
                  <p>Sign in to get started with your legal research</p>
                  <Link to="/login" className="cta-button">Sign In</Link>
                </div>
              )}
            </main>
          } />
        </Routes>
        
        <footer className="footer">
          <div className="footer-text">
            <p>&copy; {new Date().getFullYear()} Lex Assist. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
