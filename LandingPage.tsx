import React, { useState } from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onLogin: (email: string, password: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    // Simulate API call
    setTimeout(() => {
      if (email && password) {
        onLogin(email, password);
      } else {
        setError('Please enter both email and password');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="hero-content">
          <div className="logo-container">
            <img src="/images/logo.png" alt="Lex Assist Logo" className="hero-logo" />
            <h1 className="hero-title">Welcome to Lex Assist</h1>
          </div>
          <h2 className="hero-subtitle">AI-Powered Legal Research for Indian Lawyers</h2>
          <p className="hero-description">
            Enter your case brief and instantly get relevant sections of law and case histories with judgments specific to your case.
          </p>
          <div className="hero-buttons">
            <button 
              className="primary-button" 
              onClick={() => setShowLoginModal(true)}
            >
              Get Started
            </button>
          </div>
        </div>
      </div>

      <div className="features-section">
        <h2 className="section-title">Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📚</div>
            <h3 className="feature-title">Law Section Extraction</h3>
            <p className="feature-description">
              Automatically identify relevant sections of Indian law codes related to your case brief.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚖️</div>
            <h3 className="feature-title">Case History Analysis</h3>
            <p className="feature-description">
              Discover precedent cases with judgments specifically relevant to your legal matter.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3 className="feature-title">Case File Drafting</h3>
            <p className="feature-description">
              Generate comprehensive case files based on your brief and analysis results.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3 className="feature-title">Share & Download</h3>
            <p className="feature-description">
              Easily download your results or share them via Email and WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content login-modal">
            <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            <div className="modal-header">
              <img src="/images/logo.png" alt="Lex Assist Logo" className="modal-logo" />
              <h2>Welcome to Lex Assist</h2>
            </div>
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && <div className="error-message">{error}</div>}
              <button 
                type="submit" 
                className="login-button"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              <div className="login-footer">
                <p className="preview-note">
                  <strong>Preview Login Tips:</strong><br />
                  For Free tier: free@lexassist.com<br />
                  For Pro tier: pro@lexassist.com<br />
                  For Enterprise tier: enterprise@lexassist.com<br />
                  For Admin: admin@lexassist.com<br />
                  Password: password123
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
