import React, { useEffect, useState } from 'react';
import { getCurrentUser } from './utils/api';
import './ProfileModal.css';

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

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchUserProfile()
        .then(profile => setProfile(profile || null))
        .catch(() => setProfile(null))
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
        {!profile && !loading && <div className="error-message">Profile not found.</div>}
      </div>
    </div>
  );
};

export default ProfileModal;
