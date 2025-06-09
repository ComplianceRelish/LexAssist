// src/components/common/Header.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo/Logo';
import { User } from '../../types';

interface HeaderProps {
  onLogout?: () => void;
  user?: User | null;
}

const Header: React.FC<HeaderProps> = ({ onLogout, user }) => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-container">
          <Link to="/">
            <Logo size="default" showText={true} />
          </Link>
        </div>
        
        <nav className="main-nav">
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            {user?.role === 'admin' && (
              <li><Link to="/dashboard">Dashboard</Link></li>
            )}
            <li><Link to="/upload">Upload Document</Link></li>
            <li><Link to="/legal-ai">Legal AI</Link></li>
          </ul>
        </nav>
        
        <div className="user-controls">
          {user && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          )}
          
          <button 
            className="logout-button" 
            onClick={handleLogout}
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;