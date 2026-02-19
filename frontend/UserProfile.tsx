import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, updateUserProfile, fetchUserStats, fetchUserHistory } from './utils/api';
import './UserProfile.css';

interface UserProfileProps {
  user: {
    id: string;
    email: string;
  };
}

interface ProfileData {
  full_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  age?: number | string;
}

interface HistoryEntry {
  id: string;
  action: string;
  title: string;
  detail: string;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  brief_analyzed: 'Brief Analysis',
  case_file_generated: 'Case File Generated',
  document_downloaded: 'Document Downloaded',
  search_performed: 'Search Performed',
};

const ACTION_ICON_CLASS: Record<string, string> = {
  brief_analyzed: 'brief',
  case_file_generated: 'case-file',
  document_downloaded: 'download',
  search_performed: 'brief',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    + ' - ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  // --- Profile state ---
  const [profile, setProfile] = useState<ProfileData>({ email: user.email });
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // --- Stats state ---
  const [usageStats, setUsageStats] = useState({
    briefsAnalyzed: 0,
    caseFilesGenerated: 0,
    documentsDownloaded: 0,
    searchesPerformed: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // --- History state ---
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');

  // Load profile on mount
  useEffect(() => {
    setProfileLoading(true);
    fetchUserProfile()
      .then((p: ProfileData | null) => {
        if (p) setProfile({ ...p, email: p.email || user.email });
      })
      .catch(() => {/* first login – profile row doesn't exist yet */})
      .finally(() => setProfileLoading(false));
  }, [user.email]);

  // Load stats when tab opens
  useEffect(() => {
    if (activeTab === 'usage') {
      setStatsLoading(true);
      fetchUserStats()
        .then(setUsageStats)
        .catch(console.error)
        .finally(() => setStatsLoading(false));
    }
  }, [activeTab]);

  // Load history when tab opens or filter changes
  useEffect(() => {
    if (activeTab === 'history') {
      setHistoryLoading(true);
      const params: Record<string, any> = { limit: 50 };
      if (historyFilter !== 'all') params.action = historyFilter;
      fetchUserHistory(params)
        .then(setHistory)
        .catch(console.error)
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab, historyFilter]);

  // --- Profile handlers ---
  const handleProfileChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setProfileMsg(null);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateUserProfile({
        fullName: profile.full_name || '',
        email: profile.email || user.email,
        phone: profile.phone || '',
        address: profile.address || '',
        age: profile.age ? String(profile.age) : '',
      });
      setProfileMsg({ type: 'success', text: 'Profile saved successfully.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to save profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="user-profile-container">
      <div className="profile-sidebar">
        <div className="user-info">
          <div className="user-avatar">
            {(profile.full_name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <h3>{profile.full_name || user.email}</h3>
            {profile.full_name && <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{user.email}</span>}
          </div>
        </div>

        <nav className="profile-nav">
          {['profile', 'usage', 'history'].map(tab => (
            <button
              key={tab}
              className={`nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="profile-content">
        {/* ── Profile Tab ── */}
        {activeTab === 'profile' && (
          <div className="profile-tab">
            <h1>Profile Information</h1>

            {profileLoading ? (
              <div className="loading">Loading profile...</div>
            ) : (
              <div className="profile-form">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={user.email} readOnly />
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={profile.full_name || ''}
                    onChange={e => handleProfileChange('full_name', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={profile.phone || ''}
                    onChange={e => handleProfileChange('phone', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    placeholder="Enter your address"
                    value={profile.address || ''}
                    onChange={e => handleProfileChange('address', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    placeholder="Enter your age"
                    value={profile.age || ''}
                    onChange={e => handleProfileChange('age', e.target.value)}
                  />
                </div>

                {profileMsg && (
                  <div className={profileMsg.type === 'success' ? 'success-message' : 'error-message'}>
                    {profileMsg.text}
                  </div>
                )}

                <button
                  className="save-button"
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Usage Tab ── */}
        {activeTab === 'usage' && (
          <div className="usage-tab">
            <h1>Usage Statistics</h1>

            {statsLoading ? (
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

        {/* ── History Tab ── */}
        {activeTab === 'history' && (
          <div className="history-tab">
            <h1>Activity History</h1>

            <div className="history-filters">
              <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
                <option value="all">All Activities</option>
                <option value="brief_analyzed">Brief Analyses</option>
                <option value="case_file_generated">Case Files</option>
                <option value="document_downloaded">Downloads</option>
                <option value="search_performed">Searches</option>
              </select>
            </div>

            {historyLoading ? (
              <div className="loading">Loading activity history...</div>
            ) : history.length === 0 ? (
              <div className="loading" style={{ color: '#6b7280' }}>
                No activity recorded yet. Start by analyzing a legal brief!
              </div>
            ) : (
              <div className="history-list">
                {history.map(entry => (
                  <div className="history-item" key={entry.id}>
                    <div className={`history-icon ${ACTION_ICON_CLASS[entry.action] || 'brief'}`}></div>
                    <div className="history-details">
                      <h3>{ACTION_LABELS[entry.action] || entry.title}</h3>
                      <p>{entry.detail || '—'}</p>
                      <span className="history-date">{formatDate(entry.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
