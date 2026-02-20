import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchCases,
  fetchCaseDiary,
  createCase,
  updateCase,
  addCaseEntry,
} from './utils/api';
import './MyCases.css';

interface CaseSummary {
  id: string;
  title: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface TimelineEntry {
  type: string;
  brief_id: string;
  title: string;
  content: string;
  created_at: string;
  analyses: any[];
}

interface CaseDiaryData {
  case: CaseSummary;
  timeline: TimelineEntry[];
  activities: any[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }) + ' — ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'status-active' },
  closed: { label: 'Closed', className: 'status-closed' },
  archived: { label: 'Archived', className: 'status-archived' },
};

// ── Analysis renderer ──
const AnalysisDisplay: React.FC<{ analysis: any }> = ({ analysis }) => {
  if (!analysis) return null;
  const ai = analysis.ai_analysis || analysis;

  const renderSection = (title: string, icon: string, content: any) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return null;
    if (typeof content === 'object' && !Array.isArray(content) && Object.keys(content).length === 0) return null;

    return (
      <div className="diary-analysis-section" key={title}>
        <h4>{icon} {title}</h4>
        {typeof content === 'string' ? (
          <p>{content}</p>
        ) : Array.isArray(content) ? (
          <ul>
            {content.map((item: any, i: number) => (
              <li key={i}>
                {typeof item === 'string' ? item : (
                  <>
                    <strong>{item.title || item.section || item.name || item.case_name || ''}</strong>
                    {item.description && <span> — {item.description}</span>}
                    {item.relevance && <span className="text-muted"> (Relevance: {item.relevance})</span>}
                    {item.citation && <span className="text-link"> [{item.citation}]</span>}
                    {item.key_principle && <div className="text-principle">{item.key_principle}</div>}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : typeof content === 'object' ? (
          <div className="analysis-kv-list">
            {Object.entries(content).map(([key, val]) => (
              <div key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {typeof val === 'string' ? val : JSON.stringify(val)}</div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="diary-analysis-body">
      {renderSection('Case Summary', '📋', ai.case_summary)}
      {renderSection('Key Issues', '🔑', ai.key_issues)}
      {renderSection('Applicable Statutes', '📜', ai.applicable_statutes || ai.statutes)}
      {renderSection('Relevant Precedents', '📚', ai.relevant_precedents || ai.precedents)}
      {renderSection('Legal Analysis', '🔍', ai.legal_analysis || ai.analysis_text)}
      {renderSection('Strategic Recommendations', '🎯', ai.strategic_recommendations || ai.recommendations)}
      {renderSection('Risk Assessment', '⚠️', ai.risk_assessment)}
      {renderSection('Strengths', '💪', ai.strengths)}
      {renderSection('Weaknesses', '🔻', ai.weaknesses)}
      {renderSection('Next Steps', '📝', ai.next_steps)}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

const MyCases: React.FC = () => {
  // ── List view state ──
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewCase, setShowNewCase] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Detail view state ──
  const [diary, setDiary] = useState<CaseDiaryData | null>(null);
  const [diaryLoading, setDiaryLoading] = useState(false);

  // ── Add entry state ──
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [runAnalysis, setRunAnalysis] = useState(true);
  const [addingEntry, setAddingEntry] = useState(false);

  // ── Notes editing state ──
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // ── Error state ──
  const [error, setError] = useState<string | null>(null);

  // ── Load cases ──
  const loadCases = useCallback(async () => {
    setCasesLoading(true);
    setError(null);
    try {
      const data = await fetchCases(statusFilter || undefined);
      setCases(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCasesLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadCases(); }, [loadCases]);

  // ── Create new case ──
  const handleCreateCase = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createCase(newTitle.trim());
      setNewTitle('');
      setShowNewCase(false);
      loadCases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Open case diary ──
  const handleOpenCase = async (caseId: string) => {
    setDiaryLoading(true);
    setError(null);
    try {
      const data = await fetchCaseDiary(caseId);
      setDiary(data);
      setNotesText(data.case?.notes || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDiaryLoading(false);
    }
  };

  // ── Back to list ──
  const handleBack = () => {
    setDiary(null);
    setShowAddEntry(false);
    setEditingNotes(false);
    loadCases();
  };

  // ── Add entry to case ──
  const handleAddEntry = async () => {
    if (!entryText.trim() || !diary) return;
    setAddingEntry(true);
    try {
      await addCaseEntry(diary.case.id, entryText.trim(), runAnalysis);
      setEntryText('');
      setShowAddEntry(false);
      // Reload the diary
      handleOpenCase(diary.case.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingEntry(false);
    }
  };

  // ── Save notes ──
  const handleSaveNotes = async () => {
    if (!diary) return;
    setSavingNotes(true);
    try {
      await updateCase(diary.case.id, { notes: notesText });
      setDiary({
        ...diary,
        case: { ...diary.case, notes: notesText },
      });
      setEditingNotes(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  // ── Update status ──
  const handleStatusChange = async (newStatus: string) => {
    if (!diary) return;
    try {
      await updateCase(diary.case.id, { status: newStatus });
      setDiary({
        ...diary,
        case: { ...diary.case, status: newStatus },
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Case Diary Detail View
  // ═══════════════════════════════════════════════════════════════
  if (diary) {
    const c = diary.case;
    const badge = STATUS_BADGE[c.status] || STATUS_BADGE.active;

    return (
      <div className="mycases-container">
        <div className="diary-view">
          {/* Header */}
          <div className="diary-header">
            <button className="diary-back-btn" onClick={handleBack}>← My Cases</button>
            <div className="diary-title-row">
              <h1>{c.title}</h1>
              <span className={`status-badge ${badge.className}`}>{badge.label}</span>
            </div>
            <div className="diary-meta">
              <span>Created {formatDate(c.created_at)}</span>
              <span className="diary-meta-sep">•</span>
              <span>Last updated {relativeDate(c.updated_at)}</span>
            </div>
          </div>

          {error && <div className="diary-error">{error}</div>}

          {/* Action Bar */}
          <div className="diary-actions">
            <button className="diary-btn diary-btn-primary" onClick={() => setShowAddEntry(!showAddEntry)}>
              {showAddEntry ? '✕ Cancel' : '+ Add New Entry'}
            </button>
            <button className="diary-btn diary-btn-secondary" onClick={() => setEditingNotes(!editingNotes)}>
              {editingNotes ? '✕ Cancel Notes' : '📝 Case Notes'}
            </button>
            <select
              className="diary-status-select"
              value={c.status}
              onChange={e => handleStatusChange(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Add Entry Form */}
          {showAddEntry && (
            <div className="diary-add-entry">
              <h3>Add New Entry to Case</h3>
              <textarea
                placeholder="Enter new case developments, updated brief, new facts, or additional instructions..."
                value={entryText}
                onChange={e => setEntryText(e.target.value)}
                rows={6}
              />
              <div className="diary-add-entry-footer">
                <label className="diary-checkbox">
                  <input
                    type="checkbox"
                    checked={runAnalysis}
                    onChange={e => setRunAnalysis(e.target.checked)}
                  />
                  Run AI Analysis on this entry
                </label>
                <button
                  className="diary-btn diary-btn-primary"
                  onClick={handleAddEntry}
                  disabled={addingEntry || !entryText.trim()}
                >
                  {addingEntry ? 'Processing...' : 'Submit Entry'}
                </button>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {editingNotes && (
            <div className="diary-notes-section">
              <h3>📝 Case Notes</h3>
              <textarea
                placeholder="Add general notes about this case..."
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                rows={4}
              />
              <button
                className="diary-btn diary-btn-primary"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                style={{ marginTop: '0.5rem' }}
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          )}
          {!editingNotes && c.notes && (
            <div className="diary-notes-display">
              <strong>📝 Notes:</strong> {c.notes}
            </div>
          )}

          {/* Timeline */}
          <div className="diary-timeline">
            <h2>Case Timeline</h2>
            {diaryLoading ? (
              <div className="diary-loading">Loading case diary...</div>
            ) : diary.timeline.length === 0 ? (
              <div className="diary-empty">
                No entries yet. Click <strong>+ Add New Entry</strong> to begin building this case diary.
              </div>
            ) : (
              <div className="timeline-list">
                {diary.timeline.map((entry, idx) => (
                  <div className="timeline-entry" key={entry.brief_id || idx}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-card">
                      <div className="timeline-card-header">
                        <span className="timeline-type-badge">
                          {entry.analyses.length > 0 ? '🔍 Analysis' : '📄 Brief'}
                        </span>
                        <span className="timeline-date">{formatDate(entry.created_at)}</span>
                      </div>

                      {/* Brief content (collapsible) */}
                      <BriefSection content={entry.content} />

                      {/* Analysis results */}
                      {entry.analyses.map((a: any, aIdx: number) => (
                        <div className="timeline-analysis" key={a.id || aIdx}>
                          <div className="timeline-analysis-badge">AI Analysis Result</div>
                          <AnalysisDisplay analysis={a.analysis} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Cases List View
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="mycases-container">
      <div className="mycases-header">
        <h1>📁 My Case Diaries</h1>
        <p>All your legal cases in one place. Click on a case to view its full diary.</p>
      </div>

      {error && <div className="diary-error">{error}</div>}

      {/* Controls */}
      <div className="mycases-controls">
        <select
          className="mycases-filter"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Cases</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="archived">Archived</option>
        </select>

        <button className="diary-btn diary-btn-primary" onClick={() => setShowNewCase(!showNewCase)}>
          {showNewCase ? '✕ Cancel' : '+ New Case'}
        </button>
      </div>

      {/* New Case Form */}
      {showNewCase && (
        <div className="mycases-new-form">
          <input
            type="text"
            placeholder="Enter case title (e.g. Smith vs. Jones Property Dispute)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateCase()}
          />
          <button
            className="diary-btn diary-btn-primary"
            onClick={handleCreateCase}
            disabled={creating || !newTitle.trim()}
          >
            {creating ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      )}

      {/* Cases Grid */}
      {casesLoading ? (
        <div className="diary-loading">Loading your cases...</div>
      ) : cases.length === 0 ? (
        <div className="mycases-empty">
          <div className="mycases-empty-icon">📂</div>
          <h3>No cases found</h3>
          <p>
            {statusFilter
              ? `No ${statusFilter} cases. Try a different filter or create a new case.`
              : 'Your case diaries will appear here. Analyze a brief to auto-create one, or click "+ New Case" to start manually.'}
          </p>
        </div>
      ) : (
        <div className="mycases-grid">
          {cases.map(c => {
            const badge = STATUS_BADGE[c.status] || STATUS_BADGE.active;
            return (
              <div
                className="case-card"
                key={c.id}
                onClick={() => handleOpenCase(c.id)}
              >
                <div className="case-card-top">
                  <span className={`status-badge ${badge.className}`}>{badge.label}</span>
                  <span className="case-card-date">{relativeDate(c.updated_at)}</span>
                </div>
                <h3 className="case-card-title">{c.title}</h3>
                {c.notes && <p className="case-card-notes">{c.notes.slice(0, 120)}{c.notes.length > 120 ? '...' : ''}</p>}
                <div className="case-card-footer">
                  <span>Created {relativeDate(c.created_at)}</span>
                  <span className="case-card-arrow">→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


// ── Collapsible brief section ──
const BriefSection: React.FC<{ content: string }> = ({ content }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 400;

  return (
    <div className="brief-section">
      <div className={`brief-text ${expanded ? 'expanded' : ''}`}>
        {expanded || !isLong ? content : content.slice(0, 400) + '...'}
      </div>
      {isLong && (
        <button className="brief-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less ▲' : 'Read full brief ▼'}
        </button>
      )}
    </div>
  );
};

export default MyCases;
