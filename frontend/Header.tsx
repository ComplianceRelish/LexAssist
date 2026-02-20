import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  onLoginClick: () => void;
  isLoggedIn: boolean;
  onLogoutClick: () => void;
  userName?: string;
  onOpenChat?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onLoginClick, 
  isLoggedIn, 
  onLogoutClick,
  userName,
  onOpenChat
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  let navigate: any;
  let location: any;
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch {
    // Not inside Router
  }

  const navItems = [
    { path: '/dashboard', label: 'Analyze', icon: '📊' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <header className="lex-header">
      <div className="lex-header-inner">
        {/* Logo */}
        <div className="lex-header-logo" onClick={() => navigate?.('/dashboard')} style={{ cursor: 'pointer' }}>
          <div className="lex-logo-icon">⚖️</div>
          <div>
            <h1 className="lex-logo-text">LexAssist</h1>
            <span className="lex-logo-sub">AI Legal Research</span>
          </div>
        </div>

        {/* Nav + Actions */}
        {isLoggedIn && (
          <div className="lex-header-right">
            {/* Desktop Nav */}
            <nav className="lex-nav-desktop">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate?.(item.path)}
                  className={`lex-nav-item ${location?.pathname === item.path ? 'lex-nav-active' : ''}`}
                >
                  <span className="lex-nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            {/* AI Chat Button */}
            {onOpenChat && (
              <button onClick={onOpenChat} className="lex-ai-chat-btn" title="Open AI Assistant">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>AI Chat</span>
                <span className="lex-ai-badge">✨</span>
              </button>
            )}

            {/* User Menu */}
            <div className="lex-user-menu-wrapper">
              <button className="lex-user-avatar" onClick={() => setMenuOpen(!menuOpen)}>
                {userName?.charAt(0).toUpperCase() || 'U'}
              </button>
              {menuOpen && (
                <>
                  <div className="lex-menu-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="lex-dropdown-menu">
                    <div className="lex-dropdown-header">
                      <div className="lex-dropdown-name">{userName || 'User'}</div>
                      <div className="lex-dropdown-role">Advocate</div>
                    </div>
                    <div className="lex-dropdown-divider" />
                    <button
                      className="lex-dropdown-item"
                      onClick={() => { setMenuOpen(false); navigate?.('/profile'); }}
                    >
                      👤 My Profile
                    </button>
                    <button
                      className="lex-dropdown-item"
                      onClick={() => { setMenuOpen(false); navigate?.('/dashboard'); }}
                    >
                      📊 Dashboard
                    </button>
                    <div className="lex-dropdown-divider" />
                    <button
                      className="lex-dropdown-item lex-dropdown-danger"
                      onClick={() => { setMenuOpen(false); onLogoutClick(); }}
                    >
                      🚪 Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {!isLoggedIn && (
          <button onClick={onLoginClick} className="lex-login-btn">
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
