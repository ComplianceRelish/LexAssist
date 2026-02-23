import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  fetchCases,
  fetchCaseDiary,
  createCase,
  updateCase,
  addCaseEntry,
  deleteCase,
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from './utils/api';
import ResponseTabs from './ResponseTabs';
import './MyCases.css';

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface CaseFolder {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
}

interface CaseSummary {
  id: string;
  title: string;
  status: string;
  notes: string;
  folder_id: string | null;
  case_type: string;
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

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

const CASE_TYPES: Record<string, string> = {
  '': 'Not Set',
  civil: 'Civil',
  criminal: 'Criminal',
  family: 'Family',
  property: 'Property',
  corporate: 'Corporate',
  tax: 'Tax',
  constitutional: 'Constitutional',
  labour: 'Labour',
  consumer: 'Consumer',
  arbitration: 'Arbitration',
  ip: 'Intellectual Property',
  other: 'Other',
};

const FOLDER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

type GroupBy = 'none' | 'folder' | 'month' | 'status' | 'type';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'status-active' },
  closed: { label: 'Closed', className: 'status-closed' },
  archived: { label: 'Archived', className: 'status-archived' },
};

/* ═══════════════════════════════════════════════════════════════════
   Case Diary Export Helpers
   ═══════════════════════════════════════════════════════════════════ */

