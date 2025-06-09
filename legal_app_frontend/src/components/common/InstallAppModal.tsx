import React, { useState, useEffect } from 'react';
import './InstallAppModal.css';
import logo from '../assets/logo.png';

interface InstallAppModalProps {
  onClose: () => void;
}

const InstallAppModal: React.FC<InstallAppModalProps> = ({ onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      // Clear the saved prompt since it can't be used again
      setDeferredPrompt(null);
      onClose();
    });
  };

  // If there's no deferred prompt, don't show the modal
  if (!deferredPrompt) {
    return null;
  }

  return (
    <div className="install-app-modal-overlay">
      <div className="install-app-modal">
        <div className="install-app-modal-header">
          <img src={logo} alt="Lex Assist Logo" className="install-app-logo" />
          <h2>Install Lex Assist</h2>
        </div>
        <div className="install-app-modal-content">
          <p>Add Lex Assist to your home screen for quick and easy access when you're on the go.</p>
          <div className="install-app-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">📱</span>
              <span>Works offline</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">⚡</span>
              <span>Faster access</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔔</span>
              <span>Get notifications</span>
            </div>
          </div>
        </div>
        <div className="install-app-modal-footer">
          <button className="install-app-button" onClick={handleInstallClick}>
            Install App
          </button>
          <button className="install-app-dismiss" onClick={onClose}>
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppModal;
