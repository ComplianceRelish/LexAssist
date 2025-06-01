// legal_app_frontend/src/pages/LandingPage/LandingPage.tsx
import React, { useState } from 'react';
import styles from './LandingPage.module.css';
import Button from '../../components/common/Button/Button';
import Logo from '../../components/common/Logo/Logo';

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
    <div className={styles['landingPage']}>
      <div className={styles['heroSection']}>
        <div className={styles['heroContent']}>
          <div className={styles['logoContainer']}>
            <Logo size="large" welcomeText={true} />
          </div>
          <h2 className={styles['heroSubtitle']}>AI-Powered Legal Assistant</h2>
          <p className={styles['heroDescription']}>
            Enter your case brief and instantly get relevant sections of law and case histories with judgments specific to your case.
          </p>
          <div className={styles['heroButtons']}>
            <Button 
              variant="secondary"
              size="large"
              onClick={() => setShowLoginModal(true)}
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>

      <div className={styles['featuresSection']}>
        <h2 className={styles['sectionTitle']}>Key Features</h2>
        <div className={styles['featuresGrid']}>
          <div className={styles['featureCard']}>
            <div className={styles['featureIcon']}>📚</div>
            <h3 className={styles['featureTitle']}>Law Section Extraction</h3>
            <p className={styles['featureDescription']}>
              Automatically identify relevant sections of Indian law codes related to your case brief.
            </p>
          </div>
          <div className={styles['featureCard']}>
            <div className={styles['featureIcon']}>⚖️</div>
            <h3 className={styles['featureTitle']}>Case History Analysis</h3>
            <p className={styles['featureDescription']}>
              Discover precedent cases with judgments specifically relevant to your legal matter.
            </p>
          </div>
          <div className={styles['featureCard']}>
            <div className={styles['featureIcon']}>📝</div>
            <h3 className={styles['featureTitle']}>Case File Drafting</h3>
            <p className={styles['featureDescription']}>
              Generate comprehensive case files based on your brief and analysis results.
            </p>
          </div>
          <div className={styles['featureCard']}>
            <div className={styles['featureIcon']}>📱</div>
            <h3 className={styles['featureTitle']}>Share & Download</h3>
            <p className={styles['featureDescription']}>
              Easily download your results or share them via Email and WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && (
        <div className={styles['modalBackdrop']} onClick={() => setShowLoginModal(false)}>
          <div 
            className={styles['modalContainer']} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles['modalHeader']}>
              <Logo size="default" showText={false} />
              <h2>Welcome to LexAssist</h2>
              <button 
                className={styles['closeButton']} 
                onClick={() => setShowLoginModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleLoginSubmit} className={styles['loginForm']}>
              <div className={styles['formGroup']}>
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className={styles['formInput']}
                />
              </div>
              
              <div className={styles['formGroup']}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className={styles['formInput']}
                />
              </div>
              
              {error && <div className={styles['errorMessage']}>{error}</div>}
              
              <Button 
                type="submit" 
                variant="primary"
                fullWidth={true}
                disabled={isLoading}
                // Fixed: Define a string value or don't provide className at all
                className={styles['loginButton'] || ''}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
              
              <div className={styles['loginFooter']}>
                <p className={styles['previewNote']}>
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

// Make sure we have a proper default export
export default LandingPage;