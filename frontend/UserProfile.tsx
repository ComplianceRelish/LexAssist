import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserProfile, updateUserProfile, fetchUserStats, fetchUserHistory, fetchCaseDetail } from './utils/api';
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
  metadata?: { brief_id?: string };
  created_at: string;
}

interface CaseDetail {
  activity: any;
  brief: { id: string; title: string; content: string; created_at: string } | null;
  analysis: { id: string; analysis: any; law_sections: any; case_histories: any; created_at: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  brief_analyzed: 'Brief Analysis',
  ai_brief_analyzed: 'AI Brief Analysis',
  case_file_generated: 'Case File Generated',
  document_drafted: 'Document Drafted',
  document_downloaded: 'Document Downloaded',
  search_performed: 'Search Performed',
  ai_chat: 'AI Legal Chat',
};

const ACTION_ICON_CLASS: Record<string, string> = {
  brief_analyzed: 'brief',
  ai_brief_analyzed: 'brief',
  case_file_generated: 'case-file',
  document_drafted: 'case-file',
  document_downloaded: 'download',
  search_performed: 'brief',
  ai_chat: 'brief',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    + ' - ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/** Renders AI analysis JSON as structured readable sections */
const CaseAnalysisDisplay: React.FC<{ analysis: any }> = ({ analysis }) => {
  if (!analysis) return null;

  // The analysis may be the full merged result or just ai_analysis
  const ai = analysis.ai_analysis || analysis;
  const status = ai.status || analysis.status;

  if (status === 'error' || status === 'unavailable') {
    return <p className="case-no-data">Analysis was not available for this case.</p>;
  }

  const renderSection = (title: string, icon: string, content: any) => {
    if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) return null;
    if (Array.isArray(content) && content.length === 0) return null;

    return (
      <div className="case-analysis-section" key={title}>
        <h3>{icon} {title}</h3>
        {typeof content === 'string' ? (
          <p>{content}</p>
        ) : Array.isArray(content) ? (
          <ul>
            {content.map((item: any, i: number) => (
              <li key={i}>
                {typeof item === 'string' ? item : (
                  <div>
                    <strong>{item.title || item.section || item.name || item.case_name || ''}</strong>
                    {item.description && <span> — {item.description}</span>}
                    {item.relevance && <span className="case-relevance"> (Relevance: {item.relevance})</span>}
                    {item.citation && <span className="case-citation"> [{item.citation}]</span>}
                    {item.key_principle && <div className="case-principle">{item.key_principle}</div>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : typeof content === 'object' ? (
          <div className="case-analysis-obj">
            {Object.entries(content).map(([key, val]) => (
              <div key={key} className="case-kv">
                <strong>{key.replace(/_/g, ' ')}:</strong>{' '}
                <span>{typeof val === 'string' ? val : JSON.stringify(val)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="case-analysis-display">
      {renderSection('Case Summary', '📋', ai.case_summary)}
      {renderSection('Case Type & Jurisdiction', '⚖️', ai.case_type || ai.jurisdiction)}
      {renderSection('Key Issues', '🔑', ai.key_issues)}
      {renderSection('Applicable Statutes', '📜', ai.applicable_statutes || ai.statutes)}
      {renderSection('Relevant Precedents', '📚', ai.relevant_precedents || ai.precedents)}
      {renderSection('Legal Analysis', '🔍', ai.legal_analysis || ai.analysis_text)}
      {renderSection('Strategic Recommendations', '🎯', ai.strategic_recommendations || ai.recommendations)}
      {renderSection('Risk Assessment', '⚠️', ai.risk_assessment)}
      {renderSection('Strengths', '💪', ai.strengths)}
      {renderSection('Weaknesses', '🔻', ai.weaknesses)}
      {renderSection('Next Steps', '📝', ai.next_steps)}

      {/* Regex-extracted entities if present */}
      {analysis.entities && Object.keys(analysis.entities).length > 0 && (
        renderSection('Extracted Entities', '🏷️', analysis.entities)
      )}
    </div>
  );
};

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

  // --- Case detail state ---
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseError, setCaseError] = useState<string | null>(null);

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

  // --- Case detail handler ---
  const handleViewCase = async (entry: HistoryEntry) => {
    const hasBrief = entry.metadata?.brief_id;
    if (!hasBrief) {
      // No full case stored — just show what we have
      setSelectedCase({
        activity: entry,
        brief: null,
        analysis: null,
      });
      return;
    }
    setCaseLoading(true);
    setCaseError(null);
    try {
      const detail = await fetchCaseDetail(entry.id);
      setSelectedCase(detail);
    } catch (err: any) {
      setCaseError(err.message || 'Failed to load case');
    } finally {
      setCaseLoading(false);
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
            {/* ── Case Detail View ── */}
            {selectedCase ? (
              <div className="case-detail-view">
                <button className="case-back-btn" onClick={() => setSelectedCase(null)}>
                  ← Back to History
                </button>

                <div className="case-detail-header">
                  <h1>{selectedCase.activity?.title || 'Case Detail'}</h1>
                  <span className="history-date">{formatDate(selectedCase.activity?.created_at)}</span>
                </div>

                {/* Full Brief */}
                <div className="case-section">
                  <h2>📄 Full Case Brief</h2>
                  {selectedCase.brief?.content ? (
                    <div className="case-brief-content">
                      {selectedCase.brief.content}
                    </div>
                  ) : (
                    <p className="case-no-data">
                      {selectedCase.activity?.detail || 'Brief text not available for this entry.'}
                    </p>
                  )}
                </div>

                {/* Analysis Results */}
                {selectedCase.analysis?.analysis && (
                  <div className="case-section">
                    <h2>🔍 AI Analysis</h2>
                    <CaseAnalysisDisplay analysis={selectedCase.analysis.analysis} />
                  </div>
                )}

                {!selectedCase.brief && !selectedCase.analysis && (
                  <div className="case-section">
                    <p className="case-no-data">
                      Full case data is not available for older entries. New analyses will be saved automatically.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <h1>Activity History</h1>

                <div className="history-filters">
                  <select value={historyFilter} onChange={e => setHistoryFilter(e.target.value)}>
                    <option value="all">All Activities</option>
                    <option value="brief_analyzed">Brief Analyses</option>
                    <option value="ai_brief_analyzed">AI Brief Analyses</option>
                    <option value="case_file_generated">Case Files</option>
                    <option value="document_drafted">Documents Drafted</option>
                    <option value="document_downloaded">Downloads</option>
                    <option value="ai_chat">AI Chat Sessions</option>
                  </select>
                </div>

                {caseError && (
                  <div className="error-message" style={{ marginBottom: '1rem' }}>{caseError}</div>
                )}

                {historyLoading || caseLoading ? (
                  <div className="loading">{caseLoading ? 'Loading case details...' : 'Loading activity history...'}</div>
                ) : history.length === 0 ? (
                  <div className="loading" style={{ color: '#6b7280' }}>
                    No activity recorded yet. Start by analyzing a legal brief!
                  </div>
                ) : (
                  <div className="history-list">
                    {history.map(entry => {
                      const isCase = ['brief_analyzed', 'ai_brief_analyzed'].includes(entry.action);
                      return (
                        <div
                          className={`history-item ${isCase ? 'history-item-clickable' : ''}`}
                          key={entry.id}
                          onClick={isCase ? () => handleViewCase(entry) : undefined}
                          title={isCase ? 'Click to view full case' : undefined}
                        >
                          <div className={`history-icon ${ACTION_ICON_CLASS[entry.action] || 'brief'}`}></div>
                          <div className="history-details">
                            <h3>{ACTION_LABELS[entry.action] || entry.title}</h3>
                            <p>{entry.detail || '—'}</p>
                            <span className="history-date">{formatDate(entry.created_at)}</span>
                          </div>
                          {isCase && (
                            <div className="history-view-btn">View →</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
