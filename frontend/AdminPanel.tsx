import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  age: number | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface AdminPanelProps {
  currentUserId: string;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state for add/edit
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState('user');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${BACKEND}/api/admin/users`, {
        credentials: 'include',
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to fetch users');
      }
      const data = await resp.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const openAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('user');
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (user: UserProfile) => {
    setFormName(user.full_name || '');
    setFormEmail(user.email || '');
    setFormPhone(user.phone || '');
    setFormRole(user.role || 'user');
    setFormError(null);
    setEditingUser(user);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Name and email are required');
      return;
    }
    setActionLoading(true);
    setFormError(null);
    try {
      const resp = await fetch(`${BACKEND}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: formRole,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to create user');
      setShowAddModal(false);
      showSuccess(`User ${formEmail} created successfully`);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formName.trim()) {
      setFormError('Name is required');
      return;
    }
    setActionLoading(true);
    setFormError(null);
    try {
      const resp = await fetch(`${BACKEND}/api/admin/users/${editingUser.user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          role: formRole,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to update user');
      setEditingUser(null);
      showSuccess('User updated successfully');
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const resp = await fetch(`${BACKEND}/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to delete user');
      setDeleteConfirm(null);
      showSuccess('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
      setDeleteConfirm(null);
    } finally {
      setActionLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <span className="admin-role-badge admin-role-super">Super Admin</span>;
      case 'admin': return <span className="admin-role-badge admin-role-admin">Admin</span>;
      default: return <span className="admin-role-badge admin-role-user">User</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h1 className="admin-panel-title">👥 User Management</h1>
          <p className="admin-panel-sub">Manage users, roles, and access for LexAssist</p>
        </div>
        <button className="admin-add-btn" onClick={openAddModal}>
          + Add User
        </button>
      </div>

      {successMsg && (
        <div className="admin-success-toast">{successMsg}</div>
      )}

      {error && (
        <div className="admin-error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <span>Loading users…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">👤</div>
          <p>No users found</p>
          <p className="admin-empty-sub">Add your first user to get started</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.user_id}>
                    <td className="admin-td-name">{user.full_name || '—'}</td>
                    <td>{user.email || '—'}</td>
                    <td>{user.phone || '—'}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td className="admin-td-actions">
                      <button
                        className="admin-action-btn admin-action-edit"
                        onClick={() => openEditModal(user)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      {user.user_id !== currentUserId && (
                        <button
                          className="admin-action-btn admin-action-delete"
                          onClick={() => setDeleteConfirm(user.user_id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="admin-cards-mobile">
            {users.map((user) => (
              <div className="admin-user-card" key={user.user_id}>
                <div className="admin-card-top">
                  <div className="admin-card-avatar">
                    {(user.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-card-info">
                    <div className="admin-card-name">{user.full_name || '—'}</div>
                    <div className="admin-card-email">{user.email}</div>
                  </div>
                  {getRoleBadge(user.role)}
                </div>
                <div className="admin-card-details">
                  {user.phone && <span>📱 {user.phone}</span>}
                  <span>📅 {formatDate(user.created_at)}</span>
                </div>
                <div className="admin-card-actions">
                  <button className="admin-card-btn admin-card-edit" onClick={() => openEditModal(user)}>
                    ✏️ Edit
                  </button>
                  {user.user_id !== currentUserId && (
                    <button className="admin-card-btn admin-card-delete" onClick={() => setDeleteConfirm(user.user_id)}>
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Add New User</h2>
              <button className="admin-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser} className="admin-modal-form">
              <div className="admin-field">
                <label>Full Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="John Doe"
                  autoFocus
                />
              </div>
              <div className="admin-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="admin-field">
                <label>Phone</label>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="9876543210"
                />
              </div>
              <div className="admin-field">
                <label>Role</label>
                <select value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {formError && <div className="admin-form-error">{formError}</div>}
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-save" disabled={actionLoading}>
                  {actionLoading ? 'Creating…' : 'Create User'}
                </button>
              </div>
              <p className="admin-modal-hint">
                User will be able to log in via magic link (email) only
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="admin-modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Edit User</h2>
              <button className="admin-modal-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleEditUser} className="admin-modal-form">
              <div className="admin-field">
                <label>Full Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="admin-field">
                <label>Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label>Phone</label>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label>Role</label>
                <select value={formRole} onChange={(e) => setFormRole(e.target.value)}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {formError && <div className="admin-form-error">{formError}</div>}
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-cancel" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn-save" disabled={actionLoading}>
                  {actionLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="admin-delete-confirm">
              <div className="admin-delete-icon">⚠️</div>
              <h3>Delete User?</h3>
              <p>This will permanently remove this user from the system. This action cannot be undone.</p>
              <div className="admin-modal-actions">
                <button className="admin-btn-cancel" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </button>
                <button
                  className="admin-btn-delete"
                  onClick={() => handleDeleteUser(deleteConfirm)}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Deleting…' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
