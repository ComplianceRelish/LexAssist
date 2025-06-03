import React, { useState } from 'react';
import Modal from './common/Modal';
import './DownloadShareFeature.css';
import { AnalysisResults, Subscription } from '../types';

interface DownloadShareProps {
  analysisResults: AnalysisResults;
  brief: string;
  hasAccess: (feature: string) => boolean;
  subscription: Subscription | null;
}

const DownloadShareFeature: React.FC<DownloadShareProps> = ({ 
  analysisResults, 
  brief, 
  hasAccess,
  subscription 
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  const generateDocumentContent = () => {
    // This would generate the actual document content
    return `Case Brief Analysis\n\n${brief}\n\nAnalysis Results: ${JSON.stringify(analysisResults, null, 2)}`;
  };
  
  const handleDownload = () => {
    // In a real implementation, this would generate and download a PDF
    alert('Document download functionality would be implemented here');
  };
  
  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSharing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSharing(false);
      setShareSuccess(true);
      
      // Reset after showing success message
      setTimeout(() => {
        setShowShareModal(false);
        setShareSuccess(false);
        setShareEmail('');
        setShareMessage('');
      }, 2000);
    }, 1500);
  };
  
  return (
    <div className="download-share-container">
      <h3>Download & Share Results</h3>
      
      <div className="action-buttons">
        <button 
          className="download-button"
          onClick={handleDownload}
          disabled={!hasAccess('advancedExport')}
        >
          <span className="button-icon">📥</span>
          Download PDF
        </button>
        
        <button 
          className="share-button"
          onClick={() => setShowShareModal(true)}
        >
          <span className="button-icon">📤</span>
          Share Results
        </button>
      </div>
      
      {!hasAccess('advancedExport') && (
        <div className="upgrade-message">
          <p>
            <strong>Upgrade to Pro or Enterprise</strong> to access advanced export features
          </p>
        </div>
      )}
      
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Analysis Results"
      >
        {!shareSuccess ? (
          <form onSubmit={handleShare} className="share-form">
            <div className="form-group">
              <label htmlFor="shareEmail">Recipient Email</label>
              <input
                type="email"
                id="shareEmail"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter recipient's email"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="shareMessage">Message (Optional)</label>
              <textarea
                id="shareMessage"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={4}
              />
            </div>
            
            <div className="share-options">
              <h4>Share via</h4>
              <div className="share-methods">
                <button type="button" className="share-method email-share">
                  <span className="share-icon">✉️</span>
                  Email
                </button>
                <button type="button" className="share-method whatsapp-share">
                  <span className="share-icon">📱</span>
                  WhatsApp
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSharing || !shareEmail}
            >
              {isSharing ? 'Sharing...' : 'Share Results'}
            </button>
          </form>
        ) : (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h3>Shared Successfully!</h3>
            <p>Your analysis results have been shared with {shareEmail}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DownloadShareFeature;
