import React, { useState } from 'react';

/* ═══════════════════════════════════════════════════════
   ResponseTabs — Premium Legal Analysis Display
   Handles both regex-only and AI-enhanced analysis results
   ═══════════════════════════════════════════════════════ */

interface ResponseTabsProps {
  lawSections: {
    title: string;
    sectionNumber: string;
    content: string;
    relevance: number;
  }[];
  caseHistories: {
    citation: string;
    parties: string;
    holdings: string;
    relevance: number;
    date: string;
  }[];
  analysis: {
    summary: string;
    arguments: string[];
    challenges: string[];
    recommendations: string[];
  };
  aiAnalysis?: any; // Claude AI deep analysis
}

const TABS = [
  { key: 'overview', label: '📊 Overview', icon: '📊' },
  { key: 'law', label: '📜 Statutes', icon: '📜' },
  { key: 'cases', label: '⚖️ Precedents', icon: '⚖️' },
  { key: 'analysis', label: '🧠 Analysis', icon: '🧠' },
  { key: 'strategy', label: '🎯 Strategy', icon: '🎯' },
  { key: 'risk', label: '🛡️ Risk', icon: '🛡️' },
] as const;

type TabKey = typeof TABS[number]['key'];

const ResponseTabs: React.FC<ResponseTabsProps> = ({
  lawSections,
  caseHistories,
  analysis,
  aiAnalysis,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const ai = aiAnalysis?.ai_analysis || aiAnalysis;
  const hasAI = !!ai && ai.status === 'success';

  // Helper: Relevance bar
  const RelevanceBar = ({ score, max = 10 }: { score: number; max?: number }) => (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(score / max) * 100}%`,
            background: score >= 7 ? '#059669' : score >= 4 ? '#d97706' : '#9ca3af',
          }}
        />
      </div>
      <span className="text-xs text-gray-500">{score}/{max}</span>
    </div>
  );

  // Helper: Strength badge
  const StrengthBadge = ({ strength }: { strength: string }) => {
    const colors: Record<string, string> = {
      strong: 'bg-green-100 text-green-800 border-green-200',
      moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      weak: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[strength] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
        {strength === 'strong' ? '💪' : strength === 'moderate' ? '⚡' : '⚠️'} {strength}
      </span>
    );
  };

  // Section card wrapper
  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {children}
    </div>
  );

  const SectionHeading = ({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) => (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-[#0a2e5c] flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <div className="response-tabs-container">
      {/* AI Badge */}
      {hasAI && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full text-xs font-medium text-blue-700">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            AI-Enhanced Analysis • LexAssist
          </span>
        </div>
      )}

      {/* Tab Bar */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 -mx-1 overflow-x-auto scrollbar-hide">
        <nav className="-mb-px flex gap-0 min-w-max px-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.key
                  ? 'border-[#0a2e5c] text-[#0a2e5c]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">

        {/* ── OVERVIEW TAB ─────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {hasAI && ai.case_summary && (
              <Card>
                <SectionHeading icon="📋" title="Case Summary" />
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{ai.case_summary}</p>
              </Card>
            )}

            {!hasAI && analysis.summary && (
              <Card>
                <SectionHeading icon="📋" title="Case Summary" />
                <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
              </Card>
            )}

            {hasAI && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ai.case_type && (
                  <Card>
                    <SectionHeading icon="📁" title="Case Classification" />
                    <div className="text-xl font-bold text-[#0a2e5c] mb-1">{ai.case_type.primary}</div>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      ai.case_type.confidence === 'high' ? 'bg-green-100 text-green-700' :
                      ai.case_type.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ai.case_type.confidence} confidence
                    </span>
                    {ai.case_type.reasoning && (
                      <p className="text-xs text-gray-500 mt-2">{ai.case_type.reasoning}</p>
                    )}
                  </Card>
                )}

                {ai.jurisdiction && (
                  <Card>
                    <SectionHeading icon="🏛️" title="Jurisdiction" />
                    <div className="text-lg font-bold text-[#0a2e5c] mb-1">{ai.jurisdiction.recommended_court}</div>
                    <p className="text-xs text-gray-500">{ai.jurisdiction.reasoning}</p>
                    {ai.jurisdiction.alternative_forums?.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-400">Alternatives:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ai.jurisdiction.alternative_forums.map((f: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}

            {hasAI && ai.limitation_period && (
              <Card>
                <SectionHeading icon="⏰" title="Limitation Period" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 text-sm">
                  <div>
                    <div className="text-gray-500 text-xs uppercase font-medium">Applicable Limitation</div>
                    <div className="font-medium text-gray-800 mt-1">{ai.limitation_period.applicable_limitation}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase font-medium">Start Trigger</div>
                    <div className="font-medium text-gray-800 mt-1">{ai.limitation_period.start_date_trigger}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs uppercase font-medium">Urgency</div>
                    <div className="font-medium text-gray-800 mt-1">{ai.limitation_period.urgency}</div>
                  </div>
                </div>
              </Card>
            )}

            {hasAI && ai.legal_issues?.length > 0 && (
              <Card>
                <SectionHeading icon="⚡" title="Legal Issues Identified" subtitle={`${ai.legal_issues.length} distinct legal questions`} />
                <div className="space-y-3">
                  {ai.legal_issues.map((issue: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-[#0a2e5c] text-sm">{issue.issue}</h4>
                        {issue.strength && <StrengthBadge strength={issue.strength} />}
                      </div>
                      {issue.applicable_law && (
                        <div className="text-xs text-blue-600 font-medium mt-1">{issue.applicable_law}</div>
                      )}
                      {issue.analysis && (
                        <p className="text-xs text-gray-600 mt-1">{issue.analysis}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── STATUTES TAB ──────────────────────────────────── */}
        {activeTab === 'law' && (
          <div className="space-y-4">
            {hasAI && ai.applicable_statutes?.length > 0 && (
              <>
                <SectionHeading icon="📜" title="Applicable Statutes (AI Analysis)" subtitle="Deep analysis of relevant legal provisions" />
                <div className="space-y-4">
                  {ai.applicable_statutes.map((s: any, i: number) => (
                    <Card key={i}>
                      <h4 className="font-bold text-[#0a2e5c] text-base">{s.act}</h4>
                      {s.sections?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {s.sections.map((sec: string, j: number) => (
                            <span key={j} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold border border-blue-100">
                              § {sec}
                            </span>
                          ))}
                        </div>
                      )}
                      {s.relevance && <p className="text-sm text-gray-600 mt-2">{s.relevance}</p>}
                      {s.key_provisions && <p className="text-xs text-gray-500 mt-1 italic">{s.key_provisions}</p>}
                    </Card>
                  ))}
                </div>
              </>
            )}

            {lawSections.length > 0 && (
              <>
                {hasAI && <div className="mt-6 mb-3 border-t pt-4"><span className="text-xs font-medium text-gray-400 uppercase">Pattern-Matched Statutes</span></div>}
                <div className="space-y-3">
                  {lawSections.map((section, index) => (
                    <Card key={index}>
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-[#0a2e5c]">
                          {section.title} — Section {section.sectionNumber}
                        </h4>
                        <RelevanceBar score={section.relevance} />
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{section.content}</p>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {!hasAI && lawSections.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📜</div>
                <p>No statutes identified yet. Try providing more details in your brief.</p>
              </div>
            )}
          </div>
        )}

        {/* ── PRECEDENTS TAB ────────────────────────────────── */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {hasAI && ai.relevant_precedents?.length > 0 && (
              <>
                <SectionHeading icon="⚖️" title="Relevant Precedents (AI)" subtitle="Key judgments identified by AI analysis" />
                <div className="space-y-4">
                  {ai.relevant_precedents.map((p: any, i: number) => (
                    <Card key={i}>
                      <h4 className="font-bold text-[#0a2e5c]">{p.case_name}</h4>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {p.citation && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{p.citation}</span>
                        )}
                        {p.court && (
                          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">{p.court}</span>
                        )}
                      </div>
                      <div className="mt-2">
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">Legal Principle</div>
                        <p className="text-sm text-gray-700">{p.principle}</p>
                      </div>
                      {p.applicability && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-green-600 uppercase mb-1">Applicability</div>
                          <p className="text-sm text-gray-600">{p.applicability}</p>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            )}

            {caseHistories.length > 0 && (
              <>
                {hasAI && <div className="mt-6 mb-3 border-t pt-4"><span className="text-xs font-medium text-gray-400 uppercase">Indian Kanoon Results</span></div>}
                <div className="space-y-3">
                  {caseHistories.map((caseItem, index) => (
                    <Card key={index}>
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-[#0a2e5c]">{caseItem.parties}</h4>
                        <RelevanceBar score={caseItem.relevance} />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {caseItem.citation && `Citation: ${caseItem.citation}`}
                        {caseItem.date && ` | ${caseItem.date}`}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">{caseItem.holdings}</p>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {!hasAI && caseHistories.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">⚖️</div>
                <p>No precedents found. Try including specific legal aspects in your brief.</p>
              </div>
            )}
          </div>
        )}

        {/* ── ANALYSIS TAB ──────────────────────────────────── */}
        {activeTab === 'analysis' && (
          <div className="space-y-4">
            <SectionHeading icon="🧠" title="Legal Analysis" subtitle="Arguments for both sides" />

            <Card>
              <h4 className="font-bold text-green-700 flex items-center gap-2 mb-3">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Arguments for Petitioner
              </h4>
              <ul className="space-y-2">
                {(hasAI && ai.arguments_for_petitioner?.length > 0
                  ? ai.arguments_for_petitioner
                  : analysis.arguments || []
                ).map((arg: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{arg}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {hasAI && ai.arguments_for_respondent?.length > 0 && (
              <Card>
                <h4 className="font-bold text-red-700 flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Arguments for Respondent (Anticipate)
                </h4>
                <ul className="space-y-2">
                  {ai.arguments_for_respondent.map((arg: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                      <span>{arg}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {analysis.challenges?.length > 0 && (
              <Card>
                <h4 className="font-bold text-amber-700 flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  Potential Challenges
                </h4>
                <ul className="space-y-2">
                  {analysis.challenges.map((c: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* ── STRATEGY TAB ──────────────────────────────────── */}
        {activeTab === 'strategy' && (
          <div className="space-y-4">
            <SectionHeading icon="🎯" title="Strategic Recommendations" subtitle="Actionable next steps for your case" />

            {hasAI && ai.strategic_recommendations?.length > 0 && (
              <Card>
                <h4 className="font-bold text-[#0a2e5c] mb-3">Recommended Strategy</h4>
                <ol className="space-y-3">
                  {ai.strategic_recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 bg-[#0a2e5c] text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-gray-700 pt-0.5">{rec}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {hasAI && ai.procedural_requirements?.length > 0 && (
              <Card>
                <h4 className="font-bold text-indigo-700 mb-3">📋 Procedural Requirements</h4>
                <ol className="space-y-2">
                  {ai.procedural_requirements.map((step: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-indigo-500 font-mono text-xs mt-0.5">→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {hasAI && ai.evidence_checklist?.length > 0 && (
              <Card>
                <h4 className="font-bold text-emerald-700 mb-3">🗂️ Evidence Checklist</h4>
                <div className="space-y-2">
                  {ai.evidence_checklist.map((item: string, i: number) => (
                    <label key={i} className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" className="mt-0.5 accent-[#0a2e5c] rounded" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </Card>
            )}

            {(!hasAI && analysis.recommendations?.length > 0) && (
              <Card>
                <h4 className="font-bold text-[#0a2e5c] mb-3">Recommendations</h4>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {/* ── RISK TAB ──────────────────────────────────────── */}
        {activeTab === 'risk' && (
          <div className="space-y-4">
            <SectionHeading icon="🛡️" title="Risk Assessment" subtitle="Evaluate case strengths and weaknesses" />

            {hasAI && ai.risk_assessment ? (
              <>
                <Card className={
                  ai.risk_assessment.overall_risk === 'high' ? '!border-red-200 !bg-red-50' :
                  ai.risk_assessment.overall_risk === 'medium' ? '!border-yellow-200 !bg-yellow-50' :
                  '!border-green-200 !bg-green-50'
                }>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">
                      {ai.risk_assessment.overall_risk === 'high' ? '🔴' :
                       ai.risk_assessment.overall_risk === 'medium' ? '🟡' : '🟢'}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg capitalize">{ai.risk_assessment.overall_risk} Risk</h4>
                      <p className="text-sm text-gray-600">Overall case risk assessment</p>
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {ai.risk_assessment.strengths?.length > 0 && (
                    <Card>
                      <h4 className="font-bold text-green-700 mb-3">💪 Strengths</h4>
                      <ul className="space-y-2">
                        {ai.risk_assessment.strengths.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-green-500 flex-shrink-0">✓</span>
                            <span className="text-gray-700">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {ai.risk_assessment.weaknesses?.length > 0 && (
                    <Card>
                      <h4 className="font-bold text-red-700 mb-3">⚠️ Weaknesses</h4>
                      <ul className="space-y-2">
                        {ai.risk_assessment.weaknesses.map((w: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-red-500 flex-shrink-0">✗</span>
                            <span className="text-gray-700">{w}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}
                </div>

                {ai.risk_assessment.mitigation_strategies?.length > 0 && (
                  <Card>
                    <h4 className="font-bold text-blue-700 mb-3">🛡️ Mitigation Strategies</h4>
                    <ol className="space-y-2">
                      {ai.risk_assessment.mitigation_strategies.map((m: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {i + 1}
                          </span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">🛡️</div>
                  <p>Enable AI Analysis to get detailed risk assessment</p>
                  <p className="text-xs mt-1">Use the "AI Analysis" button instead of basic analysis</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseTabs;
