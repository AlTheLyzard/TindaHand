/**
 * Kahera (cashier) account management API calls.
 * All endpoints require a valid May-Ari (owner) JWT.
 */
import { ApiError, apiFetch } from '@/services/api';
import type { SettingsResult } from '@/types/settings';

export interface KaheraRecord {
  id: string;        // e.g. "TH-KH-0001"
  ownerId: string;   // e.g. "TH-MA-0001"
  name: string;
  status: 'active' | 'inactive';
  avatarId: string | null;
}

/**
 * GET /auth/kahera/has-operators?owner_id=TH-MA-XXXX
 * Public — no JWT required.
 * Returns true if the given owner has at least one active Kahera.
 * Used by the Choose Account screen (user is not logged in yet).
 */
/** Public — no JWT needed. Returns whether any active owners/kaheras exist on the server. */
export async function fetchHasAccounts(): Promise<{ has_owners: boolean; has_kaheras: boolean }> {
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.254.103:8000';
    const res = await fetch(`${API_URL}/auth/has-accounts`);
    if (!res.ok) return { has_owners: false, has_kaheras: false };
    return res.json() as Promise<{ has_owners: boolean; has_kaheras: boolean }>;
  } catch {
    return { has_owners: false, has_kaheras: false };
  }
}

export async function hasKaheraOperators(ownerId: string): Promise<boolean> {
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.254.103:8000';
    const res = await fetch(
      `${API_URL}/auth/kahera/has-operators?owner_id=${encodeURIComponent(ownerId)}`,
    );
    if (!res.ok) return false;
    const data = await res.json() as { has_operators: boolean };
    return data.has_operators;
  } catch {
    return false;
  }
}

/**
 * GET /auth/kahera/list
 * Returns all Kahera accounts for the logged-in owner.
 * Requires a valid May-Ari (owner) JWT.
 */
export async function listKaheras(): Promise<KaheraRecord[]> {
  try {
    return await apiFetch<KaheraRecord[]>('/auth/kahera/list');
  } catch {
    return [];
  }
}

/**
 * POST /auth/kahera/create
 * Creates a new Kahera account under the logged-in owner's store.
 * Requires: { full_name, pin, avatar_id? }
 */
export async function createKahera(
  values: { name: string; pin: string; avatarId?: string },
): Promise<SettingsResult<KaheraRecord>> {
  try {
    const data = await apiFetch<KaheraRecord>('/auth/kahera/create', {
      method: 'POST',
      body: JSON.stringify({
        full_name: values.name.trim(),
        pin: values.pin,
        avatar_id: values.avatarId ?? null,
      }),
    });
    return { ok: true, value: data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401 || err.status === 403)
        return { ok: false, message: 'You must be logged in as an Owner to add Operators.' };
      if (err.status === 422)
        return { ok: false, message: 'Invalid details. Check the name and PIN and try again.' };
      return { ok: false, message: `Server error (${err.status}). Please try again.` };
    }
    return { ok: false, message: 'Could not reach server. Check your connection.' };
  }
}
