import { demoOwner } from '@/data/mock-auth';
import { mockOwnerCredentials } from '@/data/mock-auth-credentials';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoCashiers, syncFixtures } from '@/data/settings';
import type { OwnerIdentity } from '@/types/auth';
import type { Cashier, CashierValues, PinValues, SettingsOperation, SettingsResult, SettingsService, SettingsSnapshot, SyncState, SyncStatus } from '@/types/settings';
import { canClearCache, validateCashier, validatePinChange } from '@/utils/settings';

type Options = { empty?: boolean; scenario?: SyncStatus; failNext?: SettingsOperation; delayMs?: number };
/** In-memory mock only: closure-held credentials are discarded on app reload.
 * No storage, network, hashing, rate limits, audit log or production authorization. */
export function createMockSettingsService(options: Options = {}) {
  let records: readonly Cashier[] = !MOCK_AUTH_ENABLED || options.empty ? [] : demoCashiers.map(item => ({ ...item }));
  const ownerPins = new Map<string, string>(MOCK_AUTH_ENABLED && mockOwnerCredentials ? [[demoOwner.id, mockOwnerCredentials.pin]] : []);
  const cashierPins = new Map(records.map((item, index) => [item.id, index === 0 ? '1423' : '2846']));
  const sync = new Map<string, SyncState>();
  const locks = new Set<string>();
  const listeners = new Set<() => void>();
  const revisions = new Map<string, number>();
  const defaultSync = syncFixtures[options.scenario ?? 'up-to-date'];
  let snapshot: SettingsSnapshot = { cashiers: records, syncByOwner: new Map(sync), defaultSync };
  let nextId = 3;
  let failure = options.failNext;
  const pause = () => new Promise<void>(resolve => setTimeout(resolve, options.delayMs ?? 250));
  const emit = () => {
    snapshot = { cashiers: records, syncByOwner: new Map(sync), defaultSync };
    listeners.forEach(listener => listener());
  };
  const failed = (message: string): SettingsResult<never> => ({ ok: false, message });
  function syncState(ownerId: string): SyncState {
    return sync.get(ownerId) ?? syncFixtures[options.scenario ?? 'up-to-date'];
  }
  function authorized(owner: OwnerIdentity) {
    return MOCK_AUTH_ENABLED && !!owner?.id && (owner.mode === 'mock' || owner.mode === 'preview') && ownerPins.has(owner.id);
  }
  async function operation<T>(owner: OwnerIdentity, kind: SettingsOperation, work: () => SettingsResult<T>): Promise<SettingsResult<T>> {
    if (!authorized(owner)) return failed('This mock operation needs a demo Owner session. Real account services are not connected.');
    if (locks.has(owner.id)) return failed('Another operation is in progress. Please wait.');
    locks.add(owner.id);
    try {
      await pause();
      if (failure === kind) { failure = undefined; return failed('The demo service could not save this change. Please try again.'); }
      return work();
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
  const duplicateError = (): SettingsResult<never> => ({ ok: false, message: 'This PIN is assigned to another active Operator. Choose a different PIN.', fields: { pin: 'Choose a distinct Operator PIN.' } });
  const service: SettingsService = {
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    cashiers: ownerId => records.filter(item => item.ownerId === ownerId),
    syncState,
    createCashier(owner, values: CashierValues) {
      return operation(owner, 'create', () => {
        const fields = validateCashier(values);
        if (Object.keys(fields).length) return { ok: false, message: 'Check the highlighted fields.', fields };
        if (duplicate(owner.id, values.pin)) return duplicateError();
        const cashier: Cashier = Object.freeze({ id: `TH-KH-${String(nextId++).padStart(4, '0')}`, name: values.name.trim(), ownerId: owner.id, status: 'active' });
        cashierPins.set(cashier.id, values.pin);
        records = [...records, cashier]; emit();
        return { ok: true, value: cashier };
      });
    },
    changeOwnerPin(owner, values) {
      return operation(owner, 'change-pin', () => {
        const error = verify(owner, values);
        if (error) return error;
        ownerPins.set(owner.id, values.pin);
        return { ok: true, value: undefined };
      });
    },
    resetCashierPin(owner, cashierId, values) {
      return operation(owner, 'reset-pin', () => {
        const error = verify(owner, values);
        if (error && !error.ok) return error;
        const cashier = records.find(item => item.id === cashierId && item.ownerId === owner.id);
        if (!cashier) return failed('This Operator does not belong to the current store.');
        if (duplicate(owner.id, values.pin, cashier.id)) return duplicateError();
        cashierPins.set(cashier.id, values.pin);
        revisions.set(cashier.id, (revisions.get(cashier.id) ?? 0) + 1);
        return { ok: true, value: cashier };
      });
    },
    setOperatorActive(owner, operatorId, active) {
      return operation(owner, 'reset-pin', () => {
        const operator = records.find(item => item.id === operatorId && item.ownerId === owner.id);
        if (!operator) return failed('Operator unavailable.');
        if (active && duplicate(owner.id, cashierPins.get(operator.id)!, operator.id)) return duplicateError();
        const updated: Cashier = { ...operator, status: active ? 'active' : 'inactive' };
        revisions.set(operator.id, (revisions.get(operator.id) ?? 0) + 1);
        records = records.map(item => item.id === operator.id ? updated : item); emit();
        return { ok: true, value: updated };
      });
    },
    async synchronize(owner) {
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
      return operation(owner, 'clear-cache', () => {
        // Recheck after the asynchronous boundary, including when the dialog was opened earlier.
        if (!canClearCache(syncState(owner.id))) return failed('Sync pending records before clearing cached data.');
        // Intentionally no storage API: no data of any kind is removed.
        return { ok: true, value: undefined };
      });
    },
  };
  return Object.assign(service, {
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
    initializePreviewOwner: (ownerId: string, pin: string) => { if (MOCK_AUTH_ENABLED && /^[0-9]{4}$/.test(pin)) ownerPins.set(ownerId, pin); },
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
  failNext: ['create', 'change-pin', 'reset-pin', 'sync', 'clear-cache'].includes(failure ?? '') ? failure as SettingsOperation : undefined,
});
