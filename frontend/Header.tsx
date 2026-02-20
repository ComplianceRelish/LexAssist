import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  onLoginClick: () => void;
  isLoggedIn: boolean;
  onLogoutClick: () => void;
  userName?: string;
  onOpenChat?: () => void;
  userRole?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onLoginClick, 
  isLoggedIn, 
  onLogoutClick,
  userName,
  onOpenChat,
  userRole
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    ...((userRole === 'super_admin' || userRole === 'admin')
      ? [{ path: '/admin', label: 'Admin', icon: '🛡️' }]
      : []),
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
                      <div className="lex-dropdown-role">
                        {userRole === 'super_admin' ? '🛡️ Super Admin' : userRole === 'admin' ? '🛡️ Admin' : 'Advocate'}
                      </div>
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
                    {(userRole === 'super_admin' || userRole === 'admin') && (
                      <button
                        className="lex-dropdown-item"
                        onClick={() => { setMenuOpen(false); navigate?.('/admin'); }}
                      >
                        🛡️ User Management
                      </button>
                    )}
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

            {/* Mobile Hamburger */}
            <button 
              className="lex-mobile-hamburger" 
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Menu"
            >
              {mobileNavOpen ? '✕' : '☰'}
            </button>
          </div>
        )}

        {/* Mobile Nav Drawer */}
        {isLoggedIn && mobileNavOpen && (
          <>
            <div className="lex-mobile-backdrop" onClick={() => setMobileNavOpen(false)} />
            <div className="lex-mobile-nav">
              <div className="lex-mobile-nav-header">
                <div className="lex-mobile-nav-user">
                  <div className="lex-user-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                    {userName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#0a2e5c' }}>{userName || 'User'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                      {userRole === 'super_admin' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'Advocate'}
                    </div>
                  </div>
                </div>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { setMobileNavOpen(false); navigate?.(item.path); }}
                  className={`lex-mobile-nav-item ${location?.pathname === item.path ? 'lex-mobile-nav-active' : ''}`}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
              {onOpenChat && (
                <button
                  onClick={() => { setMobileNavOpen(false); onOpenChat(); }}
                  className="lex-mobile-nav-item"
                >
                  💬 AI Chat Assistant
                </button>
              )}
              <div style={{ height: 1, background: '#e5e7eb', margin: '8px 0' }} />
              <button
                onClick={() => { setMobileNavOpen(false); onLogoutClick(); }}
                className="lex-mobile-nav-item"
                style={{ color: '#dc2626' }}
              >
                🚪 Sign Out
              </button>
            </div>
          </>
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
