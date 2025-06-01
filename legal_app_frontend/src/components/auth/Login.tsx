import React, { useState } from 'react';
import { LoginProps } from '../../types';
import './Login.css';

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginMethod, setLoginMethod] = useState<string>('email');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // For preview purposes, accept any email with valid format and any password
      if (validateEmail(email) && password.length >= 6) {
        // Mock user data
        const user = {
          id: '1',
          email: email,
          name: email.split('@')[0],
          role: email.includes('admin') ? 'admin' as const : email.includes('super') ? 'super_admin' as const : 'user' as const,
          subscription: getSubscriptionByEmail(email)
        };
        
        onLogin(user);
      } else {
        setError('Invalid email or password. For the preview, use any valid email and password (min 6 characters).');
      }
      
      setIsLoading(false);
    }, 1500);
  };
  
  const handleOtpLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpSent) {
      // Send OTP
      if (validateMobile(mobile)) {
        setError('');
        setIsLoading(true);
        
        // Simulate API call
        setTimeout(() => {
          setOtpSent(true);
          setIsLoading(false);
        }, 1500);
      } else {
        setError('Please enter a valid mobile number.');
      }
    } else {
      // Verify OTP
      setError('');
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        // For preview purposes, accept any 6-digit OTP
        if (otp.length === 6 && /^\d+$/.test(otp)) {
          // Mock user data
          const user = {
            id: '2',
            email: `user${mobile.slice(-4)}@example.com`,
            name: `User ${mobile.slice(-4)}`,
            role: 'user' as const,
            subscription: {
              tier: 'free' as const,
              expiresAt: '2025-12-31',
              features: ['basic_analysis', 'limited_results', 'pdf_export']
            }
          };
          
          onLogin(user);
        } else {
          setError('Invalid OTP. For the preview, enter any 6 digits.');
        }
        
        setIsLoading(false);
      }, 1500);
    }
  };
  
  // Helper function to validate email format
  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  // Helper function to validate mobile format
  const validateMobile = (mobile: string): boolean => {
    return mobile.length >= 10 && /^\d+$/.test(mobile);
  };
  
  // Helper function to get subscription based on email
  const getSubscriptionByEmail = (email: string) => {
    if (email.includes('free')) {
      return {
        tier: 'free' as const,
        expiresAt: '2025-12-31',
        features: ['basic_analysis', 'limited_results', 'pdf_export']
      };
    } else if (email.includes('pro')) {
      return {
        tier: 'pro' as const,
        expiresAt: '2025-12-31',
        features: [
          'enhanced_analysis', 
          'comprehensive_results', 
          'document_segmentation', 
          'advanced_statute_identification', 
          'judgment_prediction', 
          'all_document_formats', 
          'email_sharing', 
          'whatsapp_sharing'
        ]
      };
    } else if (email.includes('enterprise')) {
      return {
        tier: 'enterprise' as const,
        expiresAt: '2025-12-31',
        features: [
          'enhanced_analysis', 
          'unlimited_results', 
          'document_segmentation', 
          'advanced_statute_identification', 
          'judgment_prediction', 
          'all_document_formats', 
          'email_sharing', 
          'whatsapp_sharing',
          'risk_assessment',
          'strategic_considerations',
          'alternative_approaches',
          'comparative_jurisprudence',
          'success_probability'
        ]
      };
    } else {
      return {
        tier: 'free' as const,
        expiresAt: '2025-12-31',
        features: ['basic_analysis', 'limited_results', 'pdf_export']
      };
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src="/images/logo.png" alt="Lex Assist Logo" className="login-logo" />
          <h2>Welcome to Lex Assist</h2>
        </div>
        
        <div className="login-tabs">
          <button 
            className={loginMethod === 'email' ? 'active' : ''} 
            onClick={() => setLoginMethod('email')}
          >
            Email Login
          </button>
          <button 
            className={loginMethod === 'otp' ? 'active' : ''} 
            onClick={() => setLoginMethod('otp')}
          >
            OTP Login
          </button>
        </div>
        
        {loginMethod === 'email' ? (
          <form className="login-form" onSubmit={handleEmailLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                type="email" 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={isLoading}
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={isLoading}
                placeholder="Enter your password"
              />
              <span className="password-note">
                For preview: Use any valid email and password (min 6 characters)
              </span>
            </div>
            <button 
              type="submit" 
              className="login-button" 
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="login-footer">
              <div className="preview-note">
                <p><strong>Preview Login Tips:</strong></p>
                <ul>
                  <li>For Free tier access: Use an email containing "free"</li>
                  <li>For Pro tier access: Use an email containing "pro"</li>
                  <li>For Enterprise tier access: Use an email containing "enterprise"</li>
                  <li>For Admin access: Use an email containing "admin"</li>
                  <li>For Super Admin access: Use an email containing "super"</li>
                </ul>
                <p>Example: "pro-user@example.com" will log you in as a Pro tier user</p>
              </div>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleOtpLogin}>
            <div className="form-group">
              <label htmlFor="mobile">Mobile Number</label>
              <input 
                type="tel" 
                id="mobile" 
                value={mobile} 
                onChange={(e) => setMobile(e.target.value)} 
                required 
                disabled={isLoading || otpSent}
                placeholder="Enter your mobile number"
              />
            </div>
            
            {otpSent && (
              <div className="form-group">
                <label htmlFor="otp">OTP</label>
                <input 
                  type="text" 
                  id="otp" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  required 
                  disabled={isLoading}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                />
                <span className="password-note">
                  For preview: Enter any 6 digits
                </span>
              </div>
            )}
            
            <button 
              type="submit" 
              className="login-button" 
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : otpSent ? 'Verify OTP' : 'Send OTP'}
            </button>
            
            {otpSent && (
              <button 
                type="button" 
                className="resend-button" 
                onClick={() => setOtpSent(false)}
                disabled={isLoading}
              >
                Resend OTP
              </button>
            )}
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="login-footer">
              <div className="preview-note">
                <p><strong>Preview Login Tips:</strong></p>
                <p>Enter any valid mobile number (min 10 digits) and any 6-digit OTP</p>
                <p>OTP login will create a Free tier user account</p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
