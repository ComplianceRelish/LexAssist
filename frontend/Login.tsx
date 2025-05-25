import React, { useState } from 'react';
import { sendOtp, verifyOtp } from './utils/api';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setError(null);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value);
    setError(null);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      setError('Please enter either email or phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendOtp({ email: email || undefined, phone: phone || undefined });
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
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
      await verifyOtp({
        email: email || undefined,
        phone: phone || undefined,
        token: otp,
        type: email ? 'email' : 'sms',
      });
      setVerified(true);
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email && !phone) {
      setError('Please enter either email or phone number');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let { error } = { error: null };
      
      if (email) {
        // Send OTP to email
        ({ error } = await supabase.auth.signInWithOtp({
          email
        }));
      } else if (phone) {
        // Send OTP to phone
        ({ error } = await supabase.auth.signInWithOtp({
          phone
        }));
      }
      
      if (error) {
        throw error;
      }
      
      setOtpSent(true);
    } catch (error: any) {
      setError(error.message || 'An error occurred while sending OTP');
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
      let { data, error } = { data: null, error: null };
      
      if (email) {
        // Verify email OTP
        ({ data, error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        }));
      } else if (phone) {
        // Verify phone OTP
        ({ data, error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: 'sms'
        }));
      }
      
      if (error) {
        throw error;
      }
      
      // Redirect to home page on successful login
      navigate('/');
    } catch (error: any) {
      setError(error.message || 'An error occurred while verifying OTP');
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
          <img src="/images/logo.png" alt="Lex Assist Logo" />
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
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Enter the OTP"
                disabled={loading}
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
          <div className="success-message">Login successful!</div>
        )}
        <div className="login-footer">
          <p>Don't have an account?</p>
          <button
            className="register-button"
            // onClick={handleRegisterClick}
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
