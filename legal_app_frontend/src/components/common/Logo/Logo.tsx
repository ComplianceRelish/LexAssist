// legal_app_frontend/src/components/common/Logo/Logo.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Logo.module.css';
// Import your actual logo image
const logoImage = '/images/logo.png';

interface LogoProps {
  size?: 'small' | 'default' | 'large';
  linkTo?: string;
  showText?: boolean;
  welcomeText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'default', 
  linkTo = '/', 
  showText = false, // Default to false to prevent duplicate text
  welcomeText = false
}) => {
  const sizeClass = size === 'small' 
    ? styles['logo-small'] 
    : size === 'large' 
      ? styles['logo-large'] 
      : styles['logo-default'];
  
  return (
    <Link to={linkTo} className={styles['logo-link']}>
      <div className={styles['logo-container']}>
        <img 
          src={logoImage}
          alt="LEX ASSIST" 
          className={`${styles['logo-image']} ${sizeClass}`}
        />
        
        {welcomeText && (
          <div className={styles['welcome-text']}>
            Welcome to LexAssist
          </div>
        )}
        
        {showText && !welcomeText && !logoImage.includes('text') && (
          <div className={styles['logo-text']}>
            <span className={styles['logo-text-lex']}>LEX</span>
            <span className={styles['logo-text-assist']}>ASSIST</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default Logo;
