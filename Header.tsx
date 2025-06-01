import React from 'react';
import { HeaderProps } from '../types';
import './Header.css';

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="header">
      <div className="logo-container">
        <img src="/images/logo.png" alt="Lex Assist Logo" className="logo-image" />
        <span className="logo-text">Lex Assist</span>
      </div>
      <div className="header-content">
        <nav className="navigation">
          <a href="/" className="nav-link">Home</a>
          {user ? (
            <>
              <a href="/profile" className="nav-link">Profile</a>
              <a href="/subscription" className="nav-link">Subscription</a>
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <a href="/admin" className="nav-link">Admin</a>
              )}
              <button onClick={onLogout} className="logout-button">Logout</button>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-tier">{user.subscription?.tier.toUpperCase()}</span>
              </div>
            </>
          ) : (
            <a href="/login" className="nav-link login-link">Login</a>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
