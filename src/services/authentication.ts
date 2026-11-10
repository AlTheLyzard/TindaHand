import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoOwner } from '@/data/mock-auth';
import { mockOwnerCredentials } from '@/data/mock-auth-credentials';
import { settingsService } from '@/services/settings';
import type { AuthenticationService, AuthFailure, AuthResult, DeviceSession, RegisteredOwner, OperatorPermission } from '@/types/auth';
import { validateRegistration, validateEmail } from '@/utils/registration';

const unavailable = (): AuthFailure => ({ ok: false, code: 'unavailable', message: 'Authentication is not connected. Please try again when the service is available.' });
const invalid = (): AuthResult<never> => ({ ok: false, code: 'invalid', message: 'Check your credentials and try again.' });
export const operatorPermissions: readonly OperatorPermission[] = ['pos', 'inventory-edit', 'restock', 'assets-read', 'receivables', 'transactions', 'profile', 'settings'];

/** MOCK ONLY: Ephemeral fake server. No emails, persistent accounts or durable sessions. */
export function createAuthenticationService(options: { enabled: boolean; now?: () => number; failRecovery?: boolean } = { enabled: MOCK_AUTH_ENABLED }): AuthenticationService {
  const now = options.now ?? Date.now;
  const enabled = () => __DEV__ && options.enabled;
  const identities = new Map<string, RegisteredOwner>();
  // MOCK ONLY: Request credentials live only inside this dev adapter's closure.
  // SECURITY: Production must hash/verify credentials on the server, never on the client.
  const passwords = new Map<string, string>();
  const emails = new Map<string, string>();
  if (enabled() && mockOwnerCredentials) {
    identities.set(demoOwner.id, { id: demoOwner.id, name: demoOwner.name });
    passwords.set(demoOwner.id, mockOwnerCredentials.password);
    emails.set(mockOwnerCredentials.email, demoOwner.id);
  }
  let session: DeviceSession | null = null;
  let nextOwner = 1;
  let nextSession = 1;
  let operatorRevision = 0;
  const recoveries = new Map<string, { ownerId: string; expiresAt: number; used: boolean }>();
  let nextRecovery = 1;
  // MOCK ONLY: Cold-start link testing, configured outside the product UI.
  const scenario = enabled() ? process.env.EXPO_PUBLIC_MOCK_RECOVERY_SCENARIO : undefined;
  if (scenario && ['valid', 'expired', 'used'].includes(scenario)) {
    recoveries.set('mock-owner-recovery', { ownerId: demoOwner.id, expiresAt: now() + (scenario === 'expired' ? -1 : 900000), used: scenario === 'used' });
    nextRecovery = 2;
  }
  let resendAt = 0;
  const live = () => {
    if (!enabled() || !session || session.expiresAt <= now()) return null;
    if (session.role === 'cashier') {
      const operatorId = session.operator.id;
      if (settingsService.operatorRevision(operatorId) !== operatorRevision || !settingsService.cashiers(session.owner.id).some(item => item.id === operatorId && item.status === 'active')) return null;
    }
    return session;
  };
  const authorizedOwner = () => { const current = live(); return current?.role === 'owner' && !current.locked ? { ...current.owner, mode: 'mock' as const } : null; };
  function issue(owner: RegisteredOwner): DeviceSession {
    return { kind: 'mock', id: `mock-session-${nextSession++}`, role: 'owner', owner: { ...owner }, locked: false, expiresAt: now() + 8 * 60 * 60 * 1000 };
  }
  // BACKEND RULE: Tokens must be cryptographically random, time-limited, hashed at
  // rest, single-use and consumed atomically. This fixed token is DEV ONLY.
  function tokenError(token: string): AuthResult<never> | null {
    if (!token) return { ok: false, code: 'missing', message: 'This recovery link is missing. Request a new link.' };
    const recovery = recoveries.get(token);
    if (!recovery) return { ok: false, code: 'invalid', message: 'This recovery link is invalid. Request a new link.' };
    if (recovery.used) return { ok: false, code: 'used', message: 'This recovery link has already been used. Request a new link.' };
    if (recovery.expiresAt <= now()) return { ok: false, code: 'expired', message: 'This recovery link has expired. Request a new link.' };
    return null;
  }
  return {
    // BACKEND INTEGRATION: Replace this adapter as one unit. Never fall back to
    // mock success on an API failure. See docs/authentication-handoff.md.
    async registerOwner(values) {
      if (!enabled()) return { status: 'error', message: 'Account creation is not connected yet. No account has been created.' };
      const fields = validateRegistration(values);
      if (Object.keys(fields).length) return { status: 'error', message: 'Check the highlighted fields.', fields };
      const email = values.email.trim().toLowerCase();
      if (emails.has(email)) return { status: 'error', message: 'Unable to create this account. Check your details or log in.' };
      // BACKEND RULE: Assign the permanent Owner ID once, after durable creation.
      const account = { id: `TH-MA-${String(nextOwner++).padStart(4, '0')}`, name: values.name.trim() };
      identities.set(account.id, account); emails.set(email, account.id); passwords.set(account.id, values.password);
      settingsService.initializePreviewOwner(account.id, values.pin);
      session = issue(account);
      return { status: 'confirmed', account: { ...account } };
    },
    async authenticateOwner({ ownerId, password }) {
      if (!enabled()) return unavailable();
      // BACKEND RULE: Rate-limit password/PIN attempts; issue and revoke sessions server-side.
      const account = identities.get(ownerId);
      if (!account || !password || passwords.get(ownerId) !== password) return invalid();
      session = issue(account);
      return { ok: true, value: { ...session } };
    },
    async unlockOwner({ ownerId, pin }) {
      if (!enabled()) return unavailable();
      // SECURITY: Remembered identity alone is insufficient. A valid authenticated
      // device session must exist before the PIN can unlock the Owner workspace.
      const current = live();
      if (!current || current.role !== 'owner' || current.owner.id !== ownerId || !settingsService.verifyOwnerPin(ownerId, pin)) return invalid();
      session = { ...current, locked: false };
      return { ok: true, value: { ...session } };
    },
    async loginOperator({ ownerId, pin }) {
      if (!enabled()) return unavailable();
      const account = identities.get(ownerId);
      const operator = settingsService.matchOperator(ownerId, pin);
      if (!account || !operator) return invalid();
      session = { ...issue(account), role: 'cashier', operator: { id: operator.id, name: operator.name, permissions: [...operatorPermissions] } };
      operatorRevision = settingsService.operatorRevision(operator.id);
      return { ok: true, value: { ...session } };
    },
    // BACKEND RULE: Authorize from the live session; never trust a supplied role
    // or Owner ID. Existing Owner-PIN verification remains mandatory for resets.
    async createOperator(input) {
      const owner = authorizedOwner();
      return owner ? settingsService.createCashier(owner, input) : { ok: false, message: 'An unlocked Owner session is required.' };
    },
    async resetOperatorPin({ operatorId, ...input }) {
      const owner = authorizedOwner();
      return owner ? settingsService.resetCashierPin(owner, operatorId, input) : { ok: false, message: 'An unlocked Owner session is required.' };
    },
    async setOperatorActive({ operatorId, active }) {
      const owner = authorizedOwner();
      return owner ? settingsService.setOperatorActive(owner, operatorId, active) : { ok: false, message: 'An unlocked Owner session is required.' };
    },
    async restoreSession() {
      // BACKEND INTEGRATION: Restore from existing server session through a secure
      // storage adapter, validate expiry/revocation remotely. None exists yet.
      const current = live();
      if (!current) session = null;
      return current ? { ...current, owner: { ...current.owner } } : null;
    },
    async lockSession() { const current = live(); session = current ? { ...current, locked: true } : null; },
    async logout() {
      // BACKEND RULE: Revoke the session/refresh credential on full logout.
      session = null;
    },
    async requestPinRecovery({ email }) {
      if (!enabled()) return unavailable();
      if (options.failRecovery || email.trim().toLowerCase() === 'failure@example.test') return { ok: false, code: 'unavailable', message: 'The recovery service is unavailable. Please try again.' };
      if (validateEmail(email)) return { ok: false, code: 'invalid', message: 'Enter a valid email address.' };
      // BACKEND RULE: Neutral response/timing, email delivery and resend/attempt
      // limits belong on the server. Use its absolute resendAt, never a UI timer policy.
      if (now() < resendAt) return { ok: true, value: { resendAt } };
      resendAt = now() + 30000;
      const ownerId = emails.get(email.trim().toLowerCase());
      if (ownerId) {
        recoveries.forEach(value => { if (value.ownerId === ownerId) value.used = true; });
        const token = nextRecovery === 1 ? 'mock-owner-recovery' : `mock-owner-recovery-${nextRecovery}`;
        nextRecovery++;
        recoveries.set(token, { ownerId, expiresAt: now() + 15 * 60 * 1000, used: false });
      }
      return { ok: true, value: { resendAt } };
    },
    async verifyRecoveryToken({ token }) {
      if (!enabled()) return unavailable();
      const error = tokenError(token);
      return error ?? { ok: true, value: { expiresAt: recoveries.get(token)!.expiresAt } };
    },
    async resetOwnerPin({ token, pin }) {
      if (!enabled()) return unavailable();
      const error = tokenError(token);
      if (error) return error;
      if (!/^[0-9]{4}$/.test(pin)) return { ok: false, code: 'invalid', message: 'Enter exactly 4 numeric digits.' };
      const recovery = recoveries.get(token)!;
      // BACKEND RULE: Consume and update atomically; revoke affected sessions.
      // Owner ID/password must stay unchanged. Reset does not authenticate anyone.
      recovery.used = true;
      settingsService.initializePreviewOwner(recovery.ownerId, pin);
      if (session?.owner.id === recovery.ownerId) session = null;
      return { ok: true, value: undefined };
    },
  };
}
export const authenticationService = createAuthenticationService();
