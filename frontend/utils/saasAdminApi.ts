// --- SaaS Admin Types ---
export interface Tier {
  id: string;
  name: string;
  display_name: string;
  price: number;
  currency: string;
  user_limit: number | null;
  duration_days: number;
  description: string;
}
export interface Organization {
  id: string;
  name: string;
  tier: string;
}
export interface UserProfile {
  user_id: string;
  full_name?: string;
  email?: string;
  role?: string;
}

// Uses Vite env variable for backend URL. See Netlify/Vite docs for env setup.
// @ts-ignore: Vite-specific property
const BASE_URL = import.meta.env?.VITE_BACKEND_URL || 'http://localhost:5000';

// --- Admin API helpers ---
export async function getAllTiers(): Promise<Tier[]> {
  const res = await fetch(`${BASE_URL}/api/admin/subscription-tiers`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch tiers');
  return res.json();
}
export async function createTier(tier: Partial<Tier>): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/subscription-tiers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(tier),
  });
  if (!res.ok) throw new Error('Failed to create tier');
}
export async function updateTier(id: string, tier: Partial<Tier>): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/subscription-tiers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(tier),
  });
  if (!res.ok) throw new Error('Failed to update tier');
}
export async function deleteTier(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/subscription-tiers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete tier');
}
export async function assignTierToOrg(org_id: string, tier: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/assign-tier`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ org_id, tier }),
  });
  if (!res.ok) throw new Error('Failed to assign tier');
}
export async function getAllOrganizations(): Promise<Organization[]> {
  const res = await fetch(`${BASE_URL}/api/organizations`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch organizations');
  return res.json();
}
export async function getAllUsers(): Promise<UserProfile[]> {
  const res = await fetch(`${BASE_URL}/api/users`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}
export async function revokeAdminRole(user_id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/admin/revoke-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ user_id }),
  });
  if (!res.ok) throw new Error('Failed to revoke admin role');
}
