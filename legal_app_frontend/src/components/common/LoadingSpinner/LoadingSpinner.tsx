import React from 'react';
import spinnerSvg from '../../../../public/images/spinner/spinner.svg';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 50,
  className = '',
  ariaLabel = 'Loading...'
}) => {
  return (
    <div className={`${styles['spinner-container']} ${className}`}>
      <object 
        type="image/svg+xml" 
        data={spinnerSvg} 
        className={styles.spinner}
        style={{
          width: `${size}px`,
          height: `${size}px`
        }}
        aria-label={ariaLabel}
      />
    </div>
  );
};

export default LoadingSpinner;
