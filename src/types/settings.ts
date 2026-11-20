import type { OperatorPermission, OwnerIdentity } from './auth';
import type { AvatarId } from './profile';

/** Proposed frontend contracts. These are not approved backend wire schemas. */
// TODO(backend): Verify operator identity fields and capability responses against the settings API schema.
// - Method/Action: GET / Read operators; POST, PATCH, or DELETE / Manage operator access
// - Expected Input/Payload: Operator fields, assigned capability changes, or status updates; never PIN values in reads
// - Expected Response: Cashier and SettingsSnapshot-compatible canonical records and permissions
// - UI State to Wire: Refresh operator/settings snapshots and map field-level errors to existing forms
export type Cashier = Readonly<{ id: string; ownerId: string; name: string; status: 'active' | 'inactive'; avatarId: AvatarId }>;
export type PinValues = { ownerPin: string; pin: string; confirmPin: string };
export type CashierValues = { name: string; pin: string; confirmPin: string };
export type SettingsErrors = Partial<Record<keyof PinValues | 'name' | 'currentPin', string>>;
/** Self-service Operator edits never include Owner-managed credentials. */
export type OperatorProfileValues = { name: string; avatarId: AvatarId };
export type SettingsResult<T = undefined> =
  | { ok: true; value: T }
  | { ok: false; message: string; fields?: SettingsErrors };
export type SyncStatus = 'up-to-date' | 'offline' | 'failed' | 'syncing' | 'complete';
export type SyncState = Readonly<{
  status: SyncStatus; pendingRecords: number; progress: number; lastSyncedAt: string | null;
}>;
export type SettingsOperation = 'create' | 'change-pin' | 'reset-pin' | 'sync' | 'clear-cache' | 'permission' | 'operator-status' | 'operator-profile';
export type SettingsSnapshot = Readonly<{
  cashiers: readonly Cashier[];
  syncByOwner: ReadonlyMap<string, SyncState>;
  defaultSync: SyncState;
  permissionsByOperator: ReadonlyMap<string, readonly OperatorPermission[]>;
}>;
export interface SettingsService {
  readonly ready: Promise<void>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): SettingsSnapshot;
  cashiers(ownerId: string): readonly Cashier[];
  syncState(ownerId: string): SyncState;
  createCashier(owner: OwnerIdentity, values: CashierValues, stillAuthorized?: () => boolean): Promise<SettingsResult<Cashier>>;
  changeOwnerPin(owner: OwnerIdentity, values: PinValues): Promise<SettingsResult>;
  resetCashierPin(owner: OwnerIdentity, cashierId: string, values: PinValues, stillAuthorized?: () => boolean): Promise<SettingsResult<Cashier>>;
  setOperatorActive(owner: OwnerIdentity, operatorId: string, active: boolean, stillAuthorized?: () => boolean): Promise<SettingsResult<Cashier>>;
  updateOperatorProfile(operatorId: string, values: OperatorProfileValues, stillAuthorized?: () => boolean): Promise<SettingsResult<Cashier>>;
  operatorPermissions(operatorId: string): readonly OperatorPermission[];
  setOperatorPermission(owner: OwnerIdentity, operatorId: string, group: import('@/utils/operator-access').PermissionGroup, allowed: boolean, stillAuthorized?: () => boolean): Promise<SettingsResult<readonly OperatorPermission[]>>;
  synchronize(owner: OwnerIdentity): Promise<SettingsResult>;
  clearCache(owner: OwnerIdentity): Promise<SettingsResult>;
}
