import type { OwnerIdentity } from './auth';

/** Proposed frontend contracts. These are not approved backend wire schemas. */
export type Cashier = Readonly<{ id: string; ownerId: string; name: string; status: 'active' | 'inactive' }>;
export type PinValues = { ownerPin: string; pin: string; confirmPin: string };
export type CashierValues = { name: string; pin: string; confirmPin: string };
export type SettingsErrors = Partial<Record<keyof PinValues | 'name', string>>;
export type SettingsResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; message: string; fields?: SettingsErrors };
export type SyncStatus = 'up-to-date' | 'offline' | 'failed' | 'syncing' | 'complete';
export type SyncState = Readonly<{
  status: SyncStatus; pendingRecords: number; progress: number; lastSyncedAt: string | null;
}>;
export type SettingsOperation = 'create' | 'change-pin' | 'reset-pin' | 'sync' | 'clear-cache';
export type SettingsSnapshot = Readonly<{
  cashiers: readonly Cashier[];
  syncByOwner: ReadonlyMap<string, SyncState>;
  defaultSync: SyncState;
}>;
export interface SettingsService {
  subscribe(listener: () => void): () => void;
  getSnapshot(): SettingsSnapshot;
  cashiers(ownerId: string): readonly Cashier[];
  syncState(ownerId: string): SyncState;
  createCashier(owner: OwnerIdentity, values: CashierValues): Promise<SettingsResult<Cashier>>;
  changeOwnerPin(owner: OwnerIdentity, values: PinValues): Promise<SettingsResult>;
  resetCashierPin(owner: OwnerIdentity, cashierId: string, values: PinValues): Promise<SettingsResult<Cashier>>;
  setOperatorActive(owner: OwnerIdentity, operatorId: string, active: boolean): Promise<SettingsResult<Cashier>>;
  synchronize(owner: OwnerIdentity): Promise<SettingsResult>;
  clearCache(owner: OwnerIdentity): Promise<SettingsResult>;
}
