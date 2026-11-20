import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoOwner } from '@/data/mock-auth';
import type { AccountRole, MockOwnerSession } from '@/types/auth';
import { validateLogin } from '@/utils/account-access';
import { settingsService } from '@/services/settings';

// TODO(backend): Replace public demo credential matching with server authentication.
// - Method/Action: Auth / Verify credentials and resolve role/store identity
// - Expected Input/Payload: Role, account identifier, and request-only PIN or password
// - Expected Response: Authenticated session with canonical account, store, role, and capabilities
// - UI State to Wire: Establish session from server response and show safe credential/rate-limit errors
export function authenticateMockOwner(role: AccountRole, id: string, pin: string): MockOwnerSession | null {
  if (!MOCK_AUTH_ENABLED || role !== 'owner') return null;
  const errors = validateLogin(id, pin);
  if (errors.id || errors.pin || id !== demoOwner.id || !settingsService.verifyOwnerPin(id, pin)) return null;
  return { kind: 'mock', role: 'owner', owner: { id: demoOwner.id, name: demoOwner.name } };
}
