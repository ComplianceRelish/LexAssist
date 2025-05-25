// Centralized API helper for frontend/backend integration
const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export async function analyzeBrief(text: string) {
  const response = await fetch(`${BASE_URL}/api/analyze-brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) {
    throw new Error('Failed to analyze brief');
  }
  return response.json();
}

export async function healthCheck() {
  const response = await fetch(`${BASE_URL}/api/health`);
  return response.json();
}

export async function sendOtp({ email, phone }: { email?: string; phone?: string }) {
  const response = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone }),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to send OTP');
  return data;
}

export async function verifyOtp({ email, phone, token, type }: { email?: string; phone?: string; token: string; type: 'email' | 'sms' }) {
  const response = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, token, type }),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to verify OTP');
  return data;
}

export async function registerUser({ email, phone }: { email?: string; phone?: string }) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone }),
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to register');
  return data;
}

export async function login(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Login failed');
  return response.json();
}

export async function getCurrentUser() {
  const response = await fetch(`${BASE_URL}/api/auth/user`, {
    credentials: 'include',
  });
  if (!response.ok) return null;
  return response.json();
}

export async function logout() {
  const response = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to logout');
  return response.json();
}

export async function updateUserProfile(profile: {
  fullName?: string;
  address?: string;
  age?: string;
  email?: string;
  phone?: string;
}) {
  const response = await fetch(`${BASE_URL}/api/user/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profile),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update profile');
  return data;
}

export async function fetchUserProfile() {
  const response = await fetch(`${BASE_URL}/api/user/profile`, {
    method: 'GET',
    credentials: 'include',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch profile');
  return data.profile;
}
