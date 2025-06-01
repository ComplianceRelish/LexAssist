// src/components/common/Button/Button.tsx - Updated Interface
import React, { ReactNode } from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  icon?: ReactNode;
  onClick?: () => void;
  className?: string | undefined; // Updated to explicitly allow undefined
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  fullWidth = false,
  disabled = false,
  type = 'button',
  icon = null,
  onClick = () => {},
  className = '',
}) => {
  // Make sure we have the right variant class
  let variantClass = styles[`btn-${variant}`] || '';
  
  // Special case for text variant to avoid conflict
  if (variant === 'text' && !styles[`btn-${variant}`]) {
    variantClass = styles['btn-text-variant'] || '';
  }
  
  const sizeClass = styles[`btn-${size}`] || '';
  const widthClass = fullWidth ? styles['btn-full-width'] || '' : '';
  
  return (
    <button
      type={type}
      className={`${styles['btn']} ${variantClass} ${sizeClass} ${widthClass} ${className || ''}`}
      disabled={disabled}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {icon && <span style={{ marginRight: '8px' }}>{icon}</span>}
      <span style={{ display: 'inline-block' }}>{children}</span>
    </button>
  );
};

interface IconButtonProps {
  icon: ReactNode;
  variant?: 'icon';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  className?: string | undefined; // Updated to explicitly allow undefined
  ariaLabel?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ 
  icon, 
  variant = 'icon',
  size = 'medium',
  disabled = false,
  onClick = () => {},
  className = '',
  ariaLabel,
}) => {
  const variantClass = styles[`btn-${variant}`] || '';
  const sizeClass = styles[`btn-${size}`] || '';
  
  return (
    <button
      type="button"
      className={`${styles['btn']} ${styles['btn-icon-only'] || ''} ${variantClass} ${sizeClass} ${className || ''}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
};

export default Button;