import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { healthCheck } from './utils/api';

interface User {
  id: string;
  email: string;
  role: string;
  subscription: string;
  created_at: string;
  last_login: string;
}

interface AdminDashboardProps {
  isSuperAdmin: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isSuperAdmin }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, [currentPage]);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // TODO: Replace with real API call, e.g., await getUsers();
      // For now, use mock data
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'user1@example.com',
          role: 'user',
          subscription: 'free',
          created_at: '2025-05-01T00:00:00Z',
          last_login: '2025-05-23T00:00:00Z'
        },
        {
          id: '2',
          email: 'user2@example.com',
          role: 'user',
          subscription: 'pro',
          created_at: '2025-05-02T00:00:00Z',
          last_login: '2025-05-22T00:00:00Z'
        },
        {
          id: '3',
          email: 'admin@example.com',
          role: 'admin',
          subscription: 'enterprise',
          created_at: '2025-05-03T00:00:00Z',
          last_login: '2025-05-24T00:00:00Z'
        }
      ];
      setUsers(mockUsers);
      setTotalPages(1); // Mock pagination
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Example: Health check on mount (remove if not needed)
  useEffect(() => {
    healthCheck().then(res => {
      // Optionally display health status somewhere
      // console.log('API health:', res);
    });
  }, []);
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteUser = (userId: string) => {
    // In a real implementation, this would call the API
    // For now, we'll just update the local state
    setUsers(users.filter(user => user.id !== userId));
  };
  
  const handleSaveUser = (updatedUser: User) => {
    // In a real implementation, this would call the API
    // For now, we'll just update the local state
    setUsers(users.map(user => user.id === updatedUser.id ? updatedUser : user));
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };
  
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.subscription.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="admin-dashboard">
      <div className="admin-sidebar">
        <h2>Admin Panel</h2>
        <nav className="admin-nav">
          <button 
            className={`nav-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => handleTabChange('users')}
          >
            Users
          </button>
          <button 
            className={`nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => handleTabChange('subscriptions')}
          >
            Subscriptions
          </button>
          <button 
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => handleTabChange('analytics')}
          >
            Analytics
          </button>
          {isSuperAdmin && (
            <>
              <button 
                className={`nav-item ${activeTab === 'roles' ? 'active' : ''}`}
                onClick={() => handleTabChange('roles')}
              >
                Roles & Permissions
              </button>
              <button 
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabChange('settings')}
              >
                System Settings
              </button>
            </>
          )}
        </nav>
      </div>
      
      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="tab-header">
              <h1>User Management</h1>
              <div className="search-bar">
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>
            </div>
            
            {loading ? (
              <div className="loading">Loading users...</div>
            ) : (
              <>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Subscription</th>
                      <th>Created</th>
                      <th>Last Login</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>{user.email}</td>
                        <td>
                          <span className={`role-badge ${user.role}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td>
                          <span className={`subscription-badge ${user.subscription}`}>
                            {user.subscription.charAt(0).toUpperCase() + user.subscription.slice(1)}
                          </span>
                        </td>
                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        <td>{new Date(user.last_login).toLocaleDateString()}</td>
                        <td className="actions">
                          <button 
                            className="edit-button"
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </button>
                          {isSuperAdmin && (
                            <button 
                              className="delete-button"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="pagination">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'subscriptions' && (
          <div className="subscriptions-tab">
            <h1>Subscription Management</h1>
            <p>Manage subscription plans and user subscriptions</p>
            
            <div className="subscription-stats">
              <div className="stat-card">
                <h3>Free</h3>
                <p className="stat-value">125</p>
                <p className="stat-label">Active Users</p>
              </div>
              <div className="stat-card">
                <h3>Pro</h3>
                <p className="stat-value">78</p>
                <p className="stat-label">Active Users</p>
              </div>
              <div className="stat-card">
                <h3>Enterprise</h3>
                <p className="stat-value">24</p>
                <p className="stat-label">Active Users</p>
              </div>
              <div className="stat-card">
                <h3>Total Revenue</h3>
                <p className="stat-value">₹158,743</p>
                <p className="stat-label">This Month</p>
              </div>
            </div>
            
            {isSuperAdmin && (
              <div className="plan-management">
                <h2>Manage Plans</h2>
                <button className="primary-button">Edit Plan Details</button>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'analytics' && (
          <div className="analytics-tab">
            <h1>Analytics</h1>
            <p>View usage statistics and performance metrics</p>
            
            <div className="analytics-cards">
              <div className="analytics-card">
                <h3>Brief Analyses</h3>
                <p className="analytics-value">1,245</p>
                <p className="analytics-label">Last 30 days</p>
              </div>
              <div className="analytics-card">
                <h3>Case Files Generated</h3>
                <p className="analytics-value">387</p>
                <p className="analytics-label">Last 30 days</p>
              </div>
              <div className="analytics-card">
                <h3>New Users</h3>
                <p className="analytics-value">52</p>
                <p className="analytics-label">Last 30 days</p>
              </div>
              <div className="analytics-card">
                <h3>Active Users</h3>
                <p className="analytics-value">227</p>
                <p className="analytics-label">Last 30 days</p>
              </div>
            </div>
            
            <div className="analytics-charts">
              <div className="chart">
                <h3>Usage by Subscription Tier</h3>
                <div className="chart-placeholder">
                  [Chart Visualization Placeholder]
                </div>
              </div>
              <div className="chart">
                <h3>Daily Active Users</h3>
                <div className="chart-placeholder">
                  [Chart Visualization Placeholder]
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'roles' && isSuperAdmin && (
          <div className="roles-tab">
            <h1>Roles & Permissions</h1>
            <p>Manage user roles and permissions</p>
            
            <div className="roles-list">
              <div className="role-card">
                <h3>Super Admin</h3>
                <p>Full access to all features and settings</p>
                <ul className="permissions-list">
                  <li>User management (all users)</li>
                  <li>Role assignment</li>
                  <li>Subscription management</li>
                  <li>System configuration</li>
                  <li>Analytics and reporting</li>
                </ul>
                <button className="secondary-button">Edit Permissions</button>
              </div>
              
              <div className="role-card">
                <h3>Admin</h3>
                <p>Limited administrative access</p>
                <ul className="permissions-list">
                  <li>User management (regular users only)</li>
                  <li>Basic analytics</li>
                  <li>Content management</li>
                </ul>
                <button className="secondary-button">Edit Permissions</button>
              </div>
              
              <div className="role-card">
                <h3>User</h3>
                <p>Standard user access</p>
                <ul className="permissions-list">
                  <li>Access based on subscription tier</li>
                  <li>Personal profile management</li>
                </ul>
                <button className="secondary-button">Edit Permissions</button>
              </div>
            </div>
            
            <button className="primary-button">Create New Role</button>
          </div>
        )}
        
        {activeTab === 'settings' && isSuperAdmin && (
          <div className="settings-tab">
            <h1>System Settings</h1>
            <p>Configure system-wide settings</p>
            
            <div className="settings-section">
              <h2>General Settings</h2>
              <div className="setting-item">
                <label>Application Name</label>
                <input type="text" defaultValue="Lex Assist" />
              </div>
              <div className="setting-item">
                <label>Support Email</label>
                <input type="email" defaultValue="support@lexassist.com" />
              </div>
            </div>
            
            <div className="settings-section">
              <h2>Currency Settings</h2>
              <div className="setting-item">
                <label>Default Currency</label>
                <select defaultValue="INR">
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>
              <button className="secondary-button">Add New Currency</button>
            </div>
            
            <div className="settings-section">
              <h2>API Configuration</h2>
              <div className="setting-item">
                <label>Indian Kanoon API Key</label>
                <input type="password" defaultValue="d053cb3e0082a68b58def9f16e1b43c7a497faf4" />
                <button className="text-button">Show</button>
              </div>
            </div>
            
            <button className="primary-button">Save Settings</button>
          </div>
        )}
      </div>
      
      {isEditModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="edit-user-modal">
            <h2>Edit User</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveUser({
                ...selectedUser,
                email: (e.target as any).email.value,
                role: (e.target as any).role.value,
                subscription: (e.target as any).subscription.value
              });
            }}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" defaultValue={selectedUser.email} required />
              </div>
              
              <div className="form-group">
                <label>Role</label>
                <select name="role" defaultValue={selectedUser.role}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                </select>
              </div>
              
              <div className="form-group">
                <label>Subscription</label>
                <select name="subscription" defaultValue={selectedUser.subscription}>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-button">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
