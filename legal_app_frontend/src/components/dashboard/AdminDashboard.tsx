import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboardProps } from '../../types';
import './AdminDashboard.css';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<string>('users');
  const navigate = useNavigate();
  
  // State for users and analytics data
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalUsers: 0,
    activeSubscriptions: {
      free: 0,
      pro: 0,
      enterprise: 0
    },
    monthlyRevenue: '₹0',
    averageUsageTime: '0 minutes',
    topFeatures: []
  });
  
  const [settings, setSettings] = useState<any>({
    apiKeys: {
      indianKanoon: '',
      supabase: ''
    },
    currencies: [
      { code: 'INR', symbol: '₹', name: 'Indian Rupee' }
    ],
    features: {
      voiceInput: false,
      caseFileDrafting: false,
      judgmentPrediction: false
    }
  });
  
  // Fetch data when component mounts
  React.useEffect(() => {
    // In production, these would make API calls to fetch real data
    fetchUsers();
    fetchAnalytics();
    fetchSettings();
  }, []);
  
  // These functions would make real API calls in production
  const fetchUsers = async () => {
    try {
      // const response = await apiClient.getAllUsers();
      // setUsers(response);
      setUsers([]);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };
  
  const fetchAnalytics = async () => {
    try {
      // const response = await apiClient.getAnalytics();
      // setAnalytics(response);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };
  
  const fetchSettings = async () => {
    try {
      // const response = await apiClient.getSystemSettings();
      // setSettings(response);
    } catch (error) {
      console.error('Error fetching settings:', error);
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
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`subscription-badge ${user.subscription}`}>
                    {user.subscription}
                  </span>
                </td>
                <td>{user.registeredDate}</td>
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
            <div className="analytics-value">{analytics.totalUsers}</div>
          </div>
          <div className="analytics-card">
            <h4>Monthly Revenue</h4>
            <div className="analytics-value">{analytics.monthlyRevenue}</div>
          </div>
          <div className="analytics-card">
            <h4>Avg. Usage Time</h4>
            <div className="analytics-value">{analytics.averageUsageTime}</div>
          </div>
        </div>
        
        <div className="analytics-section">
          <h4>Subscription Distribution</h4>
          <div className="subscription-chart">
            <div 
              className="chart-bar free" 
              style={{ width: `${(analytics.activeSubscriptions.free / analytics.totalUsers) * 100}%` }}
            >
              Free: {analytics.activeSubscriptions.free}
            </div>
            <div 
              className="chart-bar pro" 
              style={{ width: `${(analytics.activeSubscriptions.pro / analytics.totalUsers) * 100}%` }}
            >
              Pro: {analytics.activeSubscriptions.pro}
            </div>
            <div 
              className="chart-bar enterprise" 
              style={{ width: `${(analytics.activeSubscriptions.enterprise / analytics.totalUsers) * 100}%` }}
            >
              Enterprise: {analytics.activeSubscriptions.enterprise}
            </div>
          </div>
        </div>
        
        <div className="analytics-section">
          <h4>Top Features Used</h4>
          <ul className="feature-list">
            {analytics.topFeatures.map((feature, index) => (
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
                value={settings.apiKeys.indianKanoon} 
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
                value={settings.apiKeys.supabase} 
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
              {settings.currencies.map((currency, index) => (
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
                <input type="checkbox" checked={settings.features.voiceInput} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="feature-toggle">
              <span className="feature-name">Case File Drafting</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={settings.features.caseFileDrafting} />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="feature-toggle">
              <span className="feature-name">Judgment Prediction</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={settings.features.judgmentPrediction} />
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
      

    </div>
  );
};

export default AdminDashboard;
