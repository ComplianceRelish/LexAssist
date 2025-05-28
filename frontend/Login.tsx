import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setPhone(''); // Clear phone when typing email
    setError(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setEmail(''); // Clear email when typing phone
    setError(null);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value);
    setError(null);
  };

  const validateLoginForm = () => {
    if (!email && !phone) {
      setError('Please enter either email or phone number');
      return false;
    }
    
    if (email && !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    
    if (phone && !/^\+?[0-9]{10,15}$/.test(phone)) {
      setError('Please enter a valid phone number');
      return false;
    }
    
    return true;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Send OTP via backend
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email || undefined, 
          phone: phone || undefined 
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while sending OTP');
      }
      
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Verify OTP via backend
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || undefined,
          phone: phone || undefined,
          token: otp,
          type: email ? 'email' : 'sms'
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while verifying OTP');
      }
      
      setVerified(true);
      
      // Redirect to home page on successful login
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <img 
            src="/images/logo.png" 
            alt="Lex Assist Logo"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/favicon.png';
            }}
          />
        </div>
        
        <h1 className="login-title">Welcome to Lex Assist</h1>
        
        {!otpSent && !verified && (
          <form className="login-form" onSubmit={handleSendOtp}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">OR Phone Number</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Enter your phone number"
                disabled={loading}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}
        
        {otpSent && !verified && (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <p className="otp-sent-to">
                OTP sent to {email || phone}
              </p>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Enter the OTP"
                disabled={loading}
                maxLength={6}
                className="otp-input"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <button
              type="button"
              className="text-button"
              onClick={handleSendOtp}
              disabled={loading}
            >
              Resend OTP
            </button>
          </form>
        )}
        
        {verified && (
          <div className="success-message">Login successful! Redirecting...</div>
        )}
        
        <div className="login-footer">
          <p>Don't have an account?</p>
          <button
            className="register-button"
            onClick={handleRegisterClick}
            disabled={loading}
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
