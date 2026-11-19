import { demoOwner } from '@/data/mock-auth';
import { mockOwnerCredentials } from '@/data/mock-auth-credentials';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoCashiers, syncFixtures } from '@/data/settings';
import type { AuthSecretStorage, LocalRecordStorage, OperatorPermission, OwnerIdentity } from '@/types/auth';
import { defaultOperatorPermissions, permissionGroups, updatePermission } from '@/utils/operator-access';
import type { Cashier, CashierValues, OperatorProfileValues, PinValues, SettingsOperation, SettingsResult, SettingsService, SettingsSnapshot, SyncState, SyncStatus } from '@/types/settings';
import { canClearCache, validateCashier, validateOperatorProfile, validatePinChange } from '@/utils/settings';
import { avatarInUse, createAvatarService } from '@/services/avatars';
import { authRecordStorage } from '@/services/auth-record-storage';
import { authSecretStorage } from '@/services/auth-secret-storage';
import { operatorPinKey, ownerPinKey } from '@/services/auth-storage-keys';
import { avatarPickerOrder } from '@/constants/profile-avatar-ids';

type Options = { empty?: boolean; scenario?: SyncStatus; failNext?: SettingsOperation; delayMs?: number; recordStorage?: LocalRecordStorage; secretStorage?: AuthSecretStorage };
const OPERATOR_RECORDS_KEY = 'tindahand-operators-v1';
function readOperatorRecords(storage: LocalRecordStorage): readonly Cashier[] {
  try {
    const value: unknown = JSON.parse(storage.read(OPERATOR_RECORDS_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Cashier => !!item && typeof item === 'object'
      && typeof item.id === 'string' && typeof item.ownerId === 'string' && typeof item.name === 'string'
      && (item.status === 'active' || item.status === 'inactive') && typeof item.avatarId === 'string');
  } catch { return []; }
}
/** Development mock records are local; PINs use the platform's encrypted secret store. */
export function createMockSettingsService(options: Options = {}) {
  const recordStorage = options.recordStorage ?? authRecordStorage;
  const secretStorage = options.secretStorage ?? authSecretStorage;
  const seedRecords = !MOCK_AUTH_ENABLED || options.empty ? [] : demoCashiers.map(item => ({ ...item }));
  const storedRecords = !MOCK_AUTH_ENABLED || options.empty ? [] : readOperatorRecords(recordStorage);
  let records: readonly Cashier[] = [
    ...seedRecords.map(seed => {
      const stored = storedRecords.find(item => item.id === seed.id && item.ownerId === seed.ownerId);
      return stored ? { ...seed, name: stored.name || seed.name, avatarId: stored.avatarId || seed.avatarId } : seed;
    }),
    ...storedRecords.filter(item => !seedRecords.some(seed => seed.id === item.id)),
  ];
  const avatars = createAvatarService();
  for (const ownerId of new Set(records.map(item => item.ownerId))) {
    const operators = records.filter(item => item.ownerId === ownerId);
    const result = avatars.initializeStore(ownerId, { id: ownerId }, operators);
    if (result.ok) records = records.map(item => item.ownerId === ownerId ? { ...item, avatarId: result.value.get(item.id)! } : item);
  }
  const ownerPins = new Map<string, string>(MOCK_AUTH_ENABLED && mockOwnerCredentials ? [[demoOwner.id, mockOwnerCredentials.pin]] : []);
  const cashierPins = new Map(seedRecords.map((item, index) => [item.id, index === 0 ? '1423' : '2846']));
  const ready = Promise.all(storedRecords.map(async item => {
    try {
      const pin = await secretStorage.read(operatorPinKey(item.id));
      if (pin && /^[0-9]{4}$/.test(pin)) cashierPins.set(item.id, pin);
    } catch { /* An unavailable secret leaves this account unable to authenticate. */ }
  })).then(() => undefined);
  const sync = new Map<string, SyncState>();
  const locks = new Set<string>();
  const listeners = new Set<() => void>();
  const revisions = new Map<string, number>();
  const permissions = new Map<string, readonly OperatorPermission[]>();
  const defaultSync = syncFixtures[options.scenario ?? 'up-to-date'];
  let snapshot: SettingsSnapshot = { cashiers: records, syncByOwner: new Map(sync), defaultSync, permissionsByOperator: new Map(permissions) };
  let nextId = Math.max(0, ...records.map(item => Number(item.id.match(/^TH-KH-(\d+)$/)?.[1] ?? 0))) + 1;
  let failure = options.failNext;
  const pause = () => new Promise<void>(resolve => setTimeout(resolve, options.delayMs ?? 250));
  const emit = () => {
    snapshot = { cashiers: records, syncByOwner: new Map(sync), defaultSync, permissionsByOperator: new Map(permissions) };
    listeners.forEach(listener => listener());
  };
  const failed = (message: string): SettingsResult<never> => ({ ok: false, message });
  function syncState(ownerId: string): SyncState {
    return sync.get(ownerId) ?? syncFixtures[options.scenario ?? 'up-to-date'];
  }
  function authorized(owner: OwnerIdentity) {
    return MOCK_AUTH_ENABLED && !!owner?.id && (owner.mode === 'mock' || owner.mode === 'preview') && ownerPins.has(owner.id);
  }
  function persistRecords(next: readonly Cashier[]) {
    recordStorage.write(OPERATOR_RECORDS_KEY, JSON.stringify(next.filter(item => {
      if (item.ownerId !== demoOwner.id) return true;
      const seed = demoCashiers.find(record => record.id === item.id && record.ownerId === item.ownerId);
      return !!seed && (item.name !== seed.name || item.avatarId !== seed.avatarId);
    })));
  }
  async function operation<T>(owner: OwnerIdentity, kind: SettingsOperation, work: () => SettingsResult<T> | Promise<SettingsResult<T>>, stillAuthorized?: () => boolean): Promise<SettingsResult<T>> {
    if (!authorized(owner)) return failed('This mock operation needs a demo Owner session. Real account services are not connected.');
    if (locks.has(owner.id)) return failed('Another operation is in progress. Please wait.');
    locks.add(owner.id);
    try {
      await ready;
      await pause();
      if (stillAuthorized && !stillAuthorized()) return failed('Your Owner session changed. Log in and try again.');
      if (failure === kind) { failure = undefined; return failed('The demo service could not save this change. Please try again.'); }
      return await work();
    } catch {
      return failed('The demo service is unavailable. Please try again.');
    } finally { locks.delete(owner.id); }
  }
  function verify(owner: OwnerIdentity, values: PinValues): SettingsResult | null {
    const fields = validatePinChange(values);
    if (Object.keys(fields).length) return { ok: false, message: 'Check the highlighted fields.', fields };
    if (ownerPins.get(owner.id) !== values.ownerPin) return { ok: false, message: 'Check your Owner PIN.', fields: { ownerPin: 'The Owner PIN you entered is incorrect.' } };
    return null;
  }
  // BACKEND RULE: Active Operators in one store require distinct PINs. Enforce
  // atomically on creation, reset and reactivation; return identity, never old PINs.
  function duplicate(ownerId: string, pin: string, exceptId?: string) {
    return records.some(item => item.ownerId === ownerId && item.status === 'active' && item.id !== exceptId && cashierPins.get(item.id) === pin);
  }
  const duplicateError = (): SettingsResult<never> => ({ ok: false, message: 'This PIN is assigned to another active Kahera. Choose a different PIN.', fields: { pin: 'Choose a distinct Kahera PIN.' } });
  const service: SettingsService = {
    ready,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    cashiers: ownerId => records.filter(item => item.ownerId === ownerId),
    syncState,
    createCashier(owner, values: CashierValues, stillAuthorized) {
      return operation(owner, 'create', async () => {
        const fields = validateCashier(values);
        if (Object.keys(fields).length) return { ok: false, message: 'Check the highlighted fields.', fields };
        if (duplicate(owner.id, values.pin)) return duplicateError();
        const id = `TH-KH-${String(nextId).padStart(4, '0')}`;
        let cashier: Cashier;
        // BACKEND TODO: Allocate the first free preset and create the account in one
        // transaction; enforce store-wide uniqueness even for inactive Operators.
        try { await secretStorage.write(operatorPinKey(id), values.pin); }
        catch { return failed('The Kahera account could not be saved. Please try again.'); }
        const result = avatars.allocate(owner.id, id, avatarId => {
          cashier = Object.freeze({ id, name: values.name.trim(), ownerId: owner.id, status: 'active', avatarId });
        });
        if (!result.ok) {
          try { await secretStorage.remove(operatorPinKey(id)); } catch { /* Best-effort rollback. */ }
          return failed(result.message);
        }
        cashier = { ...cashier!, avatarId: result.value };
        const next = [...records, cashier];
        try {
          persistRecords(next);
        } catch {
          try { await secretStorage.remove(operatorPinKey(id)); } catch { /* Best-effort rollback. */ }
          avatars.rollbackAllocation(owner.id, id);
          return failed('The Kahera account could not be saved. Please try again.');
        }
        cashierPins.set(id, values.pin); nextId++;
        records = next; emit();
        return { ok: true, value: cashier! };
      }, stillAuthorized);
    },
    changeOwnerPin(owner, values) {
      return operation(owner, 'change-pin', async () => {
        const error = verify(owner, values);
        if (error) return error;
        try { await secretStorage.write(ownerPinKey(owner.id), values.pin); }
        catch { return failed('The May-Ari PIN could not be saved. Please try again.'); }
        ownerPins.set(owner.id, values.pin);
        return { ok: true, value: undefined };
      });
    },
    resetCashierPin(owner, cashierId, values, stillAuthorized) {
      return operation(owner, 'reset-pin', async () => {
        const error = verify(owner, values);
        if (error && !error.ok) return error;
        const cashier = records.find(item => item.id === cashierId && item.ownerId === owner.id);
        if (!cashier) return failed('This Kahera does not belong to the current store.');
        if (duplicate(owner.id, values.pin, cashier.id)) return duplicateError();
        try { await secretStorage.write(operatorPinKey(cashier.id), values.pin); }
        catch { return failed('The Kahera PIN could not be saved. Please try again.'); }
        cashierPins.set(cashier.id, values.pin);
        revisions.set(cashier.id, (revisions.get(cashier.id) ?? 0) + 1);
        return { ok: true, value: cashier };
      }, stillAuthorized);
    },
    setOperatorActive(owner, operatorId, active, stillAuthorized) {
      // BACKEND TODO: Check authenticated store membership, update status without
      // deleting history/attribution or permissions, audit actor, revoke active sessions.
      return operation(owner, 'operator-status', async () => {
        const operator = records.find(item => item.id === operatorId && item.ownerId === owner.id);
        if (!operator) return failed('Kahera unavailable.');
        if (active && duplicate(owner.id, cashierPins.get(operator.id)!, operator.id)) return duplicateError();
        const updated: Cashier = { ...operator, status: active ? 'active' : 'inactive' };
        const next = records.map(item => item.id === operator.id ? updated : item);
        try { persistRecords(next); }
        catch { return failed('The Kahera account could not be saved. Please try again.'); }
        revisions.set(operator.id, (revisions.get(operator.id) ?? 0) + 1);
        records = next; emit();
        return { ok: true, value: updated };
      }, stillAuthorized);
    },
    async updateOperatorProfile(operatorId: string, values: OperatorProfileValues, stillAuthorized) {
      const operator = records.find(item => item.id === operatorId && item.status === 'active');
      if (!operator) return failed('Your Operator profile is unavailable. Please log in again.');
      const lockId = operator.ownerId;
      if (locks.has(lockId)) return failed('Another operation is in progress. Please wait.');
      locks.add(lockId);
      try {
        await ready;
        await pause();
        if (stillAuthorized && !stillAuthorized()) return failed('Your Operator session changed. Log in and try again.');
        if (failure === 'operator-profile') { failure = undefined; return failed('The demo service could not save this change. Please try again.'); }
        const fields = validateOperatorProfile(values);
        if (Object.keys(fields).length) return { ok: false, message: 'Check the highlighted fields.', fields };
        if (!avatarPickerOrder.includes(values.avatarId)) return failed('Choose one of the supplied profile photos.');
        if (avatarInUse(avatars.getSnapshot(), operator.ownerId, operator.id, values.avatarId)) return failed('This profile photo is in use by another account. Choose another photo.');

        const updated: Cashier = { ...operator, name: values.name.trim(), avatarId: values.avatarId };
        const next = records.map(item => item.id === operator.id ? updated : item);
        try {
          const result = avatars.replace(operator.ownerId, operator.id, values.avatarId, () => {
            persistRecords(next);
            records = next;
          });
          if (!result.ok) return failed(result.message);
          emit();
          return { ok: true, value: updated };
        } catch { return failed('Your Operator profile could not be saved. Please try again.'); }
      } catch {
        return failed('The demo service is unavailable. Please try again.');
      } finally { locks.delete(lockId); }
    },
    operatorPermissions: operatorId => permissions.get(operatorId) ?? defaultOperatorPermissions,
    setOperatorPermission(owner, operatorId, group, allowed, stillAuthorized) {
      // BACKEND TODO: Authorize current Owner/store from session, enforce the fixed
      // capability allowlist on every protected request, audit before/after and actor.
      // Proposed request: internal Operator ID, permission group, boolean; response:
      // canonical capabilities. No UI-supplied Owner/store ID authorizes this action.
      return operation(owner, 'permission', () => {
        const operator = records.find(item => item.id === operatorId && item.ownerId === owner.id);
        if (!operator || operator.status !== 'active') return failed('Only active Operators in this store can have permissions changed.');
        if (!permissionGroups.some(item => item.id === group) || typeof allowed !== 'boolean') return failed('This permission cannot be assigned.');
        const next = updatePermission(permissions.get(operatorId) ?? defaultOperatorPermissions, group, allowed);
        permissions.set(operatorId, Object.freeze(next));
        revisions.set(operatorId, (revisions.get(operatorId) ?? 0) + 1);
        emit();
        return { ok: true, value: next };
      }, stillAuthorized);
    },
    async synchronize(owner) {
      // TODO(BACKEND): Replace simulated progress with the agreed authenticated sync
      // protocol, durable pending-write queue, server conflict handling and confirmed state.
      if (!authorized(owner)) return failed('Synchronization is available for demo Owner sessions only.');
      if (locks.has(owner.id) || syncState(owner.id).status === 'syncing') return failed('Synchronization is already in progress.');
      locks.add(owner.id);
      const previous = syncState(owner.id);
      try {
        for (const progress of [0, 24, 58, 82]) {
          sync.set(owner.id, { ...previous, status: 'syncing', progress }); emit(); await pause();
        }
        if (failure === 'sync') { failure = undefined; throw new Error('mock failure'); }
        sync.set(owner.id, { status: 'complete', progress: 100, pendingRecords: 0, lastSyncedAt: new Date().toISOString() }); emit();
        return { ok: true, value: undefined };
      } catch {
        sync.set(owner.id, { ...previous, status: 'failed', progress: 0 }); emit();
        return failed('The simulated sync failed. Please retry.');
      } finally { locks.delete(owner.id); }
    },
    clearCache(owner) {
      // TODO(BACKEND): Define which server-backed records may be cleared and preserve
      // unsynced writes; confirm the cache operation before showing completion.
      return operation(owner, 'clear-cache', () => {
        // Recheck after the asynchronous boundary, including when the dialog was opened earlier.
        if (!canClearCache(syncState(owner.id))) return failed('Sync pending records before clearing cached data.');
        // Intentionally no storage API: no data of any kind is removed.
        return { ok: true, value: undefined };
      });
    },
  };
  return Object.assign(service, {
    avatars,
    operatorRevision: (id: string) => revisions.get(id) ?? 0,
    // MOCK ONLY: Credential matching stays behind the service. Inactive accounts
    // cannot log in. BACKEND INTEGRATION: identify Operator + permitted actions server-side.
    matchOperator: (ownerId: string, pin: string) => {
      if (!MOCK_AUTH_ENABLED || !/^[0-9]{4}$/.test(pin)) return null;
      const matches = records.filter(item => item.ownerId === ownerId && item.status === 'active' && cashierPins.get(item.id) === pin);
      return matches.length === 1 ? { ...matches[0] } : null;
    },
    verifyOwnerPin: (ownerId: string, pin: string) => MOCK_AUTH_ENABLED && /^[0-9]{4}$/.test(pin) && ownerPins.get(ownerId) === pin,
    verifyCashier: (ownerId: string, cashierId: string, pin: string) => {
      const cashier = records.find(item => item.id === cashierId && item.ownerId === ownerId && item.status === 'active');
      return cashier && /^[0-9]{4}$/.test(pin) && cashierPins.get(cashierId) === pin ? { ...cashier } : null;
    },
    initializePreviewOwner: (ownerId: string, pin: string) => {
      if (MOCK_AUTH_ENABLED && /^[0-9]{4}$/.test(pin)) {
        avatars.initializeStore(ownerId, { id: ownerId });
        ownerPins.set(ownerId, pin);
      }
    },
    persistOwnerPin: async (ownerId: string, pin: string) => {
      if (!MOCK_AUTH_ENABLED || !/^[0-9]{4}$/.test(pin)) return false;
      try { await secretStorage.write(ownerPinKey(ownerId), pin); ownerPins.set(ownerId, pin); return true; }
      catch { return false; }
    },
    /** Test/development injection only; no controls are rendered in product UI. */
    preview: (ownerId: string, scenario: SyncStatus) => { if (__DEV__) { sync.set(ownerId, { ...syncFixtures[scenario] }); emit(); } },
    failNext: (kind: SettingsOperation) => { if (__DEV__) failure = kind; },
  });
}

const scenario = __DEV__ ? process.env.EXPO_PUBLIC_SETTINGS_SCENARIO : undefined;
const failure = __DEV__ ? process.env.EXPO_PUBLIC_SETTINGS_FAIL_NEXT : undefined;
export const settingsService = createMockSettingsService({
  empty: __DEV__ && process.env.EXPO_PUBLIC_SETTINGS_EMPTY === 'true',
  scenario: scenario && Object.prototype.hasOwnProperty.call(syncFixtures, scenario) ? scenario as SyncStatus : undefined,
  failNext: ['create', 'change-pin', 'reset-pin', 'sync', 'clear-cache', 'permission', 'operator-status', 'operator-profile'].includes(failure ?? '') ? failure as SettingsOperation : undefined,
});

// ── Real API functions ────────────────────────────────────────────────────────────────────
import { apiFetch } from '@/services/api';

export interface ApiCashier {
  id: string;        // e.g. "TH-KH-0001"
  ownerId: string;   // e.g. "TH-MA-0001"
  name: string;
  status: 'active' | 'inactive';
  avatarId: string;
}

export interface OwnerProfile {
  id: string;        // e.g. "TH-MA-0001"
  name: string;
  storeName: string;
  avatarId: string;
}

/** Get the owner's profile from the backend. */
export async function getOwnerProfile(): Promise<OwnerProfile> {
  return apiFetch<OwnerProfile>('/settings/profile');
}

/** Update name, storeName, or avatarId. */
export async function updateOwnerProfile(data: Partial<{
  name: string;
  storeName: string;
  avatarId: string;
}>): Promise<OwnerProfile> {
  return apiFetch<OwnerProfile>('/settings/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Change the owner's PIN (requires current PIN for verification). */
export async function changeOwnerPin(currentPin: string, newPin: string): Promise<void> {
  return apiFetch<void>('/settings/change-pin', {
    method: 'POST',
    body: JSON.stringify({ currentPin, newPin }),
  });
}

/** List all cashiers for this store. */
export async function getCashiers(): Promise<ApiCashier[]> {
  return apiFetch<ApiCashier[]>('/settings/cashiers');
}

/** Update a cashier's name, avatar, or active status. */
export async function updateCashier(kahera_id: string, data: Partial<{
  name: string;
  avatarId: string;
  isActive: boolean;
}>): Promise<ApiCashier> {
  return apiFetch<ApiCashier>(`/settings/cashiers/${kahera_id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
