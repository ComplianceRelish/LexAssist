import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import Header from './components/Header';
import BriefInput from './components/BriefInput';
import ResponseTabs from './components/ResponseTabs';
import DownloadShareFeature from './components/DownloadShareFeature';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import SubscriptionPlans from './components/subscription/SubscriptionPlans';
import AdminDashboard from './components/admin/AdminDashboard';
import UserProfile from './components/user/UserProfile';
import './App.css';

// Initialize Supabase client
const supabaseUrl = 'https://meuyiktpkeomskqornnu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldXlpa3Rwa2VvbXNrcW9ybm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNDM0NDQsImV4cCI6MjA2MzYxOTQ0NH0.ADWjENLW1GdjdQjrrqjG8KtXndRoTxXy8zBffm4mweU';
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
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
  const fetchUserDetails = async (userId) => {
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
        .select('roles:role_id(name)')
        .eq('user_id', userId)
        .single();
      
      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role:', roleError);
      } else if (roleData) {
        setUserRole(roleData.roles.name);
      } else {
        setUserRole('user'); // Default role
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };
  
  // Handle brief submission
  const handleBriefSubmit = async (briefText) => {
    setBrief(briefText);
    setIsAnalyzing(true);
    
    try {
      // Check usage limits based on subscription tier
      if (subscription) {
        const { data: usageLimits } = await supabase
          .from('usage_limits')
          .select('*')
          .eq('tier', subscription.tier)
          .single();
        
        // Track usage
        await supabase
          .from('usage_tracking')
          .insert({
            user_id: user.id,
            action_type: 'analyze_brief',
            action_details: { brief_length: briefText.length }
          });
        
        // Call API to analyze brief
        const response = await fetch('/api/analyze-brief', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brief: briefText,
            options: {
              include_law_sections: true,
              include_case_histories: true,
              include_analysis: true
            },
            user_id: user.id,
            save_results: true
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to analyze brief');
        }
        
        const results = await response.json();
        
        // Apply subscription limits to results
        if (usageLimits) {
          if (results.lawSections && results.lawSections.length > usageLimits.max_law_sections) {
            results.lawSections = results.lawSections.slice(0, usageLimits.max_law_sections);
          }
          
          if (results.caseHistories && results.caseHistories.length > usageLimits.max_case_histories) {
            results.caseHistories = results.caseHistories.slice(0, usageLimits.max_case_histories);
          }
        }
        
        setAnalysisResults(results);
      } else {
        // Handle unauthenticated or no subscription case
        // Use default free tier limits
        const response = await fetch('/api/analyze-brief', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            brief: briefText,
            options: {
              include_law_sections: true,
              include_case_histories: true,
              include_analysis: true
            }
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to analyze brief');
        }
        
        const results = await response.json();
        
        // Apply free tier limits
        if (results.lawSections && results.lawSections.length > 5) {
          results.lawSections = results.lawSections.slice(0, 5);
        }
        
        if (results.caseHistories && results.caseHistories.length > 5) {
          results.caseHistories = results.caseHistories.slice(0, 5);
        }
        
        setAnalysisResults(results);
      }
    } catch (error) {
      console.error('Error analyzing brief:', error);
      // Handle error state
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Check if user has access to a feature based on subscription tier
  const hasAccess = (feature) => {
    if (!subscription) return false;
    
    switch (feature) {
      case 'pdf_download':
        return true; // Available on all tiers
      case 'docx_download':
      case 'txt_download':
        return ['pro', 'enterprise'].includes(subscription.tier);
      case 'case_file_drafting':
        return ['pro', 'enterprise'].includes(subscription.tier);
      case 'advanced_case_file_drafting':
        return subscription.tier === 'enterprise';
      case 'sharing':
        return ['pro', 'enterprise'].includes(subscription.tier);
      default:
        return false;
    }
  };
  
  // Check if user is admin or super admin
  const isAdmin = () => {
    return ['admin', 'super_admin'].includes(userRole);
  };
  
  // Check if user is super admin
  const isSuperAdmin = () => {
    return userRole === 'super_admin';
  };
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return (
    <Router>
      <div className="app">
        <Header user={user} userRole={userRole} />
        
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={!user ? <Login supabase={supabase} /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register supabase={supabase} /> : <Navigate to="/" />} />
          <Route path="/subscription" element={user ? <SubscriptionPlans subscription={subscription} /> : <Navigate to="/login" />} />
          
          {/* Protected routes */}
          <Route path="/profile" element={user ? <UserProfile user={user} subscription={subscription} /> : <Navigate to="/login" />} />
          
          {/* Admin routes */}
          <Route path="/admin/*" element={user && isAdmin() ? <AdminDashboard isSuperAdmin={isSuperAdmin()} /> : <Navigate to="/" />} />
          
          {/* Main application */}
          <Route path="/" element={
            <main className="main-content">
              <BriefInput onSubmit={handleBriefSubmit} isAnalyzing={isAnalyzing} />
              
              {analysisResults && (
                <>
                  <ResponseTabs 
                    lawSections={analysisResults.lawSections || []}
                    caseHistories={analysisResults.caseHistories || []}
                    analysis={analysisResults.analysis || {}}
                    subscription={subscription}
                  />
                  
                  <DownloadShareFeature 
                    brief={brief}
                    analysisResults={analysisResults}
                    hasAccess={hasAccess}
                    subscription={subscription}
                  />
                </>
              )}
            </main>
          } />
        </Routes>
        
        <footer className="footer">
          <div className="footer-logo">
            <img src="/images/logo.png" alt="Lex Assist Logo" className="logo-image" />
          </div>
          <div className="footer-text">
            <p>&copy; {new Date().getFullYear()} Lex Assist. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
