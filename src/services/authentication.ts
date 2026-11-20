import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoOwner } from '@/data/mock-auth';
import { mockOwnerCredentials } from '@/data/mock-auth-credentials';
import { settingsService } from '@/services/settings';
import type { AuthenticationService, AuthFailure, AuthResult, DeviceSession, RegisteredOwner, OperatorPermission, IdentityStorage, LocalRecordStorage, AuthSecretStorage } from '@/types/auth';
import { authIdentityStorage } from '@/services/auth-identity-storage';
import { authRecordStorage } from '@/services/auth-record-storage';
import { authSecretStorage } from '@/services/auth-secret-storage';
import { ownerPasswordKey, ownerPinKey } from '@/services/auth-storage-keys';
import { createRememberedIdentities } from '@/services/remembered-identities';
import { validateRegistration, validateEmail } from '@/utils/registration';
import { createMockProfileService } from '@/services/profile';
import { defaultOperatorPermissions } from '@/utils/operator-access';
import { isOwnerId } from '@/utils/owner-id';

const unavailable = (): AuthFailure => ({ ok: false, code: 'unavailable', message: 'Authentication is not connected. Please try again when the service is available.' });
const invalid = (): AuthResult<never> => ({ ok: false, code: 'invalid', message: 'Check your credentials and try again.' });
export const operatorPermissions: readonly OperatorPermission[] = defaultOperatorPermissions;

