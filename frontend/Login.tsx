import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import './Login.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Authenticate via backend (Name + Phone lookup → Supabase sign-in)
      const resp = await fetch(`${BACKEND}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
        credentials: 'include',
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');

      // Also sign in on the frontend Supabase client to sync session
      // Backend already set cookies; now get the user's email from response and sign in client-side
      if (data.user?.email) {
        await supabase.auth.signInWithPassword({
          email: data.user.email,
          password: phone.trim(),
        });
      }

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 600);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
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

        {!success ? (
          <form className="login-form" onSubmit={handleLogin}>
            <p className="login-subtitle">
              Sign in with your name and mobile number
            </p>

            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Mobile Number</label>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => {
                  // Allow only digits
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhone(val);
                  setError(null);
                }}
                placeholder="10-digit mobile number"
                autoComplete="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <span className="login-btn-loading">
                  <span className="login-spinner"></span>
                  Signing in…
                </span>
              ) : (
                <>🔐 Sign In</>
              )}
            </button>

            <p className="login-hint">
              Use the name and mobile number registered by your administrator
            </p>
          </form>
        ) : (
          <div className="success-message">Login successful! Redirecting…</div>
        )}
      </div>
    </div>
  );
};

export default Login;