/** Escape HTML entities */
function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convert markdown-like text to basic HTML */
function mdToHtml(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code style="background:#f1f5f9;padding:1px 5px;border-radius:3px;font-size:0.85em;font-family:monospace;">$1</code>')
    .replace(/^### (.+)$/gm, '<h4 style="color:#1e40af;margin:10px 0 4px;">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="color:#0a2e5c;margin:12px 0 6px;">$1</h3>')
    .replace(/^[-*] (.+)$/gm, '<li style="margin-left:24px;margin-bottom:3px;">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin-left:24px;margin-bottom:3px;">$2</li>')
    .replace(/\n/g, '<br/>');
}

/** Flatten analysis object into readable text sections */
function analysisToHtml(a: any): string {
  if (!a) return '';
  const stored = a;
  const parts: string[] = [];

  // Summary
  const summary = stored.analysis?.summary || stored.brief_summary || '';
  if (summary) {
    parts.push(`<div class="analysis-section"><h4>Summary</h4><p>${mdToHtml(summary)}</p></div>`);
  }

  // Arguments
  const args = stored.analysis?.arguments || [];
  if (args.length) {
    parts.push(`<div class="analysis-section"><h4>Key Arguments</h4><ul>${args.map((a: any) => `<li><strong>${esc(a.point || a.title || '')}</strong>: ${esc(a.detail || a.explanation || '')}</li>`).join('')}</ul></div>`);
  }

  // Statutes
  const statutes = stored.statutes_regex || stored.statutes || [];
  if (statutes.length) {
    parts.push(`<div class="analysis-section"><h4>Applicable Statutes</h4><ul>${statutes.map((s: any) => {
      const name = s.full_name || s.short_name || s.act || 'Statute';
      const secs = (s.sections || []).join(', ');
      return `<li><strong>${esc(name)}</strong>${secs ? ' — Section(s) ' + esc(secs) : ''}</li>`;
    }).join('')}</ul></div>`);
  }

  // Precedents
  const precedents = stored.precedents_kanoon || stored.precedents || [];
  if (precedents.length) {
    parts.push(`<div class="analysis-section"><h4>Case Precedents</h4><ul>${precedents.map((p: any) => {
      const title = p.title || p.citation || 'Case';
      const headline = p.headline || '';
      return `<li><strong>${esc(title)}</strong>${headline ? '<br/><em>' + esc(headline) + '</em>' : ''}</li>`;
    }).join('')}</ul></div>`);
  }

  // Recommendations
  const recs = stored.analysis?.recommendations || [];
  if (recs.length) {
    parts.push(`<div class="analysis-section"><h4>Recommendations</h4><ul>${recs.map((r: any) => `<li>${esc(typeof r === 'string' ? r : r.text || r.recommendation || JSON.stringify(r))}</li>`).join('')}</ul></div>`);
  }

  // Challenges
  const challenges = stored.analysis?.challenges || [];
  if (challenges.length) {
    parts.push(`<div class="analysis-section"><h4>Challenges & Risks</h4><ul>${challenges.map((ch: any) => `<li>${esc(typeof ch === 'string' ? ch : ch.text || ch.challenge || JSON.stringify(ch))}</li>`).join('')}</ul></div>`);
  }

  return parts.join('\n');
}

/** Copy case diary to clipboard as formatted text */
async function copyCaseDiary(diary: CaseDiaryData): Promise<boolean> {
  const c = diary.case;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const cType = CASE_TYPES[c.case_type] || c.case_type || 'Not Set';

  let text = `LEXASSIST — CASE DIARY\n${'═'.repeat(50)}\n\n`;
  text += `Case Title:  ${c.title}\n`;
  text += `Status:      ${(STATUS_BADGE[c.status] || STATUS_BADGE.active).label}\n`;
  text += `Case Type:   ${cType}\n`;
  text += `Created:     ${new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}\n`;
  text += `Last Updated: ${new Date(c.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}\n`;
  if (c.notes) text += `Notes:       ${c.notes}\n`;
  text += `\n${'─'.repeat(50)}\n\n`;

  text += `CASE TIMELINE (${diary.timeline.length} entries)\n${'─'.repeat(50)}\n\n`;

  diary.timeline.forEach((entry, idx) => {
    const entryDate = new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const entryTime = new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    text += `[${idx + 1}] ${entry.analyses.length > 0 ? '🔍 Analysis' : '📄 Brief'}  —  ${entryDate} at ${entryTime}\n`;
    text += `${'- '.repeat(20)}\n`;
    text += `${entry.content}\n`;

    entry.analyses.forEach((a: any) => {
      const analysis = a.analysis || {};
      const summary = analysis.summary || analysis.brief_summary || '';
      if (summary) text += `\n--- AI Analysis ---\n${summary}\n`;

      const statutes = analysis.statutes_regex || analysis.statutes || [];
      if (statutes.length) {
        text += `\nStatutes: ${statutes.map((s: any) => (s.full_name || s.act || '') + (s.sections?.length ? ' §' + s.sections.join(', ') : '')).join('; ')}\n`;
      }

      const precedents = analysis.precedents_kanoon || analysis.precedents || [];
      if (precedents.length) {
        text += `\nPrecedents: ${precedents.map((p: any) => p.title || p.citation || '').join('; ')}\n`;
      }
    });

    text += `\n\n`;
  });

  text += `${'═'.repeat(50)}\n`;
  text += `Generated by LexAssist AI • ${dateStr}\n`;
  text += `https://lex-assist.vercel.app\n`;

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Export case diary as a self-contained HTML document */
function exportCaseDiaryAsDocument(diary: CaseDiaryData) {
  const c = diary.case;
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const createdStr = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const updatedStr = new Date(c.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const cType = CASE_TYPES[c.case_type] || c.case_type || 'Not Set';
  const badge = STATUS_BADGE[c.status] || STATUS_BADGE.active;

  const timelineHtml = diary.timeline.map((entry, idx) => {
    const entryDate = new Date(entry.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const entryTime = new Date(entry.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const isAnalysis = entry.analyses.length > 0;

    const analysesHtml = entry.analyses.map((a: any) => `
      <div class="analysis-block">
        <div class="analysis-badge">⚖️ AI Analysis Result</div>
        ${analysisToHtml(a.analysis)}
      </div>
    `).join('');

    return `
      <div class="timeline-entry">
        <div class="timeline-dot-line">
          <div class="dot ${isAnalysis ? 'analysis' : 'brief'}"></div>
          ${idx < diary.timeline.length - 1 ? '<div class="line"></div>' : ''}
        </div>
        <div class="timeline-content">
          <div class="entry-header">
            <span class="entry-badge ${isAnalysis ? 'analysis' : 'brief'}">${isAnalysis ? '🔍 Analysis' : '📄 Brief'}</span>
            <span class="entry-date">${entryDate} at ${entryTime}</span>
          </div>
          <div class="entry-body">${mdToHtml(entry.content)}</div>
          ${analysesHtml}
        </div>
      </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Case Diary — ${esc(c.title)} (${dateStr})</title>
<style>
  @page { margin: 18mm 16mm; size: A4; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; line-height: 1.65; background: #fff; }
  .doc { max-width: 820px; margin: 0 auto; padding: 32px 24px; }

  /* Letterhead */
  .header { text-align: center; border-bottom: 3px double #0a2e5c; padding-bottom: 18px; margin-bottom: 28px; }
  .header h1 { font-size: 1.5rem; color: #0a2e5c; letter-spacing: 1px; margin-bottom: 4px; }
  .header .subtitle { font-size: 0.85rem; color: #6b7280; font-style: italic; }

  /* Case Info Box */
  .case-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px; margin-bottom: 28px; }
  .case-title { font-size: 1.35rem; color: #0a2e5c; font-weight: 700; margin-bottom: 10px; }
  .case-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px 24px; font-size: 0.85rem; }
  .case-meta-item { display: flex; gap: 8px; }
  .case-meta-label { color: #6b7280; font-weight: 600; min-width: 90px; }
  .case-meta-value { color: #1a1a1a; }
  .status-pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 600; }
  .status-active { background: #dcfce7; color: #166534; }
  .status-closed { background: #fee2e2; color: #991b1b; }
  .status-archived { background: #e5e7eb; color: #374151; }
  .notes-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px 14px; margin-top: 12px; font-size: 0.85rem; color: #92400e; }

  /* Timeline */
  .timeline-title { font-size: 1.1rem; color: #0a2e5c; font-weight: 700; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  .timeline-entry { display: flex; gap: 16px; margin-bottom: 0; page-break-inside: avoid; }
  .timeline-dot-line { display: flex; flex-direction: column; align-items: center; width: 20px; flex-shrink: 0; }
  .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
  .dot.analysis { background: #7c3aed; }
  .dot.brief { background: #0a2e5c; }
  .line { width: 2px; flex: 1; background: #d1d5db; margin-top: 4px; }
  .timeline-content { flex: 1; padding-bottom: 24px; }
  .entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px; }
  .entry-badge { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 12px; letter-spacing: 0.3px; }
  .entry-badge.analysis { background: #f3e8ff; color: #6d28d9; }
  .entry-badge.brief { background: #eff6ff; color: #1d4ed8; }
  .entry-date { font-size: 0.78rem; color: #9ca3af; }
  .entry-body { padding: 14px 18px; background: #fafafa; border-left: 3px solid #d1d5db; border-radius: 6px; font-size: 0.88rem; margin-bottom: 10px; }

  /* Analysis blocks */
  .analysis-block { background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px; padding: 14px 18px; margin-top: 10px; }
  .analysis-badge { font-size: 0.75rem; font-weight: 700; color: #7c3aed; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px; }
  .analysis-section { margin-bottom: 12px; }
  .analysis-section h4 { color: #4c1d95; font-size: 0.88rem; margin-bottom: 4px; }
  .analysis-section ul { padding-left: 24px; font-size: 0.84rem; }
  .analysis-section li { margin-bottom: 4px; }
  .analysis-section p { font-size: 0.84rem; }

  /* Footer */
  .footer { border-top: 2px solid #e5e7eb; margin-top: 32px; padding-top: 14px; text-align: center; font-size: 0.72rem; color: #9ca3af; }
  .footer .brand { font-weight: 700; color: #0a2e5c; }

  /* Print adjustments */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .doc { padding: 0; }
    .no-print { display: none !important; }
  }

  /* Action bar */
  .actions { display: flex; gap: 10px; justify-content: center; margin-bottom: 24px; flex-wrap: wrap; }
  .actions button { padding: 10px 22px; border: none; border-radius: 8px; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-print { background: #0a2e5c; color: #fff; }
  .btn-print:hover { background: #143d7a; }
  .btn-copy { background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; }
  .btn-copy:hover { background: #e5e7eb; }
</style>
</head>
<body>
<div class="doc">
  <div class="actions no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="btn-copy" onclick="copyAll()">📋 Copy Text</button>
  </div>

  <div class="header">
    <h1>⚖️ LexAssist AI</h1>
    <div class="subtitle">Case Diary — AI-Powered Legal Research & Case Drafting</div>
  </div>

  <div class="case-info">
    <div class="case-title">${esc(c.title)}</div>
    <div class="case-meta-grid">
      <div class="case-meta-item">
        <span class="case-meta-label">Status</span>
        <span class="case-meta-value"><span class="status-pill status-${c.status}">${badge.label}</span></span>
      </div>
      <div class="case-meta-item">
        <span class="case-meta-label">Case Type</span>
        <span class="case-meta-value">${esc(cType)}</span>
      </div>
      <div class="case-meta-item">
        <span class="case-meta-label">Created</span>
        <span class="case-meta-value">${createdStr}</span>
      </div>
      <div class="case-meta-item">
        <span class="case-meta-label">Last Updated</span>
        <span class="case-meta-value">${updatedStr}</span>
      </div>
      <div class="case-meta-item">
        <span class="case-meta-label">Entries</span>
        <span class="case-meta-value">${diary.timeline.length}</span>
      </div>
    </div>
    ${c.notes ? `<div class="notes-box">📝 <strong>Notes:</strong> ${esc(c.notes)}</div>` : ''}
  </div>

  <div class="timeline-title">📋 Case Timeline (${diary.timeline.length} entries)</div>
  ${timelineHtml}

  <div class="footer">
    <p><span class="brand">LexAssist AI</span> — Case Diary Export</p>
    <p>Generated on ${dateStr} at ${timeStr}</p>
    <p>AI outputs are advisory only and do not constitute legal advice.</p>
    <p>&copy; ${new Date().getFullYear()} LexAssist &bull; <a href="https://lex-assist.vercel.app">lex-assist.vercel.app</a></p>
  </div>
</div>
<script>
function copyAll(){
  const info = document.querySelector('.case-info')?.textContent || '';
  const entries = document.querySelectorAll('.timeline-content');
  let text = 'LEXASSIST — CASE DIARY\\n${'═'.repeat(50)}\\n\\n';
  text += info.trim() + '\\n\\n';
  entries.forEach((el, i) => {
    const header = el.querySelector('.entry-header')?.textContent || '';
    const body = el.querySelector('.entry-body')?.textContent || '';
    text += '[' + (i+1) + '] ' + header.trim() + '\\n' + body.trim() + '\\n\\n';
    el.querySelectorAll('.analysis-block').forEach(ab => {
      text += '--- AI Analysis ---\\n' + ab.textContent?.trim() + '\\n\\n';
    });
  });
  text += '${'═'.repeat(50)}\\nGenerated by LexAssist AI\\nhttps://lex-assist.vercel.app\\n';
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.btn-copy');
    if(btn){btn.textContent='✅ Copied!';setTimeout(()=>{btn.textContent='📋 Copy Text';},2000);}
  });
}
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
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

function monthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/* ═══════════════════════════════════════════════════════════════════
   Analysis Display (reuses ResponseTabs)
   ═══════════════════════════════════════════════════════════════════ */

const AnalysisDisplay: React.FC<{ analysis: any }> = ({ analysis }) => {
  if (!analysis) return null;
  const stored = analysis;
  const lawSections = (stored.statutes_regex || stored.statutes || []).map((s: any, i: number) => ({
    title: s.full_name || s.short_name || s.act || `Statute ${i + 1}`,
    sectionNumber: (s.sections || []).join(', ') || 'N/A',
    content: `${s.full_name || s.short_name || s.act || ''}${s.sections?.length ? ' — Section(s) ' + s.sections.join(', ') : ''}`,
    relevance: s.relevance === 'high' ? 9 : s.relevance === 'medium' ? 6 : 4,
  }));
  const caseHistories = (stored.precedents_kanoon || stored.precedents || []).map((p: any) => ({
    citation: p.citation || p.doc_id || '',
    parties: p.title || '',
    holdings: p.headline || 'View full judgment on Indian Kanoon',
    relevance: 7,
    date: '',
  }));
  const summaryText = stored.analysis?.summary || stored.brief_summary || '';
  const analysisObj = stored.analysis || {
    summary: summaryText, arguments: [], challenges: [], recommendations: [],
  };
  return (
    <div className="diary-tabbed-analysis">
      <ResponseTabs
        lawSections={lawSections}
        caseHistories={caseHistories}
        analysis={analysisObj}
        aiAnalysis={stored}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   Collapsible Brief Section
   ═══════════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

const MyCases: React.FC = () => {
  // ── Folders state ──
  const [folders, setFolders] = useState<CaseFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderColor, setEditFolderColor] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Drag & Drop state ──
  const [draggedCaseId, setDraggedCaseId] = useState<string | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);

  // ── List view state ──
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [showNewCase, setShowNewCase] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseType, setNewCaseType] = useState('');
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

  // ── Error / Delete state ──
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Share menu state ──
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Load folders ──
  const loadFolders = useCallback(async () => {
    try {
      const data = await fetchFolders();
      setFolders(data || []);
    } catch (err: any) {
      console.error('Load folders error:', err);
    }
  }, []);

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

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadCases(); }, [loadCases]);

  // ── Filtered & grouped cases ──
  const filteredCases = useMemo(() => {
    let list = [...cases];
    if (selectedFolder === 'unfiled') {
      list = list.filter(c => !c.folder_id);
    } else if (selectedFolder !== 'all') {
      list = list.filter(c => c.folder_id === selectedFolder);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [cases, selectedFolder, searchQuery]);

  const groupedCases = useMemo(() => {
    if (groupBy === 'none') return null;
    const groups: Record<string, CaseSummary[]> = {};
    for (const c of filteredCases) {
      let key: string;
      switch (groupBy) {
        case 'folder': {
          if (!c.folder_id) {
            key = '📂 Unfiled';
          } else {
            const f = folders.find(fl => fl.id === c.folder_id);
            key = f ? `📁 ${f.name}` : '📂 Unfiled';
          }
          break;
        }
        case 'month':
          key = monthKey(c.updated_at);
          break;
        case 'status':
          key = (STATUS_BADGE[c.status]?.label || c.status).toUpperCase();
          break;
        case 'type':
          key = CASE_TYPES[c.case_type || ''] || 'Not Set';
          break;
        default:
          key = 'All';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return groups;
  }, [filteredCases, groupBy, folders]);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cases.length, unfiled: 0 };
    for (const c of cases) {
      if (!c.folder_id) {
        counts.unfiled++;
      } else {
        counts[c.folder_id] = (counts[c.folder_id] || 0) + 1;
      }
    }
    return counts;
  }, [cases]);

  // ═══════════════════════════════════════════════════════════════
  // Folder handlers
  // ═══════════════════════════════════════════════════════════════

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await createFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName('');
      setNewFolderColor('#3b82f6');
      setShowNewFolder(false);
      loadFolders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleUpdateFolder = async (folderId: string) => {
    if (!editFolderName.trim()) return;
    try {
      await updateFolder(folderId, { name: editFolderName.trim(), color: editFolderColor });
      setEditingFolder(null);
      loadFolders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      if (selectedFolder === folderId) setSelectedFolder('all');
      loadFolders();
      loadCases();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Drag & Drop handlers
  // ═══════════════════════════════════════════════════════════════

  const handleDragStart = (e: React.DragEvent, caseId: string) => {
    setDraggedCaseId(caseId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', caseId);
    (e.target as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedCaseId(null);
    setDropTargetFolder(null);
    (e.target as HTMLElement).classList.remove('dragging');
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetFolder(folderId);
  };

  const handleDragLeave = () => {
    setDropTargetFolder(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDropTargetFolder(null);
    const caseId = e.dataTransfer.getData('text/plain') || draggedCaseId;
    if (!caseId) return;
    try {
      await updateCase(caseId, { folder_id: targetFolderId });
      loadCases();
    } catch (err: any) {
      setError(err.message);
    }
    setDraggedCaseId(null);
  };

  // ═══════════════════════════════════════════════════════════════
  // Case handlers
  // ═══════════════════════════════════════════════════════════════

  const handleCreateCase = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const folderId = selectedFolder !== 'all' && selectedFolder !== 'unfiled' ? selectedFolder : undefined;
      await createCase(newTitle.trim(), '', folderId, newCaseType || undefined);
      setNewTitle('');
      setNewCaseType('');
      setShowNewCase(false);
      loadCases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ── Share handlers ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  const handleExportDiary = () => {
    if (!diary) return;
    setShowShareMenu(false);
    exportCaseDiaryAsDocument(diary);
  };

  const handleCopyDiary = async () => {
    if (!diary) return;
    const ok = await copyCaseDiary(diary);
    setCopySuccess(ok);
    setShowShareMenu(false);
    if (ok) setTimeout(() => setCopySuccess(false), 2500);
  };

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

  const handleBack = () => {
    setDiary(null);
    setShowAddEntry(false);
    setEditingNotes(false);
    loadCases();
  };

  const handleAddEntry = async () => {
    if (!entryText.trim() || !diary) return;
    setAddingEntry(true);
    try {
      await addCaseEntry(diary.case.id, entryText.trim(), runAnalysis);
      setEntryText('');
      setShowAddEntry(false);
      handleOpenCase(diary.case.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingEntry(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!diary) return;
    setSavingNotes(true);
    try {
      await updateCase(diary.case.id, { notes: notesText });
      setDiary({ ...diary, case: { ...diary.case, notes: notesText } });
      setEditingNotes(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!diary) return;
    try {
      await updateCase(diary.case.id, { status: newStatus });
      setDiary({ ...diary, case: { ...diary.case, status: newStatus } });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    setDeleting(true);
    setError(null);
    try {
      await deleteCase(caseId);
      setDeleteConfirm(null);
      if (diary) setDiary(null);
      loadCases();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCaseTypeChange = async (caseId: string, newType: string) => {
    try {
      await updateCase(caseId, { case_type: newType });
      if (diary) {
        setDiary({ ...diary, case: { ...diary.case, case_type: newType } });
      }
      loadCases();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMoveCaseToFolder = async (caseId: string, folderId: string | null) => {
    try {
      await updateCase(caseId, { folder_id: folderId });
      if (diary) {
        setDiary({ ...diary, case: { ...diary.case, folder_id: folderId } });
      }
      loadCases();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // Case card renderer
  // ═══════════════════════════════════════════════════════════════

  const renderCaseCard = (c: CaseSummary) => {
    const badge = STATUS_BADGE[c.status] || STATUS_BADGE.active;
    const folder = c.folder_id ? folders.find(f => f.id === c.folder_id) : null;

    return (
      <div
        className={`case-card ${draggedCaseId === c.id ? 'dragging' : ''}`}
        key={c.id}
        draggable
        onDragStart={e => handleDragStart(e, c.id)}
        onDragEnd={handleDragEnd}
        onClick={() => handleOpenCase(c.id)}
      >
        <div className="case-card-top">
          <div className="case-card-badges">
            <span className={`status-badge ${badge.className}`}>{badge.label}</span>
            {c.case_type && (
              <span className="case-type-badge">{CASE_TYPES[c.case_type] || c.case_type}</span>
            )}
          </div>
          <span className="case-card-date">{relativeDate(c.updated_at)}</span>
        </div>
        <h3 className="case-card-title">{c.title}</h3>
        {folder && (
          <div className="case-card-folder">
            <span className="folder-dot" style={{ background: folder.color }}></span>
            {folder.name}
          </div>
        )}
        {c.notes && <p className="case-card-notes">{c.notes.slice(0, 100)}{c.notes.length > 100 ? '...' : ''}</p>}
        <div className="case-card-footer">
          <span>Created {relativeDate(c.created_at)}</span>
          <button
            className="case-card-delete"
            title="Delete case"
            onClick={e => { e.stopPropagation(); setDeleteConfirm(c.id); }}
          >
            🗑️
          </button>
        </div>
        {deleteConfirm === c.id && (
          <div className="case-card-delete-confirm" onClick={e => e.stopPropagation()}>
            <p>Delete this case and all its data?</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="diary-btn diary-btn-danger" onClick={() => handleDeleteCase(c.id)} disabled={deleting} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button className="diary-btn diary-btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting} style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: Case Diary Detail View
  // ═══════════════════════════════════════════════════════════════
  if (diary) {
    const c = diary.case;
    const badge = STATUS_BADGE[c.status] || STATUS_BADGE.active;
    const caseFolder = c.folder_id ? folders.find(f => f.id === c.folder_id) : null;

    return (
      <div className="mycases-container mycases-detail">
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
              {caseFolder && (
                <>
                  <span className="diary-meta-sep">•</span>
                  <span className="diary-meta-folder">
                    <span className="folder-dot" style={{ background: caseFolder.color }}></span>
                    {caseFolder.name}
                  </span>
                </>
              )}
              {c.case_type && (
                <>
                  <span className="diary-meta-sep">•</span>
                  <span>{CASE_TYPES[c.case_type]}</span>
                </>
              )}
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
            <select className="diary-status-select" value={c.status} onChange={e => handleStatusChange(e.target.value)}>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="archived">Archived</option>
            </select>
            <select className="diary-status-select" value={c.case_type || ''} onChange={e => handleCaseTypeChange(c.id, e.target.value)} title="Case type">
              {Object.entries(CASE_TYPES).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select className="diary-status-select" value={c.folder_id || ''} onChange={e => handleMoveCaseToFolder(c.id, e.target.value || null)} title="Move to folder">
              <option value="">No Folder</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>

            {/* Share / Export */}
            <div className="diary-share-wrapper" ref={shareMenuRef}>
              <button
                className="diary-btn diary-btn-share"
                onClick={() => setShowShareMenu(!showShareMenu)}
              >
                {copySuccess ? '✅ Copied!' : '📤 Share'}
              </button>
              {showShareMenu && (
                <div className="diary-share-menu">
                  <button onClick={handleExportDiary}>🖨️ Export as Document</button>
                  <button onClick={handleCopyDiary}>📋 Copy to Clipboard</button>
                </div>
              )}
            </div>

            <button className="diary-btn diary-btn-danger" onClick={() => setDeleteConfirm(c.id)}>
              🗑️ Delete Case
            </button>
          </div>

          {/* Delete Confirmation */}
          {deleteConfirm === c.id && (
            <div className="diary-delete-confirm">
              <p>⚠️ <strong>Are you sure?</strong> This will permanently delete this case, all its briefs, analyses, and activity logs. This cannot be undone.</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="diary-btn diary-btn-danger" onClick={() => handleDeleteCase(c.id)} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
                <button className="diary-btn diary-btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                  Cancel
                </button>
              </div>
            </div>
          )}

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
                  <input type="checkbox" checked={runAnalysis} onChange={e => setRunAnalysis(e.target.checked)} />
                  Run AI Analysis on this entry
                </label>
                <button className="diary-btn diary-btn-primary" onClick={handleAddEntry} disabled={addingEntry || !entryText.trim()}>
                  {addingEntry ? 'Processing...' : 'Submit Entry'}
                </button>
              </div>
            </div>
          )}

          {/* Notes Section */}
          {editingNotes && (
            <div className="diary-notes-section">
              <h3>📝 Case Notes</h3>
              <textarea placeholder="Add general notes about this case..." value={notesText} onChange={e => setNotesText(e.target.value)} rows={4} />
              <button className="diary-btn diary-btn-primary" onClick={handleSaveNotes} disabled={savingNotes} style={{ marginTop: '0.5rem' }}>
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
                      <BriefSection content={entry.content} />
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
  // RENDER: Cases List View (with sidebar)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="mycases-layout">
      {/* Mobile sidebar toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? '✕' : '☰'} Folders
      </button>

      {/* ── Sidebar ── */}
      <aside className={`mycases-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>📁 Folders</h3>
        </div>

        {/* Built-in views */}
        <div
          className={`sidebar-item ${selectedFolder === 'all' ? 'active' : ''}`}
          onClick={() => { setSelectedFolder('all'); setSidebarOpen(false); }}
        >
          <span className="sidebar-item-icon">📋</span>
          <span className="sidebar-item-label">All Cases</span>
          <span className="sidebar-item-count">{folderCounts.all}</span>
        </div>
        <div
          className={`sidebar-item ${selectedFolder === 'unfiled' ? 'active' : ''} ${dropTargetFolder === 'unfiled' ? 'drop-target' : ''}`}
          onClick={() => { setSelectedFolder('unfiled'); setSidebarOpen(false); }}
          onDragOver={e => handleDragOver(e, 'unfiled')}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, null)}
        >
          <span className="sidebar-item-icon">📂</span>
          <span className="sidebar-item-label">Unfiled</span>
          <span className="sidebar-item-count">{folderCounts.unfiled}</span>
        </div>

        <div className="sidebar-divider"></div>

        {/* User folders */}
        {folders.map(f => (
          <div key={f.id}>
            {editingFolder === f.id ? (
              <div className="sidebar-folder-edit">
                <input
                  className="sidebar-edit-input"
                  value={editFolderName}
                  onChange={e => setEditFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdateFolder(f.id)}
                  autoFocus
                />
                <div className="sidebar-edit-colors">
                  {FOLDER_COLORS.map(col => (
                    <button
                      key={col}
                      className={`color-dot ${editFolderColor === col ? 'selected' : ''}`}
                      style={{ background: col }}
                      onClick={() => setEditFolderColor(col)}
                    />
                  ))}
                </div>
                <div className="sidebar-edit-actions">
                  <button className="sidebar-edit-save" onClick={() => handleUpdateFolder(f.id)}>✓</button>
                  <button className="sidebar-edit-cancel" onClick={() => setEditingFolder(null)}>✕</button>
                  <button className="sidebar-edit-delete" onClick={() => handleDeleteFolder(f.id)}>🗑️</button>
                </div>
              </div>
            ) : (
              <div
                className={`sidebar-item ${selectedFolder === f.id ? 'active' : ''} ${dropTargetFolder === f.id ? 'drop-target' : ''}`}
                onClick={() => { setSelectedFolder(f.id); setSidebarOpen(false); }}
                onDragOver={e => handleDragOver(e, f.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, f.id)}
                onDoubleClick={() => { setEditingFolder(f.id); setEditFolderName(f.name); setEditFolderColor(f.color); }}
              >
                <span className="folder-dot" style={{ background: f.color }}></span>
                <span className="sidebar-item-label">{f.name}</span>
                <span className="sidebar-item-count">{folderCounts[f.id] || 0}</span>
              </div>
            )}
          </div>
        ))}

        {/* New folder */}
        {showNewFolder ? (
          <div className="sidebar-new-folder">
            <input
              className="sidebar-edit-input"
              placeholder="Folder name..."
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="sidebar-edit-colors">
              {FOLDER_COLORS.map(col => (
                <button
                  key={col}
                  className={`color-dot ${newFolderColor === col ? 'selected' : ''}`}
                  style={{ background: col }}
                  onClick={() => setNewFolderColor(col)}
                />
              ))}
            </div>
            <div className="sidebar-edit-actions">
              <button className="sidebar-edit-save" onClick={handleCreateFolder} disabled={creatingFolder}>
                {creatingFolder ? '...' : '✓'}
              </button>
              <button className="sidebar-edit-cancel" onClick={() => setShowNewFolder(false)}>✕</button>
            </div>
          </div>
        ) : (
          <button className="sidebar-add-folder" onClick={() => setShowNewFolder(true)}>
            + New Folder
          </button>
        )}

        <div className="sidebar-hint">
          <small>Double-click a folder to edit. Drag case cards onto folders.</small>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main Content ── */}
      <main className="mycases-main">
        <div className="mycases-header">
          <h1>📁 My Case Diaries</h1>
          <p>
            {selectedFolder === 'all'
              ? 'All your legal cases in one place.'
              : selectedFolder === 'unfiled'
                ? 'Cases not assigned to any folder.'
                : `Folder: ${folders.find(f => f.id === selectedFolder)?.name || ''}`
            }
          </p>
        </div>

        {error && <div className="diary-error">{error}</div>}

        {/* Controls Bar */}
        <div className="mycases-controls">
          <div className="mycases-search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              ref={searchRef}
              className="mycases-search"
              type="text"
              placeholder="Search cases..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          <select className="mycases-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="archived">Archived</option>
          </select>

          <select className="mycases-filter" value={groupBy} onChange={e => setGroupBy(e.target.value as GroupBy)}>
            <option value="none">No Grouping</option>
            <option value="folder">Group by Folder</option>
            <option value="month">Group by Month</option>
            <option value="status">Group by Status</option>
            <option value="type">Group by Type</option>
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
            <select className="mycases-filter" value={newCaseType} onChange={e => setNewCaseType(e.target.value)}>
              <option value="">Case Type (Optional)</option>
              {Object.entries(CASE_TYPES).filter(([k]) => k).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <button className="diary-btn diary-btn-primary" onClick={handleCreateCase} disabled={creating || !newTitle.trim()}>
              {creating ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        )}

        {/* Results count */}
        {!casesLoading && filteredCases.length > 0 && searchQuery && (
          <div className="mycases-results-count">
            Found {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}

        {/* Cases Grid */}
        {casesLoading ? (
          <div className="diary-loading">Loading your cases...</div>
        ) : filteredCases.length === 0 ? (
          <div className="mycases-empty">
            <div className="mycases-empty-icon">📂</div>
            <h3>No cases found</h3>
            <p>
              {searchQuery
                ? `No cases match "${searchQuery}". Try a different search.`
                : statusFilter
                  ? `No ${statusFilter} cases. Try a different filter or create a new case.`
                  : selectedFolder === 'unfiled'
                    ? 'All cases are filed in folders! Drag cases here to un-file them.'
                    : selectedFolder !== 'all'
                      ? 'This folder is empty. Drag cases here from the grid.'
                      : 'Your case diaries will appear here. Analyze a brief to auto-create one, or click "+ New Case" to start manually.'
              }
            </p>
          </div>
        ) : groupedCases ? (
          <div className="mycases-grouped">
            {Object.entries(groupedCases).map(([group, items]) => (
              <div className="mycases-group" key={group}>
                <div className="mycases-group-header">
                  <h3>{group}</h3>
                  <span className="mycases-group-count">{items.length}</span>
                </div>
                <div className="mycases-grid">
                  {items.map(c => renderCaseCard(c))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mycases-grid">
            {filteredCases.map(c => renderCaseCard(c))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyCases;
