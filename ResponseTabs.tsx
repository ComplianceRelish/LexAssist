import React, { useState } from 'react';
import Modal from './common/Modal';
import './ResponseTabs.css';
import { LawSection, CaseHistory, Analysis, Subscription } from '../types';

interface ResponseTabsProps {
  lawSections: LawSection[];
  caseHistories: CaseHistory[];
  analysis: Analysis;
  subscription: Subscription | null;
}

const ResponseTabs: React.FC<ResponseTabsProps> = ({
  lawSections,
  caseHistories,
  analysis,
  subscription
}) => {
  const [activeTab, setActiveTab] = useState('lawSections');
  const [selectedItem, setSelectedItem] = useState<LawSection | CaseHistory | null>(null);
  
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  
  const handleItemClick = (item: LawSection | CaseHistory) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };
  
  return (
    <div className="response-tabs-container">
      <div className="tabs-header">
        <button 
          className={`tab-button ${activeTab === 'lawSections' ? 'active' : ''}`}
          onClick={() => setActiveTab('lawSections')}
        >
          Law Sections
        </button>
        <button 
          className={`tab-button ${activeTab === 'caseHistories' ? 'active' : ''}`}
          onClick={() => setActiveTab('caseHistories')}
        >
          Case Histories
        </button>
        <button 
          className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
          disabled={!subscription?.features.includes('aiAnalysis')}
        >
          AI Analysis
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'lawSections' && (
          <div className="law-sections-tab">
            {lawSections.length > 0 ? (
              <div className="items-grid">
                {lawSections.map((section, index) => (
                  <div 
                    key={index} 
                    className="item-card law-section-card"
                    onClick={() => handleItemClick(section)}
                  >
                    <h3>{section.act}</h3>
                    <h4>Section {section.section}</h4>
                    <p className="item-title">{section.title}</p>
                    <div className="relevance-indicator">
                      <div 
                        className="relevance-bar" 
                        style={{ width: `${section.relevance * 100}%` }}
                      ></div>
                    </div>
                    <span className="view-details">View Details</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No law sections found for this brief.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'caseHistories' && (
          <div className="case-histories-tab">
            {caseHistories.length > 0 ? (
              <div className="items-grid">
                {caseHistories.map((caseHistory, index) => (
                  <div 
                    key={index} 
                    className="item-card case-history-card"
                    onClick={() => handleItemClick(caseHistory)}
                  >
                    <h3>{caseHistory.title}</h3>
                    <p className="case-citation">{caseHistory.citation}</p>
                    <p className="case-court">{caseHistory.court}</p>
                    <p className="case-date">{caseHistory.date}</p>
                    <div className="relevance-indicator">
                      <div 
                        className="relevance-bar" 
                        style={{ width: `${caseHistory.relevance * 100}%` }}
                      ></div>
                    </div>
                    <span className="view-details">View Details</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No case histories found for this brief.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div className="analysis-tab">
            {subscription?.features.includes('aiAnalysis') ? (
              <div className="analysis-content">
                {analysis.summary && (
                  <div className="analysis-section">
                    <h3>Summary</h3>
                    <p>{analysis.summary}</p>
                  </div>
                )}
                
                {analysis.keyIssues && analysis.keyIssues.length > 0 && (
                  <div className="analysis-section">
                    <h3>Key Issues</h3>
                    <ul>
                      {analysis.keyIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {analysis.arguments && analysis.arguments.length > 0 && (
                  <div className="analysis-section">
                    <h3>Arguments</h3>
                    {analysis.arguments.map((arg, index) => (
                      <div key={index} className="argument-item">
                        <h4>{arg.title}</h4>
                        <p>{arg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                  <div className="analysis-section">
                    <h3>Recommendations</h3>
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className="recommendation-item">
                        <h4>{rec.title}</h4>
                        <p>{rec.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="upgrade-message">
                <h3>Upgrade to Access AI Analysis</h3>
                <p>
                  AI Analysis is available on Pro and Enterprise plans. Upgrade your subscription to access detailed legal analysis of your case brief.
                </p>
                <button className="upgrade-button">Upgrade Now</button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedItem ? ('act' in selectedItem ? selectedItem.act : selectedItem.title) : "Details"}
        maxWidth="800px"
      >
        {selectedItem && activeTab === 'lawSections' && 'act' in selectedItem && (
          <div className="law-section-detail">
            <div className="detail-header">
              <h3>{selectedItem.act}</h3>
              <h4>Section {selectedItem.section}</h4>
            </div>
            <div className="detail-content">
              <h3>{selectedItem.title}</h3>
              <div className="section-content">
                {selectedItem.content}
              </div>
              <div className="relevance-info">
                <span>Relevance Score: {(selectedItem.relevance * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
        
        {selectedItem && activeTab === 'caseHistories' && 'citation' in selectedItem && (
          <div className="case-history-detail">
            <div className="detail-header">
              <h3>{selectedItem.title}</h3>
              <div className="case-meta">
                <span className="case-citation">{selectedItem.citation}</span>
                <span className="case-court">{selectedItem.court}</span>
                <span className="case-date">{selectedItem.date}</span>
              </div>
            </div>
            <div className="detail-content">
              <h4>Summary</h4>
              <div className="case-summary">
                {selectedItem.summary}
              </div>
              <div className="relevance-info">
                <span>Relevance Score: {(selectedItem.relevance * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResponseTabs;
