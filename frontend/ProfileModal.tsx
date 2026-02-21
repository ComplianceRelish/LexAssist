import React, { useEffect, useState } from 'react';
import {
  fetchUserProfile as apiFetchProfile,
  updateUserProfile as apiUpdateProfile,
} from './utils/api';
import './ProfileModal.css';

// Fetch profile via backend API (uses cookie auth + service-role key, bypasses RLS)
async function fetchUserProfile(): Promise<{ profile: UserProfile | null; error?: string }> {
  try {
    const data = await apiFetchProfile();
    if (!data) return { profile: { fullName: '', email: '', phone: '', address: '', age: '' } };
    // Map snake_case DB columns to camelCase UI fields
    return {
      profile: {
        fullName: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        age: data.age != null ? String(data.age) : '',
      },
    };
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return { profile: null, error: error?.message || 'Could not connect to server' };
  }
}

// Update profile via backend API
async function updateUserProfile(profile: UserProfile): Promise<void> {
  try {
    await apiUpdateProfile({
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      age: profile.age,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update profile');
  }
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  age?: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setFetchError(null);
      fetchUserProfile()
        .then(result => {
          setProfile(result.profile);
          setFetchError(result.error || null);
        })
        .catch(() => {
          setProfile(null);
          setFetchError('Could not connect to server');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const [editMode, setEditMode] = useState(false);
  const [editProfile, setEditProfile] = useState<UserProfile | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  const startEdit = () => {
    setEditProfile(profile);
    setEditMode(true);
    setEditError(null);
    setEditSuccess(false);
  };
  const cancelEdit = () => {
    setEditMode(false);
    setEditProfile(null);
    setEditError(null);
    setEditSuccess(false);
  };
  const handleField = (field: keyof UserProfile, value: string) => {
    setEditProfile(p => ({ ...p!, [field]: value }));
  };
  const saveEdit = async () => {
    if (!editProfile) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await updateUserProfile(editProfile);
      setEditSuccess(true);
      setEditMode(false);
      setProfile(editProfile);
    } catch (e: any) {
      setEditError(e.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className={`modal-overlay${isOpen ? ' open' : ''}`}>  {/* Brand-consistent modal overlay */}
      <div className={`modal-content${isOpen ? ' slide-in' : ''}`}> {/* Slick transition */}
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">Your Profile</h2>
        {loading && <div className="loading-message">Loading...</div>}
        {profile && !loading && !editMode && (
          <div className="profile-details">
            <div><strong>Full Name:</strong> {profile.fullName || '-'}</div>
            <div><strong>Email:</strong> {profile.email || '-'}</div>
            <div><strong>Mobile Number:</strong> {profile.phone || '-'}</div>
            <div><strong>Address:</strong> {profile.address || '-'}</div>
            <div><strong>Age:</strong> {profile.age || '-'}</div>
            <button className="register-button" style={{marginTop:'1rem'}} onClick={startEdit}>Edit</button>
          </div>
        )}
        {editMode && editProfile && (
          <div className="profile-details">
            <div><strong>Full Name:</strong> <input value={editProfile.fullName||''} onChange={e=>handleField('fullName',e.target.value)} /></div>
            <div><strong>Email:</strong> <input value={editProfile.email||''} onChange={e=>handleField('email',e.target.value)} /></div>
            <div><strong>Mobile Number:</strong> <input value={editProfile.phone||''} onChange={e=>handleField('phone',e.target.value)} /></div>
            <div><strong>Address:</strong> <input value={editProfile.address||''} onChange={e=>handleField('address',e.target.value)} /></div>
            <div><strong>Age:</strong> <input value={editProfile.age||''} onChange={e=>handleField('age',e.target.value)} /></div>
            {editError && <div className="error-message">{editError}</div>}
            {editSuccess && <div className="success-message">Profile updated!</div>}
            <div style={{display:'flex',gap:'0.7rem',marginTop:'1rem'}}>
              <button className="register-button" onClick={saveEdit} disabled={editLoading}>{editLoading ? 'Saving...' : 'Save'}</button>
              <button className="register-button" style={{background:'#cbd5e1',color:'#1e293b'}} onClick={cancelEdit} disabled={editLoading}>Cancel</button>
            </div>
          </div>
        )}
        {!profile && !loading && (
          <div className="error-message">
            {fetchError || 'No profile data yet. Click Edit to set up your profile.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