type StoredOwner = RegisteredOwner & { email: string };
const OWNER_RECORDS_KEY = 'tindahand-owners-v1';
function readOwnerRecords(storage: LocalRecordStorage): StoredOwner[] {
  try {
    const value: unknown = JSON.parse(storage.read(OWNER_RECORDS_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is StoredOwner => !!item && typeof item === 'object'
      && typeof item.id === 'string' && item.id !== demoOwner.id && isOwnerId(item.id)
      && typeof item.name === 'string' && !!item.name.trim()
      && typeof item.email === 'string' && !validateEmail(item.email));
  } catch { return []; }
}

/** Development mock account records persist locally; credentials stay in SecureStore on native. */
export function createAuthenticationService(options: { enabled: boolean; now?: () => number; failRecovery?: boolean; identityStorage?: IdentityStorage; accountStorage?: LocalRecordStorage; secretStorage?: AuthSecretStorage } = { enabled: MOCK_AUTH_ENABLED }): AuthenticationService {
  const now = options.now ?? Date.now;
  const enabled = () => __DEV__ && options.enabled;
  const remembered = createRememberedIdentities(options.identityStorage ?? authIdentityStorage);
  const accountStorage = options.accountStorage ?? authRecordStorage;
  const secretStorage = options.secretStorage ?? authSecretStorage;
  let storedOwners = enabled() ? readOwnerRecords(accountStorage) : [];
  const identities = new Map<string, RegisteredOwner>();
  // MOCK ONLY: Request credentials live only inside this dev adapter's closure.
  // SECURITY: Production must hash/verify credentials on the server, never on the client.
  const passwords = new Map<string, string>();
  const emails = new Map<string, string>();
  for (const account of storedOwners) {
    identities.set(account.id, { id: account.id, name: account.name });
    emails.set(account.email, account.id);
  }
  if (enabled() && mockOwnerCredentials) {
    identities.set(demoOwner.id, { id: demoOwner.id, name: demoOwner.name });
    passwords.set(demoOwner.id, mockOwnerCredentials.password);
    emails.set(mockOwnerCredentials.email, demoOwner.id);
  }
  let session: DeviceSession | null = null;
  let nextOwner = Math.max(0, ...storedOwners.map(account => Number(account.id.match(/^TH-MA-(\d+)$/)?.[1] ?? 0))) + 1;
  let nextSession = 1;
  let operatorRevision = 0;
  const recoveries = new Map<string, { ownerId: string; expiresAt: number; used: boolean }>();
  let nextRecovery = 1;
  const directoryListeners = new Set<() => void>();
  function createAccountDirectorySnapshot() {
    const owners = [...identities.values()]
      .filter(account => account.id !== demoOwner.id)
      .map(account => ({ ...account }));
    const ownerIds = new Set(owners.map(account => account.id));
    const hasOperators = settingsService.getSnapshot().cashiers.some(operator => ownerIds.has(operator.ownerId));
    return Object.freeze({ owners: Object.freeze(owners), hasOperators });
  }
  let accountDirectory = createAccountDirectorySnapshot();
  const publishAccountDirectory = () => {
    accountDirectory = createAccountDirectorySnapshot();
    directoryListeners.forEach(listener => listener());
  };
  settingsService.subscribe(publishAccountDirectory);
  // MOCK ONLY: Cold-start link testing, configured outside the product UI.
  const scenario = enabled() ? process.env.EXPO_PUBLIC_MOCK_RECOVERY_SCENARIO : undefined;
  if (scenario && ['valid', 'expired', 'used'].includes(scenario)) {
    recoveries.set('mock-owner-recovery', { ownerId: demoOwner.id, expiresAt: now() + (scenario === 'expired' ? -1 : 900000), used: scenario === 'used' });
    nextRecovery = 2;
  }
  let resendAt = 0;
  const live = () => {
    if (!enabled() || !session || session.expiresAt <= now()) return null;
    if (session.role === 'operator') {
      const operatorId = session.operatorId;
      if (session.ownerId !== session.owner.id || settingsService.operatorRevision(operatorId) !== operatorRevision || !settingsService.cashiers(session.ownerId).some(item => item.id === operatorId && item.status === 'active')) return null;
    }
    return session;
  };
  const authorizedOwner = () => { const current = live(); return current?.role === 'owner' && !current.locked ? { ...current.owner, mode: 'mock' as const } : null; };
  const profile = createMockProfileService({
    enabled: enabled(), now,
    avatars: settingsService.avatars,
    context: () => { const current = live(); return current?.role === 'owner' && !current.locked ? { owner: current.owner, sessionId: current.id } : null; },
    verifyPin: settingsService.verifyOwnerPin,
    emailAvailable: (email, ownerId) => !emails.has(email) || emails.get(email) === ownerId,
    onIdentity(updated) {
      const identity = { id: updated.ownerId, name: updated.name };
      identities.set(identity.id, identity);
      if (session?.owner.id === identity.id) session = { ...session, owner: identity };
      for (const [email, ownerId] of emails) if (ownerId === identity.id) emails.delete(email);
      emails.set(updated.email, identity.id);
      storedOwners = [...identities.values()].filter(item => item.id !== demoOwner.id).map(item => ({ ...item, email: updated.ownerId === item.id ? updated.email : [...emails].find(([, ownerId]) => ownerId === item.id)?.[0] ?? '' }));
      try { accountStorage.write(OWNER_RECORDS_KEY, JSON.stringify(storedOwners)); } catch { /* Directory state remains usable for this process. */ }
      publishAccountDirectory();
    },
  });
  if (enabled() && mockOwnerCredentials) profile.initialize(demoOwner, mockOwnerCredentials.email, true);
  const ready = (async () => {
    await settingsService.ready;
    if (!enabled()) return;
    for (const account of storedOwners) {
      try {
        const password = await secretStorage.read(ownerPasswordKey(account.id));
        if (password) passwords.set(account.id, password);
      } catch { /* Missing or unavailable credentials cannot authenticate. */ }
      try {
        const pin = await secretStorage.read(ownerPinKey(account.id));
        if (pin && /^[0-9]{4}$/.test(pin)) settingsService.initializePreviewOwner(account.id, pin);
      } catch { /* Missing or unavailable PINs cannot unlock the mock account. */ }
      profile.initialize(account, account.email);
    }
  })();
  function persistOwnerRecords(next: readonly StoredOwner[]) {
    accountStorage.write(OWNER_RECORDS_KEY, JSON.stringify(next.filter(item => item.id !== demoOwner.id)));
  }
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
    profile,
    ready,
    subscribeAccountDirectory(listener) {
      directoryListeners.add(listener);
      return () => { directoryListeners.delete(listener); };
    },
    getAccountDirectorySnapshot: () => accountDirectory,
    // TODO(backend): Replace local account creation with the authenticated registration endpoint.
    // - Method/Action: POST / Register Owner
    // - Expected Input/Payload: RegistrationFormValues; password and PIN are request-only
    // - Expected Response: Server-assigned RegisteredOwner after durable creation, or safe field-level errors
    // - UI State to Wire: Use the returned ID; set completion after confirmation and preserve fields on failure
    async registerOwner(values) {
      if (!enabled()) return { status: 'error', message: 'Account creation is not connected yet. No account has been created.' };
      await ready;
      const fields = validateRegistration(values);
      if (Object.keys(fields).length) return { status: 'error', message: 'Check the highlighted fields.', fields };
      const email = values.email.trim().toLowerCase();
      if (emails.has(email)) return { status: 'error', message: 'Unable to create this account. Check your details or log in.' };
      const account = { id: `TH-MA-${String(nextOwner++).padStart(4, '0')}`, name: values.name.trim() };
      const stored = { ...account, email };
      try {
        await secretStorage.write(ownerPasswordKey(account.id), values.password);
        await secretStorage.write(ownerPinKey(account.id), values.pin);
        persistOwnerRecords([...storedOwners, stored]);
      } catch {
        try { await secretStorage.remove(ownerPasswordKey(account.id)); } catch { /* Best-effort rollback. */ }
        try { await secretStorage.remove(ownerPinKey(account.id)); } catch { /* Best-effort rollback. */ }
        return { status: 'error', message: 'Account details could not be saved securely. Please try again.' };
      }
      storedOwners = [...storedOwners, stored];
      identities.set(account.id, account); emails.set(email, account.id); passwords.set(account.id, values.password);
      publishAccountDirectory();
      settingsService.initializePreviewOwner(account.id, values.pin);
      session = issue(account);
      profile.initialize(account, email);
      remembered.remember('owner', account.id);
      return { status: 'confirmed', account: { ...account } };
    },
    async authenticateOwner({ ownerId, password }) {
      if (!enabled()) return unavailable();
      await ready;
      // TODO(backend): Authenticate an Owner and issue a revocable server session.
      // - Method/Action: Auth / Verify Owner password
      // - Expected Input/Payload: { ownerId, password } with password request-only
      // - Expected Response: Authenticated DeviceSession or safe invalid/limited result
      // - UI State to Wire: Establish session on success and show generic credential/rate-limit errors
      const account = identities.get(ownerId);
      if (!account || !password || passwords.get(ownerId) !== password) return invalid();
      session = issue(account);
      remembered.remember('owner', account.id);
      return { ok: true, value: { ...session } };
    },
    async unlockOwner({ ownerId, pin }) {
      if (!enabled()) return unavailable();
      await ready;
      // TODO(backend): Verify Owner PIN against the authenticated device session and rate-limit attempts.
      // - Method/Action: Auth / Verify Owner PIN
      // - Expected Input/Payload: { ownerId, pin } plus secure device/session context; PIN request-only
      // - Expected Response: Unlocked authenticated DeviceSession or safe invalid/limited result
      // - UI State to Wire: Unlock only the matching active Owner session and map retry errors
      // SECURITY: Remembered identity alone is insufficient. A valid authenticated
      // device session must exist before the PIN can unlock the Owner workspace.
      const current = live();
      if (!current || current.role !== 'owner' || current.owner.id !== ownerId || !settingsService.verifyOwnerPin(ownerId, pin)) return invalid();
      session = { ...current, locked: false };
      remembered.remember('owner', session.owner.id);
      return { ok: true, value: { ...session } };
    },
    async loginOperator({ ownerId, pin }) {
      if (!enabled()) return unavailable();
      await ready;
      const requestedOwnerId = ownerId.trim();
      const operator = settingsService.matchOperator(requestedOwnerId, pin);
      // The Operator record is the source of truth for store membership. The
      // supplied Owner ID only scopes the credential lookup; never copy it into
      // the session without confirming it matches the matched record.
      const linkedOwnerId = operator?.ownerId;
      const account = linkedOwnerId ? identities.get(linkedOwnerId) : undefined;
      if (!operator || !linkedOwnerId || linkedOwnerId !== requestedOwnerId || !account || account.id !== linkedOwnerId) return invalid();
      // TODO(backend): Authenticate Operator PIN and resolve one active Operator in the requested store.
      // - Method/Action: POST / Operator login
      // - Expected Input/Payload: { ownerId, pin } with PIN request-only
      // - Expected Response: DeviceSession with operatorId, ownerId, displayName, and server capabilities
      // - UI State to Wire: Set the Operator session and capability gates only from the confirmed response
      session = { ...issue(account), role: 'operator', ownerId: linkedOwnerId, operatorId: operator.id, displayName: operator.name,
        operator: { id: operator.id, name: operator.name, permissions: [...settingsService.operatorPermissions(operator.id)] } };
      operatorRevision = settingsService.operatorRevision(operator.id);
      remembered.remember('cashier', linkedOwnerId);
      return { ok: true, value: { ...session } };
    },
    // BACKEND RULE: Authorize from the live session; never trust a supplied role
    // or Owner ID. Existing Owner-PIN verification remains mandatory for resets.
    async createOperator(input) {
      // TODO(backend): Create an Operator under the current unlocked Owner session.
      // - Method/Action: POST / Create operator
      // - Expected Input/Payload: { name, pin } with PIN request-only; store/actor derived from session
      // - Expected Response: Canonical Cashier identity and status, without credential material
      // - UI State to Wire: Refresh operator lists only after confirmation and retain fields on failure
      const owner = authorizedOwner();
      const sessionId = live()?.id;
      return owner ? settingsService.createCashier(owner, input, () => live()?.id === sessionId && !!authorizedOwner()) : { ok: false, message: 'An unlocked Owner session is required.' };
    },
    async resetOperatorPin({ operatorId, ...input }) {
      // TODO(backend): Reset a store Operator PIN after current Owner reauthentication.
      // - Method/Action: PATCH / Reset operator PIN
      // - Expected Input/Payload: { operatorId, ownerPin, pin } as request-only secrets
      // - Expected Response: Updated Cashier identity and session-revocation result
      // - UI State to Wire: Confirm the reset and refresh/invalidate affected Operator sessions
      const owner = authorizedOwner();
      const sessionId = live()?.id;
      return owner ? settingsService.resetCashierPin(owner, operatorId, input, () => live()?.id === sessionId && !!authorizedOwner()) : { ok: false, message: 'An unlocked Owner session is required.' };
    },
    async setOperatorActive({ operatorId, active }) {
      // TODO(backend): Change Operator access under the authenticated Owner's store.
      // - Method/Action: PATCH / Update operator status
      // - Expected Input/Payload: { operatorId, active }; actor/store derived from session
      // - Expected Response: Updated Cashier and any session-revocation status
      // - UI State to Wire: Refresh user lists and access gates after confirmation
      const owner = authorizedOwner();
      const sessionId = live()?.id;
      return owner ? settingsService.setOperatorActive(owner, operatorId, active, () => live()?.id === sessionId && !!authorizedOwner()) : { ok: false, message: 'An unlocked Owner session is required.' };
    },
    async updateOperatorProfile(input) {
      // TODO(backend): Save the current Operator's self-service profile under its authenticated session.
      // - Method/Action: PATCH / Update current operator profile
      // - Expected Input/Payload: { name, avatarId }; operator identity derived from session
      // - Expected Response: Canonical updated Cashier profile
      // - UI State to Wire: Refresh profile/session snapshots after confirmation and retain drafts on failure
      const current = live();
      if (!current || current.role !== 'operator' || current.locked) return { ok: false, message: 'An active Operator session is required.' };
      const operatorId = current.operatorId;
      const sessionId = current.id;
      const result = await settingsService.updateOperatorProfile(operatorId, input, () => {
        const active = live();
        return !!active && active.id === sessionId && active.role === 'operator' && active.operatorId === operatorId && !active.locked;
      });
      if (result.ok) {
        operatorRevision = settingsService.operatorRevision(operatorId);
        if (session?.id === sessionId && session.role === 'operator') {
          session = { ...session, displayName: result.value.name, operator: { ...session.operator, name: result.value.name } };
        }
      }
      return result;
    },
    async setOperatorPermission({ operatorId, group, allowed }) {
      // TODO(backend): Update the fixed capability allowlist for an Operator in the Owner's store.
      // - Method/Action: PATCH / Update operator capability
      // - Expected Input/Payload: { operatorId, group, allowed }; actor/store derived from session
      // - Expected Response: Canonical capability list and updated authorization revision
      // - UI State to Wire: Refresh capability gates and operator settings after confirmation
      const owner = authorizedOwner();
      const sessionId = live()?.id;
      return owner ? settingsService.setOperatorPermission(owner, operatorId, group, allowed, () => live()?.id === sessionId && !!authorizedOwner()) : { ok: false, message: 'An unlocked Owner session is required.' };
    },
    async restoreSession() {
      // TODO(backend): Restore and validate the secure server session on app startup/resume.
      // - Method/Action: Auth / Restore session
      // - Expected Input/Payload: Secure refresh/session credential from the device
      // - Expected Response: Current DeviceSession or null when expired/revoked
      // - UI State to Wire: Drive restoring state, role gates, and signed-out recovery from this response
      await ready;
      const current = live();
      if (!current) session = null;
      return current ? { ...current, owner: { ...current.owner }, ...(current.role === 'operator' ? { operator: { ...current.operator, permissions: [...current.operator.permissions] } } : {}) } : null;
    },
    async lockSession() { const current = live(); session = current ? { ...current, locked: true } : null; },
    async restoreRememberedIdentities() {
      // Remembered IDs are local login hints only; restoreSession validates authentication separately.
      // This mock deliberately loses sessions on a process restart.
      await ready;
      return enabled() ? remembered.restore() : {};
    },
    async switchAccount(role) {
      // TODO(backend): Revoke the current server session before switching account role.
      // - Method/Action: POST / Revoke current session
      // - Expected Input/Payload: Authenticated device session and selected role context
      // - Expected Response: Revocation status
      // - UI State to Wire: Clear local role/session state only after revocation handling
      session = null;
      remembered.forget(role);
    },
    async logout() {
      // TODO(backend): Revoke the active session and refresh credential on full logout.
      // - Method/Action: POST / Logout and revoke session
      // - Expected Input/Payload: Authenticated session credential
      // - Expected Response: Revocation status
      // - UI State to Wire: Clear session-scoped state after logout and handle network failure safely
      session = null;
    },
    async requestPinRecovery({ email }) {
      if (!enabled()) return unavailable();
      await ready;
      if (options.failRecovery || email.trim().toLowerCase() === 'failure@example.test') return { ok: false, code: 'unavailable', message: 'The recovery service is unavailable. Please try again.' };
      if (validateEmail(email)) return { ok: false, code: 'invalid', message: 'Enter a valid email address.' };
      // TODO(backend): Request PIN recovery with neutral responses and server-owned delivery limits.
      // - Method/Action: POST / Request PIN recovery
      // - Expected Input/Payload: { email }
      // - Expected Response: RecoveryReceipt with absolute resendAt, whether or not the account exists
      // - UI State to Wire: Use server resend timing and display safe retry/error states
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
      await ready;
      // TODO(backend): Validate a single-use, expiring Owner PIN recovery token.
      // - Method/Action: Auth / Verify recovery token
      // - Expected Input/Payload: { token }
      // - Expected Response: Token expiry or invalid/used/expired result
      // - UI State to Wire: Allow reset only for a valid token and show recovery errors/retry guidance
      const error = tokenError(token);
      return error ?? { ok: true, value: { expiresAt: recoveries.get(token)!.expiresAt } };
    },
    async resetOwnerPin({ token, pin }) {
      if (!enabled()) return unavailable();
      await ready;
      const error = tokenError(token);
      if (error) return error;
      if (!/^[0-9]{4}$/.test(pin)) return { ok: false, code: 'invalid', message: 'Enter exactly 4 numeric digits.' };
      const recovery = recoveries.get(token)!;
      // TODO(backend): Atomically consume the recovery token and replace the Owner PIN.
      // - Method/Action: POST / Reset Owner PIN
      // - Expected Input/Payload: { token, pin } with PIN request-only
      // - Expected Response: Success status; preserve Owner ID/password and revoke affected sessions
      // - UI State to Wire: Show success and require a fresh login rather than opening an authenticated session
      if (!await settingsService.persistOwnerPin(recovery.ownerId, pin)) return { ok: false, code: 'unavailable', message: 'The PIN could not be saved securely. Please try again.' };
      recovery.used = true;
      settingsService.initializePreviewOwner(recovery.ownerId, pin);
      if (session?.owner.id === recovery.ownerId) session = null;
      return { ok: true, value: undefined };
    },
  };
}
export const authenticationService = createAuthenticationService();
