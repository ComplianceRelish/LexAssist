// src/pages/HomePage.tsx
import React from 'react';
import { User } from '../../types';

interface HomePageProps {
  user: User | null;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  // Determine user-specific content based on role
  const getRoleSpecificContent = () => {
    if (!user) return null;
    
    switch (user.role) {
      case 'admin':
        return (
          <div className="admin-features">
            <h3>Admin Features</h3>
            <ul>
              <li>User Management</li>
              <li>System Configuration</li>
              <li>Analytics Dashboard</li>
              <li>Content Management</li>
            </ul>
          </div>
        );
      case 'pro':
        return (
          <div className="pro-features">
            <h3>Pro Plan Features</h3>
            <ul>
              <li>Advanced Case Analysis</li>
              <li>Unlimited Document Processing</li>
              <li>Priority Support</li>
              <li>Custom Templates</li>
            </ul>
          </div>
        );
      case 'enterprise':
        return (
          <div className="enterprise-features">
            <h3>Enterprise Plan Features</h3>
            <ul>
              <li>Custom AI Training</li>
              <li>Dedicated Account Manager</li>
              <li>API Access</li>
              <li>Advanced Analytics</li>
              <li>Multi-user Access</li>
            </ul>
          </div>
        );
      default: // 'free'
        return (
          <div className="free-features">
            <h3>Free Plan Features</h3>
            <ul>
              <li>Basic Case Analysis</li>
              <li>Limited Document Processing (5/month)</li>
              <li>Email Support</li>
              <li>Standard Templates</li>
            </ul>
          </div>
        );
    }
  };

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h1>Welcome to LexAssist, {user?.name || 'Guest'}!</h1>
        <p>
          Your AI-powered legal assistant. Upload case briefs, get relevant 
          law sections, case histories, and draft your case files with ease.
        </p>
      </div>
      
      <div className="user-dashboard">
        <div className="dashboard-panel">
          <h2>Your Dashboard</h2>
          <p>Account type: <strong>{user?.role || 'Guest'}</strong></p>
          
          {getRoleSpecificContent()}
          
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button className="action-btn">Upload New Document</button>
              <button className="action-btn">Create Case Brief</button>
              <button className="action-btn">Search Case Law</button>
            </div>
          </div>
        </div>
        
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <p>You don't have any recent activity yet.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;