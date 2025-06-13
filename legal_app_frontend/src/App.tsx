// src/App.tsx - COMPLETE CORRECTED VERSION
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { BrandProvider } from './contexts/BrandContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import theme from './styles/theme';

// Page imports
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import VerifyEmailPage from './pages/Auth/VerifyEmailPage';
import MobileFirstDashboard from './pages/UserDashboard/MobileFirstDashboard';
import EnhancedUserDashboard from './pages/UserDashboard/EnhancedUserDashboard';
import EnvCheckPage from './pages/DevTools/EnvCheckPage';
import AdminDashboard from './pages/AdminDashboard';

// Component imports 
import BriefInput from './components/BriefInput';
import ResponseTabs from './components/ResponseTabs';
import DownloadShareFeature from './components/DownloadShareFeature';
import UserProfile from './components/user/UserProfile';

// Type imports
import { User, Subscription, LawSection, CaseHistory, Analysis, AnalysisResults } from './types';
import { getFeaturesByTier } from './utils/subscriptionUtils';

// Service imports
import LexAssistApiClient from './services/LexAssistApiClient';

// Utility imports
import checkEnvironmentVariables from './utils/envCheck';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Main App Component
const AppContent: React.FC = () => {
  const { user } = useAuth();
  
  // Initialize API client with environment variables
  const apiClient = React.useMemo(() => new LexAssistApiClient(
    import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com',
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  ), []);
  
  // State management for legacy components
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [brief, setBrief] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults>({
    lawSections: [],
    caseHistories: [],
    analysis: {
      summary: '',
      keyIssues: [],
      arguments: [],
      recommendations: []
    }
  });

  // Update subscription when user changes
  useEffect(() => {
    if (user?.subscription) {
      setSubscription(user.subscription);
    } else {
      setSubscription(null);
    }
  }, [user]);

  // Helper function to map API response to our application format
  const mapApiResultsToAppFormat = (apiResults: any): AnalysisResults => {
    return {
      lawSections: apiResults.law_sections?.map((section: any) => ({
        id: section.section_id || '',
        title: section.section_title || '',
        content: section.section_text || '',
        act_name: section.act_name || '',
        section_number: section.section_number || '',
        relevance_score: section.relevance_score || 0,
        relevance: section.relevance_score || 0
      })) || [],
      caseHistories: apiResults.case_references?.map((ref: any) => ({
        id: ref.citation || '',
        case_name: ref.case_name || '',
        citation: ref.citation || '',
        court: ref.court || '',
        date: ref.year?.toString() || '',
        content: ref.judgment_summary || '',
        summary: ref.judgment_summary || '',
        relevance_score: ref.relevance_score || 0,
        relevance: ref.relevance_score || 0,
        title: ref.case_name || '',
        year: ref.year?.toString() || ''
      })) || [],
      analysis: {
        summary: apiResults.analysis?.summary || '',
        keyIssues: apiResults.analysis?.key_issues?.map((issue: string) => ({
          title: issue,
          content: ''
        })) || [],
        arguments: apiResults.analysis?.legal_principles?.map((principle: string) => ({
          title: principle,
          content: ''
        })) || [],
        recommendations: apiResults.analysis?.recommendations?.map((rec: string) => ({
          title: rec,
          content: ''
        })) || []
      }
    };
  };

  const handleBriefSubmit = async (briefText: string) => {
    setBrief(briefText);
    setIsAnalyzing(true);
    
    try {
      const apiResults = await apiClient.analyzeBrief(briefText);
      if (apiResults) {
        const appResults = mapApiResultsToAppFormat(apiResults);
        setAnalysisResults(appResults);
      } else {
        setAnalysisResults({
          lawSections: [],
          caseHistories: [],
          analysis: {
            summary: '',
            keyIssues: [],
            arguments: [],
            recommendations: []
          }
        });
      }
    } catch (error) {
      console.error('Error analyzing brief:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (!user) return;
    
    try {
      const success = await apiClient.upgradeSubscription(tier);
      
      if (success) {
        const updatedUser = await apiClient.getUserProfile();
        
        if (updatedUser && updatedUser.subscription_tier) {
          const updatedSubscription: Subscription = {
            id: updatedUser.id,
            tier: updatedUser.subscription_tier,
            features: getFeaturesByTier(updatedUser.subscription_tier),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          };
          
          setSubscription(updatedSubscription);
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  const hasAccess = (feature: string): boolean => {
    return subscription?.features?.includes(feature) || false;
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<LoginPage onLogin={() => {}} />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<Navigate to="/dashboard" replace />} />
      <Route path="/env-check" element={<EnvCheckPage />} />

      {/* Protected routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <EnhancedUserDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Legacy mobile dashboard - keep for compatibility */}
      <Route 
        path="/mobile-dashboard" 
        element={
          <ProtectedRoute>
            <MobileFirstDashboard 
              user={user}
              onBriefSubmit={handleBriefSubmit}
              isAnalyzing={isAnalyzing}
              analysisResults={analysisResults}
              hasAccess={hasAccess}
            />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <UserProfile user={user} subscription={subscription} />
          </ProtectedRoute>
        } 
      />

      {/* Admin routes */}
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminDashboard user={user} />
          </AdminRoute>
        } 
      />

      {/* Catch-all route - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Root App Component with Providers
function App() {
  return (
    <ChakraProvider theme={theme}>
      <BrandProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </BrandProvider>
    </ChakraProvider>
  );
}

export default App;