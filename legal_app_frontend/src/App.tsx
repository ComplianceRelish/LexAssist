// legal_app_frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { BrandProvider } from './contexts/BrandContext';
import theme from './styles/theme';

// Page imports
import LandingPage from './pages/LandingPage/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import MobileFirstDashboard from './pages/UserDashboard/MobileFirstDashboard';
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

function App() {
  // Initialize API client with environment variables
  const apiClient = React.useMemo(() => new LexAssistApiClient(
    import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com',
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  ), []);
  
  // State management
  const [user, setUser] = useState<User | null>(null);
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

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('lexAssistUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setSubscription(parsedUser.subscription);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('lexAssistUser');
      }
    }
  }, []);

  // Auth handlers
  const handleLogin = async (user: User) => {
    try {
      // User is already authenticated at this point (in LoginPage)
      // Just update the app state with the user data
      setUser(user);
      // Handle subscription safely
      if (user.subscription) {
        setSubscription(user.subscription);
      } else {
        setSubscription(null);
      }
      localStorage.setItem('lexAssistUser', JSON.stringify(user));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSubscription(null);
    localStorage.removeItem('lexAssistUser');
  };

  // Feature handlers
  // Helper function to map API response to our application format
  const mapApiResultsToAppFormat = (apiResults: any): AnalysisResults => {
    return {
      lawSections: apiResults.law_sections?.map((section: any) => ({
        id: section.section_id || '',
        title: section.section_title || '',
        content: section.section_text || '',
        act_name: section.act_name || '',
        section_number: section.section_number || '',
        relevance_score: section.relevance_score || 0
      })) || [],
      caseHistories: apiResults.case_references?.map((ref: any) => ({
        id: ref.citation || '',
        case_name: ref.case_name || '',
        citation: ref.citation || '',
        court: ref.court || '',
        date: ref.year?.toString() || '',
        content: ref.judgment_summary || '',
        summary: ref.judgment_summary || '',
        relevance_score: ref.relevance_score || 0
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
        // Convert API results to our application format
        const appResults = mapApiResultsToAppFormat(apiResults);
        setAnalysisResults(appResults);
      } else {
        // Set empty results if null is returned
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
      // Handle error appropriately
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubscribe = async (tier: string) => {
    if (!user) return;
    
    try {
      // Use the apiClient instance method upgradeSubscription instead of static method
      const success = await apiClient.upgradeSubscription(tier);
      
      if (success) {
        // Get the updated user profile which includes subscription info
        const updatedUser = await apiClient.getUserProfile();
        
        if (updatedUser && updatedUser.subscription_tier) {
          // Create a subscription object from the user's subscription tier
          const updatedSubscription: Subscription = {
            id: updatedUser.id,
            tier: updatedUser.subscription_tier,
            features: getFeaturesByTier(updatedUser.subscription_tier),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          };
          
          setSubscription(updatedSubscription);
          
          // Update the user with the new subscription
          const fullUpdatedUser = {...user, subscription: updatedSubscription};
          setUser(fullUpdatedUser);
          localStorage.setItem('lexAssistUser', JSON.stringify(fullUpdatedUser));
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  const hasAccess = (feature: string): boolean => {
    return subscription?.features?.includes(feature) || false;
  };

  // Protected route wrapper
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    return <>{children}</>;
  };

  // Admin route wrapper
  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user || user.role !== 'admin') {
      return <Navigate to="/dashboard" />;
    }
    return <>{children}</>;
  };

  return (
    <ChakraProvider theme={theme}>
      <BrandProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/env-check" element={<EnvCheckPage />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <MobileFirstDashboard 
                  user={user}
                  onBriefSubmit={handleBriefSubmit}
                  isAnalyzing={isAnalyzing}
                  analysisResults={analysisResults}
                  hasAccess={hasAccess}
                />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <UserProfile user={user} subscription={subscription} />
              </ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <AdminRoute>
                {/* AdminDashboard component needs to be created or imported */}
                <div>Admin Dashboard (Component to be implemented)</div>
              </AdminRoute>
            } />
          </Routes>
        </BrowserRouter>
      </BrandProvider>
    </ChakraProvider>
  );
}

export default App;