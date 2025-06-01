import React, { useState } from 'react';
import { LoginProps } from '../../types';
import './Login.css';
import LexAssistApiClient from '../../services/LexAssistApiClient';

const apiClient = new LexAssistApiClient(
  import.meta.env.VITE_BACKEND_URL || 'https://lexassist-backend.onrender.com',
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginMethod, setLoginMethod] = useState<string>('email');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const success = await apiClient.login(email, password);
      if (success) {
        // Get user from client after successful login
        const user = apiClient.getCurrentUser();
        if (user) {
          onLogin(user);
        } else {
          setError('Login successful but user data could not be retrieved.');
        }
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpSent) {
      // Send OTP
      if (validateMobile(mobile)) {
        setError('');
        setIsLoading(true);
        
        try {
          const success = await apiClient.requestOTP(mobile);
          if (success) {
            setOtpSent(true);
          } else {
            setError('Failed to send OTP. Please try again.');
          }
        } catch (err) {
          console.error('OTP request error:', err);
          setError('An error occurred while sending OTP. Please try again.');
        } finally {
          setIsLoading(false);
        }
      } else {
        setError('Please enter a valid mobile number.');
      }
    } else {
      // Verify OTP
      setError('');
      setIsLoading(true);
      
      try {
        const success = await apiClient.loginWithOTP(mobile, otp);
        if (success) {
          const user = apiClient.getCurrentUser();
          if (user) {
            onLogin(user);
          } else {
            setError('OTP verification successful but user data could not be retrieved.');
          }
        } else {
          setError('Invalid OTP. Please try again.');
        }
      } catch (err) {
        console.error('OTP verification error:', err);
        setError('An error occurred during OTP verification. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  
  // Helper function to validate mobile format
  const validateMobile = (mobile: string): boolean => {
    return mobile.length >= 10 && /^\d+$/.test(mobile);
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
              <a href="#" onClick={(e) => { e.preventDefault(); alert('Contact support for password reset'); }}>Forgot password?</a>
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
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
