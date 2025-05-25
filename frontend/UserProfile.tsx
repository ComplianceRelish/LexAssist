import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';

interface UserProfileProps {
  user: {
    id: string;
    email: string;
  };
  subscription: {
    tier: string;
    status: string;
  } | null;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, subscription }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [usageStats, setUsageStats] = useState({
    briefsAnalyzed: 0,
    caseFilesGenerated: 0,
    documentsDownloaded: 0,
    searchesPerformed: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Fetch user usage statistics
    fetchUsageStats();
  }, []);
  
  const fetchUsageStats = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would call the API
      // For now, we'll use mock data
      setUsageStats({
        briefsAnalyzed: 12,
        caseFilesGenerated: 5,
        documentsDownloaded: 8,
        searchesPerformed: 27
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  const handleUpgradeClick = () => {
    navigate('/subscription');
  };
  
  const getTierDetails = () => {
    switch (subscription?.tier) {
      case 'free':
        return {
          name: 'Free',
          limits: {
            searches: '10 per day',
            lawSections: '5 per brief',
            caseHistories: '5 per brief',
            documentFormats: 'PDF only',
            caseFileDrafting: 'Not available'
          }
        };
      case 'pro':
        return {
          name: 'Pro',
          limits: {
            searches: '50 per day',
            lawSections: '20 per brief',
            caseHistories: '20 per brief',
            documentFormats: 'PDF, DOCX, TXT',
            caseFileDrafting: 'Basic (petitions and replies)'
          }
        };
      case 'enterprise':
        return {
          name: 'Enterprise',
          limits: {
            searches: 'Unlimited',
            lawSections: 'Unlimited',
            caseHistories: 'Unlimited',
            documentFormats: 'PDF, DOCX, TXT',
            caseFileDrafting: 'Advanced (all document types)'
          }
        };
      default:
        return {
          name: 'Unknown',
          limits: {
            searches: 'Unknown',
            lawSections: 'Unknown',
            caseHistories: 'Unknown',
            documentFormats: 'Unknown',
            caseFileDrafting: 'Unknown'
          }
        };
    }
  };
  
  const tierDetails = getTierDetails();
  
  return (
    <div className="user-profile-container">
      <div className="profile-sidebar">
        <div className="user-info">
          <div className="user-avatar">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h3>{user.email}</h3>
            <span className={`subscription-badge ${subscription?.tier || 'free'}`}>
              {tierDetails.name}
            </span>
          </div>
        </div>
        
        <nav className="profile-nav">
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => handleTabChange('profile')}
          >
            Profile
          </button>
          <button 
            className={`nav-item ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => handleTabChange('subscription')}
          >
            Subscription
          </button>
          <button 
            className={`nav-item ${activeTab === 'usage' ? 'active' : ''}`}
            onClick={() => handleTabChange('usage')}
          >
            Usage
          </button>
          <button 
            className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            History
          </button>
        </nav>
      </div>
      
      <div className="profile-content">
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <h1>Profile Information</h1>
            
            <div className="profile-form">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={user.email} readOnly />
              </div>
              
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter your full name" />
              </div>
              
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" placeholder="Enter your phone number" />
              </div>
              
              <div className="form-group">
                <label>Organization</label>
                <input type="text" placeholder="Enter your organization" />
              </div>
              
              <button className="save-button">Save Changes</button>
            </div>
            
            <div className="password-section">
              <h2>Change Password</h2>
              
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" placeholder="Enter current password" />
              </div>
              
              <div className="form-group">
                <label>New Password</label>
                <input type="password" placeholder="Enter new password" />
              </div>
              
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" />
              </div>
              
              <button className="save-button">Update Password</button>
            </div>
          </div>
        )}
        
        {activeTab === 'subscription' && (
          <div className="subscription-tab">
            <h1>Subscription Details</h1>
            
            <div className="current-plan">
              <h2>Current Plan</h2>
              <div className="plan-card">
                <div className="plan-header">
                  <h3>{tierDetails.name}</h3>
                  <span className={`status-badge ${subscription?.status || 'active'}`}>
                    {subscription?.status === 'canceled' ? 'Canceled' : 'Active'}
                  </span>
                </div>
                
                <div className="plan-details">
                  <div className="detail-item">
                    <span className="detail-label">Searches:</span>
                    <span className="detail-value">{tierDetails.limits.searches}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Law Sections:</span>
                    <span className="detail-value">{tierDetails.limits.lawSections}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Case Histories:</span>
                    <span className="detail-value">{tierDetails.limits.caseHistories}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Document Formats:</span>
                    <span className="detail-value">{tierDetails.limits.documentFormats}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Case File Drafting:</span>
                    <span className="detail-value">{tierDetails.limits.caseFileDrafting}</span>
                  </div>
                </div>
                
                {subscription?.tier !== 'enterprise' && (
                  <button className="upgrade-button" onClick={handleUpgradeClick}>
                    Upgrade Plan
                  </button>
                )}
                
                {subscription?.tier !== 'free' && subscription?.status !== 'canceled' && (
                  <button className="cancel-button">
                    Cancel Subscription
                  </button>
                )}
              </div>
            </div>
            
            {subscription?.tier !== 'free' && (
              <div className="payment-history">
                <h2>Payment History</h2>
                <table className="payment-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Invoice</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>May 1, 2025</td>
                      <td>₹{subscription?.tier === 'enterprise' ? '4,999' : '499'}</td>
                      <td>Paid</td>
                      <td><a href="#">Download</a></td>
                    </tr>
                    <tr>
                      <td>April 1, 2025</td>
                      <td>₹{subscription?.tier === 'enterprise' ? '4,999' : '499'}</td>
                      <td>Paid</td>
                      <td><a href="#">Download</a></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'usage' && (
          <div className="usage-tab">
            <h1>Usage Statistics</h1>
            
            {loading ? (
              <div className="loading">Loading usage statistics...</div>
            ) : (
              <>
                <div className="usage-stats">
                  <div className="stat-card">
                    <h3>Briefs Analyzed</h3>
                    <p className="stat-value">{usageStats.briefsAnalyzed}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Case Files Generated</h3>
                    <p className="stat-value">{usageStats.caseFilesGenerated}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Documents Downloaded</h3>
                    <p className="stat-value">{usageStats.documentsDownloaded}</p>
                  </div>
                  <div className="stat-card">
                    <h3>Searches Performed</h3>
                    <p className="stat-value">{usageStats.searchesPerformed}</p>
                  </div>
                </div>
                
                <div className="usage-limits">
                  <h2>Usage Limits</h2>
                  <div className="limit-item">
                    <span className="limit-label">Searches</span>
                    <div className="limit-bar">
                      <div 
                        className="limit-progress" 
                        style={{ 
                          width: `${Math.min(100, (usageStats.searchesPerformed / (subscription?.tier === 'free' ? 10 : subscription?.tier === 'pro' ? 50 : 1000)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="limit-text">
                      {usageStats.searchesPerformed} / {subscription?.tier === 'free' ? '10' : subscription?.tier === 'pro' ? '50' : 'Unlimited'} per day
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'history' && (
          <div className="history-tab">
            <h1>Activity History</h1>
            
            <div className="history-filters">
              <select defaultValue="all">
                <option value="all">All Activities</option>
                <option value="briefs">Brief Analyses</option>
                <option value="case_files">Case Files</option>
                <option value="downloads">Downloads</option>
              </select>
              
              <input type="date" />
            </div>
            
            <div className="history-list">
              <div className="history-item">
                <div className="history-icon brief"></div>
                <div className="history-details">
                  <h3>Brief Analysis</h3>
                  <p>Contract dispute between ABC Ltd. and XYZ Ltd.</p>
                  <span className="history-date">May 23, 2025 - 14:32</span>
                </div>
                <div className="history-actions">
                  <button>View</button>
                </div>
              </div>
              
              <div className="history-item">
                <div className="history-icon case-file"></div>
                <div className="history-details">
                  <h3>Case File Generated</h3>
                  <p>Petition - ABC Ltd. vs. XYZ Ltd.</p>
                  <span className="history-date">May 23, 2025 - 15:10</span>
                </div>
                <div className="history-actions">
                  <button>View</button>
                </div>
              </div>
              
              <div className="history-item">
                <div className="history-icon download"></div>
                <div className="history-details">
                  <h3>Document Downloaded</h3>
                  <p>Legal Analysis - PDF Format</p>
                  <span className="history-date">May 23, 2025 - 15:15</span>
                </div>
                <div className="history-actions">
                  <button>Download</button>
                </div>
              </div>
              
              <div className="history-item">
                <div className="history-icon brief"></div>
                <div className="history-details">
                  <h3>Brief Analysis</h3>
                  <p>Property dispute case</p>
                  <span className="history-date">May 22, 2025 - 10:45</span>
                </div>
                <div className="history-actions">
                  <button>View</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
