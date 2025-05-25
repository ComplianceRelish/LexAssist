import React from 'react';

interface HeaderProps {
  onLoginClick: () => void;
  isLoggedIn: boolean;
  onLogoutClick: () => void;
  userName?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  onLoginClick, 
  isLoggedIn, 
  onLogoutClick,
  userName 
}) => {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <img 
              src="/images/logo.png" 
              alt="Lex Assist Logo" 
              className="h-12 w-auto mr-4"
            />
            <h1 className="text-2xl font-bold text-[#0a2e5c]">Lex Assist</h1>
          </div>
          <div>
            {isLoggedIn ? (
              <div className="flex items-center">
                <span className="mr-4 text-gray-700">Welcome, {userName || 'User'}</span>
                <button
                  onClick={onLogoutClick}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0a2e5c] hover:bg-opacity-90 focus:outline-none"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0a2e5c] hover:bg-opacity-90 focus:outline-none"
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
