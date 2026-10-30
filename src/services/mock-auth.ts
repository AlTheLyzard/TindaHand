import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoOwner } from '@/data/mock-auth';
import type { AccountRole, MockOwnerSession } from '@/types/auth';
import { validateLogin } from '@/utils/account-access';

// TODO(BACKEND): This checks public demo credentials only. Replace with server
// authentication and role/store identity, never ship this as real login.
// See docs/backend-handoff.md#authentication and docs/api-contract.md#authentication.
export function authenticateMockOwner(role: AccountRole, id: string, pin: string): MockOwnerSession | null {
  if (!MOCK_AUTH_ENABLED || role !== 'owner') return null;
  const errors = validateLogin(id, pin);
  if (errors.id || errors.pin || id !== demoOwner.id || pin !== demoOwner.pin) return null;
  return { kind: 'mock', role: 'owner', owner: { id: demoOwner.id, name: demoOwner.name } };
}
