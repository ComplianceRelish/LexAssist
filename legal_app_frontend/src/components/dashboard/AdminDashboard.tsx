import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboardProps } from '../../types';
import './AdminDashboard.css';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<string>('users');
  const navigate = useNavigate();
  
  // Mock data for the preview
  const mockUsers = [
    {
      id: '1',
      name: 'Free User',
      email: 'free@lexassist.com',
      role: 'user',
      subscription: 'free',
      registeredDate: '2025-01-15'
    },
    {
      id: '2',
      name: 'Pro User',
      email: 'pro@lexassist.com',
      role: 'user',
      subscription: 'pro',
      registeredDate: '2025-02-20'
    },
    {
      id: '3',
      name: 'Enterprise User',
      email: 'enterprise@lexassist.com',
      role: 'user',
      subscription: 'enterprise',
      registeredDate: '2025-03-10'
    },
    {
      id: '4',
      name: 'Admin User',
      email: 'admin@lexassist.com',
      role: 'admin',
      subscription: 'enterprise',
      registeredDate: '2025-01-01'
    }
  ];
  
  const mockAnalytics = {
    totalUsers: 42,
    activeSubscriptions: {
      free: 25,
      pro: 12,
      enterprise: 5
    },
    monthlyRevenue: '₹68,988',
    averageUsageTime: '45 minutes',
    topFeatures: [
      'Case Brief Analysis',
      'Law Section Extraction',
      'Document Generation'
    ]
  };
  
  const mockSettings = {
    apiKeys: {
      indianKanoon: 'd053cb3e0082a68b58def9f16e1b43c7a497faf4',
      supabase: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldXlpa3Rwa2VvbXNrcW9ybm51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNDM0NDQsImV4cCI6MjA2MzYxOTQ0NH0.ADWjENLW1GdjdQjrrqjG8KtXndRoTxXy8zBffm4mweU'
    },
    currencies: [
      { code: 'INR', symbol: '₹', name: 'Indian Rupee' }
    ],
    features: {
      voiceInput: true,
      caseFileDrafting: true,
      judgmentPrediction: true
    }
  };

  if (!user) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  // Check if user has admin privileges
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>You do not have permission to access the admin dashboard.</p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    );
  }

  const renderUsersTab = () => {
    return (
      <div className="admin-tab-content">
        <h3>User Management</h3>
        <div className="admin-actions">
          <button className="admin-action-button">Add User</button>
          <input type="text" placeholder="Search users..." className="admin-search" />
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Subscription</th>
              <th>Registered Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map(mockUser => (
              <tr key={mockUser.id}>
                <td>{mockUser.id}</td>
                <td>{mockUser.name}</td>
                <td>{mockUser.email}</td>
                <td>
                  <span className={`role-badge ${mockUser.role}`}>
                    {mockUser.role}
                  </span>
                </td>
                <td>
                  <span className={`subscription-badge ${mockUser.subscription}`}>
                    {mockUser.subscription}
                  </span>
                </td>
                <td>{mockUser.registeredDate}</td>
                <td className="action-buttons">
                  <button className="edit-button">Edit</button>
                  <button className="delete-button">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <button>&lt;</button>
          <button className="active">1</button>
          <button>2</button>
          <button>3</button>
          <button>&gt;</button>
        </div>
      </div>
    );
  };

  const renderAnalyticsTab = () => {
    return (
      <div className="admin-tab-content">
        <h3>Analytics Dashboard</h3>
        <div className="analytics-cards">
          <div className="analytics-card">
            <h4>Total Users</h4>
            <div className="analytics-value">{mockAnalytics.totalUsers}</div>
          </div>
          <div className="analytics-card">
            <h4>Monthly Revenue</h4>
            <div className="analytics-value">{mockAnalytics.monthlyRevenue}</div>
          </div>
          <div className="analytics-card">
            <h4>Avg. Usage Time</h4>
            <div className="analytics-value">{mockAnalytics.averageUsageTime}</div>
          </div>
        </div>
        
        <div className="analytics-section">
          <h4>Subscription Distribution</h4>
          <div className="subscription-chart">
            <div 
              className="chart-bar free" 
              style={{ width: `${(mockAnalytics.activeSubscriptions.free / mockAnalytics.totalUsers) * 100}%` }}
            >
              Free: {mockAnalytics.activeSubscriptions.free}
            </div>
            <div 
              className="chart-bar pro" 
              style={{ width: `${(mockAnalytics.activeSubscriptions.pro / mockAnalytics.totalUsers) * 100}%` }}
            >
              Pro: {mockAnalytics.activeSubscriptions.pro}
            </div>
            <div 
              className="chart-bar enterprise" 
              style={{ width: `${(mockAnalytics.activeSubscriptions.enterprise / mockAnalytics.totalUsers) * 100}%` }}
            >
              Enterprise: {mockAnalytics.activeSubscriptions.enterprise}
            </div>
          </div>
        </div>
        
        <div className="analytics-section">
          <h4>Top Features Used</h4>
          <ul className="feature-list">
            {mockAnalytics.topFeatures.map((feature, index) => (
              <li key={index} className="feature-item">
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderSettingsTab = () => {
    return (
      <div className="admin-tab-content">
        <h3>System Settings</h3>
        
        <div className="settings-section">
          <h4>API Keys</h4>
          <div className="api-keys">
            <div className="api-key-item">
              <span className="api-key-name">Indian Kanoon API:</span>
              <input 
                type="password" 
                value={mockSettings.apiKeys.indianKanoon} 
                readOnly 
                className="api-key-value" 
              />
              <button className="show-button">Show</button>
              <button className="update-button">Update</button>
            </div>
            <div className="api-key-item">
              <span className="api-key-name">Supabase API:</span>
              <input 
                type="password" 
                value={mockSettings.apiKeys.supabase} 
                readOnly 
                className="api-key-value" 
              />
              <button className="show-button">Show</button>
              <button className="update-button">Update</button>
            </div>
          </div>
        </div>
        
        <div className="settings-section">
          <h4>Currency Settings</h4>
          <table className="settings-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Symbol</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockSettings.currencies.map((currency, index) => (
                <tr key={index}>
                  <td>{currency.code}</td>
                  <td>{currency.symbol}</td>
                  <td>{currency.name}</td>
                  <td className="action-buttons">
                    <button className="edit-button">Edit</button>
                    <button className="delete-button">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-button">Add Currency</button>
        </div>
        
        <div className="settings-section">
          <h4>Feature Toggles</h4>
          <div className="feature-toggles">
            <div className="feature-toggle">
              <span className="feature-name">Voice Input</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={mockSettings.features.voiceInput} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="feature-toggle">
              <span className="feature-name">Case File Drafting</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={mockSettings.features.caseFileDrafting} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="feature-toggle">
              <span className="feature-name">Judgment Prediction</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={mockSettings.features.judgmentPrediction} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="settings-actions">
          <button className="save-settings-button">Save Settings</button>
          <button className="reset-button">Reset to Defaults</button>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard-container">
      <h2>Admin Dashboard</h2>
      <p className="admin-welcome">Welcome, {user.name}. You are logged in as {user.role}.</p>
      
      <div className="admin-tabs">
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button 
          className={activeTab === 'analytics' ? 'active' : ''} 
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
        <button 
          className={activeTab === 'settings' ? 'active' : ''} 
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>
      
      <div className="admin-content">
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
      
      <div className="admin-note">
        <p>
          <strong>Note:</strong> This is a preview version of the admin dashboard. In the production version, all actions would be fully functional.
        </p>
      </div>
    </div>
  );
};

export default AdminDashboard;
