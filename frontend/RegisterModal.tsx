import React, { useState } from 'react';
import { registerUser, sendOtp, verifyOtp } from './utils/api';
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      setError('Email or phone is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await registerUser({ email: email || undefined, phone: phone || undefined });
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
      // After OTP verification, update demographic profile
      await updateUserProfile({
        fullName,
        email,
        phone,
        address,
        age
      });
      setSuccess(true);
      onSuccess();
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal-overlay${isOpen ? ' open' : ''}`}>  {/* Brand-consistent modal overlay */}
      <div className={`modal-content${isOpen ? ' slide-in' : ''}`}> {/* Slick transition */}
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">Create Your Account</h2>
        {!otpSent && !success && (
          <form className="register-form" onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} disabled={loading} />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="register-button" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Register & Send OTP'}
            </button>
          </form>
        )}
        {otpSent && !success && (
          <form className="register-form" onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label>Enter OTP</label>
              <input value={otp} onChange={e => setOtp(e.target.value)} disabled={loading} />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="register-button" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        )}
        {success && <div className="success-message">Registration successful!</div>}
      </div>
    </div>
  );
};

export default RegisterModal;
