import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserProfile.css';

interface UserProfileProps {
  user: {
    id: string;
    email: string;
  };
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
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
    fetchUsageStats();
  }, []);
  
  const fetchUsageStats = async () => {
    setLoading(true);
    try {
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
  
  return (
    <div className="user-profile-container">
      <div className="profile-sidebar">
        <div className="user-info">
          <div className="user-avatar">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h3>{user.email}</h3>
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
          </div>
        )}
        
        {activeTab === 'usage' && (
          <div className="usage-tab">
            <h1>Usage Statistics</h1>
            
            {loading ? (
              <div className="loading">Loading usage statistics...</div>
            ) : (
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
