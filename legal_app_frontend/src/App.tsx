import { useState, useEffect } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useNavigate, 
  Navigate
} from "react-router-dom";
import Header from "./components/common/Header";
import AdminDashboard from "./components/dashboard/AdminDashboard";
import LandingPage from "./pages/LandingPage/LandingPage";
import HomePage from "./pages/HomePage";
import DocumentUpload from "./pages/DocumentUpload";
import LegalAI from "./pages/LegalAI";
import { User } from "./types";
import "./App.css";



// Define user roles and subscription tiers for role-based redirection
type UserRole = 'user' | 'admin' | 'super_admin';
type SubscriptionTier = 'free' | 'pro' | 'enterprise';

// We'll use the User interface directly from types/index.ts

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const handleLogin = (email: string, password: string) => {
    console.log("Login attempt with:", email, password);
    
    // Determine user role based on email - in real app, this would come from the backend
    let role: UserRole = 'user';
    
    if (email.includes('admin')) {
      role = 'admin';
    } else if (email.includes('super')) {
      role = 'super_admin';
    }
    
    // Determine subscription tier
    let subscriptionTier: SubscriptionTier = 'free';
    if (email.includes('pro')) {
      subscriptionTier = 'pro';
    } else if (email.includes('enterprise')) {
      subscriptionTier = 'enterprise';
    }
    
    const user: User = {
      id: Math.random().toString(36).substring(2, 9), // Generate a random ID
      email: email,
      name: email.split('@')[0] || email, // Ensure name is always a string
      role: role,
      subscription: {
        tier: subscriptionTier,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        features: []
      }
    };
    
    // Set user and login state
    setCurrentUser(user);
    setIsLoggedIn(true);
    
    // Store in localStorage for persistence
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isLoggedIn', 'true');
  };
  
  // Check for existing login on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedLoginState = localStorage.getItem('isLoggedIn');
    
    if (storedLoginState === 'true' && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user as User);
        setIsLoggedIn(true);
      } catch (e) {
        // Handle corrupted storage
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
      }
    }
  }, []);
  
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
  };
  
  return (
    <Router future={{ v7_startTransition: true }}>
      <div className="app-container">
        {isLoggedIn && <Header onLogout={handleLogout} user={currentUser} />}
        <main className="main-content">
          <Routes>
            <Route path="/" element={
              isLoggedIn 
                ? (currentUser?.role === 'admin' || currentUser?.role === 'super_admin') 
                  ? <Navigate to="/dashboard" />
                  : <HomePage user={currentUser} />
                : <LandingPage onLogin={handleLogin} />
            } />
            <Route path="/dashboard" element={
              isLoggedIn 
                ? (currentUser?.role === 'admin' || currentUser?.role === 'super_admin')
                  ? <AdminDashboard user={currentUser} />
                  : <Navigate to="/" />
                : <Navigate to="/" />
            } />
            <Route path="/upload" element={
              isLoggedIn
                ? <DocumentUpload />
                : <Navigate to="/" />
            } />
            <Route path="/legal-ai" element={
              isLoggedIn
                ? <LegalAI />
                : <Navigate to="/" />
            } />
            {/* Add a logout route */}
            <Route path="/logout" element={
              <LogoutComponent onLogout={handleLogout} />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// Helper component to handle logout
const LogoutComponent = ({ onLogout }: { onLogout: () => void }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    onLogout();
    navigate('/');
  }, [onLogout, navigate]);
  
  return <div>Logging out...</div>;
};

export default App;