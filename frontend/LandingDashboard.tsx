import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingDashboard.css';

interface LandingDashboardProps {
  userName?: string;
  onOpenChat: () => void;
}

const LandingDashboard: React.FC<LandingDashboardProps> = ({ userName, onOpenChat }) => {
  const navigate = useNavigate();

  const firstName = userName ? userName.split(' ')[0] : 'Advocate';

  return (
    <div className="landing-root">
      {/* Hero / Brand */}
      <div className="landing-hero">
        <img src="/logo.png" alt="LexAssist Logo" className="landing-logo" />
        <h1 className="landing-brand">LexAssist</h1>
        <p className="landing-tagline">AI-Powered Legal Research &amp; Case Management</p>
        <p className="landing-greeting">
          Welcome back, <strong>{firstName}</strong>. What would you like to do today?
        </p>
      </div>

      {/* 3 Action Cards */}
      <div className="landing-cards">

        {/* Card 1 — Open a Saved Case */}
        <button
          className="landing-card landing-card--navy"
          onClick={() => navigate('/cases')}
          aria-label="Open a Saved Case"
        >
          <div className="landing-card-icon">📁</div>
          <div className="landing-card-body">
            <h2 className="landing-card-title">Open a Saved Case</h2>
            <p className="landing-card-desc">
              Browse your case diary, review past analyses, and continue working on an existing matter.
            </p>
          </div>
          <div className="landing-card-arrow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>

        {/* Card 2 — Analyze a Case Brief */}
        <button
          className="landing-card landing-card--gold"
          onClick={() => navigate('/analyze')}
          aria-label="Analyze a Case Brief with AI"
        >
          <div className="landing-card-icon">🔍</div>
          <div className="landing-card-body">
            <h2 className="landing-card-title">Analyze a Case Brief with AI</h2>
            <p className="landing-card-desc">
              Paste your brief — get instant arguments, applicable sections, precedents and a full case diary entry.
            </p>
          </div>
          <div className="landing-card-arrow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>

        {/* Card 3 — Start AI Chat */}
        <button
          className="landing-card landing-card--purple"
          onClick={onOpenChat}
          aria-label="Start AI Chat"
        >
          <div className="landing-card-icon">💬</div>
          <div className="landing-card-body">
            <h2 className="landing-card-title">Start AI Chat</h2>
            <p className="landing-card-desc">
              Ask LexAssist AI anything — case strategy, applicable sections, precedents and legal arguments.
            </p>
          </div>
          <div className="landing-card-arrow">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>

      </div>

      {/* Quick secondary link to My Cases */}
      <div className="landing-secondary">
        <button className="landing-secondary-link" onClick={() => navigate('/cases?new=1')}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Create a blank Case Diary manually
        </button>
      </div>
    </div>
  );
};

export default LandingDashboard;
