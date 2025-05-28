import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './RegisterModal.css';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [age, setAge] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate form before submission
  const validateForm = () => {
    if (!fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!email && !phone) {
      setError('Email or phone is required');
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
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with your actual API integration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demonstration - in real app, use your API service
      // await registerUser({ email: email || undefined, phone: phone || undefined });
      // await sendOtp({ email: email || undefined, phone: phone || undefined });
      
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
      // Mock API call - replace with your actual API integration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demonstration - in real app, use your API service
      // await verifyOtp({
      //   email: email || undefined,
      //   phone: phone || undefined,
      //   token: otp,
      //   type: email ? 'email' : 'sms',
      // });
      // 
      // await updateUserProfile({
      //   fullName,
      //   email,
      //   phone,
      //   address,
      //   age
      // });
      
      setSuccess(true);
      
      // Notify parent component about successful registration
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock API call - replace with your actual API integration
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demonstration - in real app, use your API service
      // await sendOtp({ email: email || undefined, phone: phone || undefined });
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };
  
  // Close modal when clicking outside or pressing Escape key
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };
  
  React.useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose, loading]);

  return (
    <div 
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className={`modal-content${isOpen ? ' slide-in' : ''}`}>
        <button className="modal-close" onClick={onClose} disabled={loading}>&times;</button>
        
        <h2 className="modal-title">Create Your Account</h2>
        <p className="modal-subtitle">Join LexAssist for AI-powered legal assistance</p>
        
        {!otpSent && !success && (
          <form className="register-form" onSubmit={handleSendOtp}>
            <div className="form-group">
              <label htmlFor="fullName">Full Name*</label>
              <input 
                id="fullName"
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                required 
                disabled={loading}
                placeholder="Enter your full name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input 
                id="email"
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                disabled={loading || !!phone}
                placeholder="Enter your email address"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">Mobile Number</label>
              <input 
                id="phone"
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                disabled={loading || !!email}
                placeholder="Enter your mobile number"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="address">Address</label>
              <input 
                id="address"
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                disabled={loading}
                placeholder="Enter your address (optional)"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input 
                id="age"
                type="number" 
                value={age} 
                onChange={e => setAge(e.target.value)} 
                disabled={loading}
                placeholder="Enter your age (optional)"
                min="18"
                max="120"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              type="submit" 
              className="register-button" 
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Register & Send OTP'}
            </button>
            
            <div className="login-link">
              Already have an account? <Link to="/login">Log In</Link>
            </div>
          </form>
        )}
        
        {otpSent && !success && (
          <form className="register-form" onSubmit={handleVerifyOtp}>
            <p className="otp-sent-to">
              {email ? `OTP sent to ${email}` : `OTP sent to ${phone}`}
            </p>
            
            <div className="form-group otp-field">
              <label htmlFor="otp">Enter OTP</label>
              <input 
                id="otp"
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                disabled={loading}
                placeholder="Enter the OTP"
                maxLength={6}
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              type="submit" 
              className="register-button" 
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-button"
            >
              Resend OTP
            </button>
          </form>
        )}
        
        {success && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            Registration successful!
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterModal;
