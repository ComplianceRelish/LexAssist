import React, { useEffect, useState } from "react";
import {
  getAllTiers,
  createTier,
  updateTier,
  deleteTier,
  assignTierToOrg,
  getAllOrganizations,
  getAllUsers,
  revokeAdminRole,
  Tier,
  Organization,
  UserProfile
} from "./utils/saasAdminApi";
import "./AdminTiersDashboard.css";

const emptyTier = {
  display_name: "",
  name: "",
  price: 0,
  currency: "INR",
  user_limit: 1,
  duration_days: 30,
  description: ""
};

export default function AdminTiersDashboard() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [newTier, setNewTier] = useState(emptyTier);
  const [assignOrgId, setAssignOrgId] = useState("");
  const [assignTierId, setAssignTierId] = useState("");
  const [revokeUserId, setRevokeUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      setTiers(await getAllTiers());
      setOrgs(await getAllOrganizations());
      setUsers(await getAllUsers());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTier() {
    setLoading(true);
    try {
      await createTier(newTier);
      setSuccess("Tier created");
      setNewTier(emptyTier);
      fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTier() {
    if (!editingTier) return;
    setLoading(true);
    try {
      await updateTier(editingTier.id, editingTier);
      setSuccess("Tier updated");
      setEditingTier(null);
      fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTier(id: string) {
    setLoading(true);
    try {
      await deleteTier(id);
      setSuccess("Tier deleted");
      fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignTier() {
    setLoading(true);
    try {
      await assignTierToOrg(assignOrgId, assignTierId);
      setSuccess("Tier assigned to organization");
      fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeAdmin() {
    setLoading(true);
    try {
      await revokeAdminRole(revokeUserId);
      setSuccess("Admin role revoked");
      fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-tiers-dashboard">
      <h2>Subscription Tiers Management</h2>
      {loading && <div className="loading-message">Loading...</div>}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="tiers-list">
        <h3>All Tiers</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Display Name</th>
              <th>Price</th>
              <th>User Limit</th>
              <th>Duration (days)</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tiers.map(tier => (
              <tr key={tier.id}>
                <td>{tier.name}</td>
                <td>{tier.display_name}</td>
                <td>{tier.price} {tier.currency}</td>
                <td>{tier.user_limit || 'Unlimited'}</td>
                <td>{tier.duration_days}</td>
                <td>{tier.description}</td>
                <td>
                  <button onClick={() => setEditingTier(tier)}>Edit</button>
                  <button onClick={() => handleDeleteTier(tier.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="create-tier-form">
        <h3>Create New Tier</h3>
        <input placeholder="Name" value={newTier.name} onChange={e => setNewTier({ ...newTier, name: e.target.value })} />
        <input placeholder="Display Name" value={newTier.display_name} onChange={e => setNewTier({ ...newTier, display_name: e.target.value })} />
        <input placeholder="Price" type="number" value={newTier.price} onChange={e => setNewTier({ ...newTier, price: Number(e.target.value) })} />
        <input placeholder="User Limit" type="number" value={newTier.user_limit} onChange={e => setNewTier({ ...newTier, user_limit: Number(e.target.value) })} />
        <input placeholder="Duration Days" type="number" value={newTier.duration_days} onChange={e => setNewTier({ ...newTier, duration_days: Number(e.target.value) })} />
        <input placeholder="Description" value={newTier.description} onChange={e => setNewTier({ ...newTier, description: e.target.value })} />
        <button onClick={handleCreateTier}>Create Tier</button>
      </div>

      {editingTier && (
        <div className="edit-tier-form">
          <h3>Edit Tier</h3>
          <input placeholder="Name" value={editingTier.name} onChange={e => setEditingTier({ ...editingTier, name: e.target.value })} />
          <input placeholder="Display Name" value={editingTier.display_name} onChange={e => setEditingTier({ ...editingTier, display_name: e.target.value })} />
          <input placeholder="Price" type="number" value={editingTier.price} onChange={e => setEditingTier({ ...editingTier, price: Number(e.target.value) })} />
          <input placeholder="User Limit" type="number" value={editingTier.user_limit ?? ''} onChange={e => setEditingTier({ ...editingTier, user_limit: e.target.value === '' ? null : Number(e.target.value) })} />
          <input placeholder="Duration Days" type="number" value={editingTier.duration_days} onChange={e => setEditingTier({ ...editingTier, duration_days: Number(e.target.value) })} />
          <input placeholder="Description" value={editingTier.description} onChange={e => setEditingTier({ ...editingTier, description: e.target.value })} />
          <button onClick={handleUpdateTier}>Save</button>
          <button onClick={() => setEditingTier(null)}>Cancel</button>
        </div>
      )}

      <div className="assign-tier-form">
        <h3>Assign Tier to Organization</h3>
        <select value={assignOrgId} onChange={e => setAssignOrgId(e.target.value)}>
          <option value="">Select Organization</option>
          {orgs.map(org => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>
        <select value={assignTierId} onChange={e => setAssignTierId(e.target.value)}>
          <option value="">Select Tier</option>
          {tiers.map(tier => (
            <option key={tier.id} value={tier.name}>{tier.display_name}</option>
          ))}
        </select>
        <button onClick={handleAssignTier}>Assign Tier</button>
      </div>

      <div className="revoke-admin-form">
        <h3>Revoke Admin Role</h3>
        <select value={revokeUserId} onChange={e => setRevokeUserId(e.target.value)}>
          <option value="">Select User</option>
          {users.filter(u => u.role === 'admin').map(user => (
            <option key={user.user_id} value={user.user_id}>{user.full_name || user.email}</option>
          ))}
        </select>
        <button onClick={handleRevokeAdmin}>Revoke Admin</button>
      </div>

      {/* Placeholder for payments integration (Razorpay, etc.) */}
      <div className="payments-placeholder">
        <h3>Payments Integration</h3>
        <div>Razorpay integration coming soon...</div>
      </div>
    </div>
  );
}
