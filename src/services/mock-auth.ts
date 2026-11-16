import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoOwner } from '@/data/mock-auth';
import { settingsService } from '@/services/settings';
import type { AccountRole, MockOwnerSession } from '@/types/auth';
import { validateLogin } from '@/utils/account-access';

// ── MOCK (dev only) ──────────────────────────────────────────────
export function authenticateMockOwner(role: AccountRole, id: string, pin: string): MockOwnerSession | null {
  if (!MOCK_AUTH_ENABLED || role !== 'owner') return null;
  const errors = validateLogin(id, pin);
  if (errors.id || errors.pin || id !== demoOwner.id || !settingsService.verifyOwnerPin(id, pin)) return null;
  return { kind: 'mock', role: 'owner', owner: { id: demoOwner.id, name: demoOwner.name } };
}

// ── REAL LOGIN ───────────────────────────────────────────────────
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export type LoginResult =
  | { status: 'ok'; token: string; name: string }
  | { status: 'invalid' }
  | { status: 'locked' }
  | { status: 'error'; message: string };

/**
 * POST /auth/login  — May-Ari (store owner) login.
 * The login screen collects an owner ID (TH-MA-0001) and a PIN (4 digits).
 * The backend expects { email, password }.
 * We derive the email the same way registration does:
 *   name → lowercase, spaces → dots, appended with @tindahand.app
 * The PIN is used as the password.
 */
export async function loginOwner(ownerId: string, pin: string): Promise<LoginResult> {
  try {
      const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: ownerId.trim().toUpperCase(), pin }),
    });

    if (res.ok) {
      const data = await res.json();
      return { status: 'ok', token: data.access_token, name: data.full_name ?? '' };
    }
    if (res.status === 401) return { status: 'invalid' };
    if (res.status === 423 || res.status === 429) return { status: 'locked' };
    return { status: 'error', message: `Server error ${res.status}` };
  } catch {
    return { status: 'error', message: 'Could not reach server. Check your connection.' };
  }
}