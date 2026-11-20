import { avatarPickerOrder } from '@/constants/profile-avatar-ids';
import type { AvatarId } from '@/types/profile';

export type AvatarAccount = { id: string; avatarId?: AvatarId | null };
export type AvatarAssignments = ReadonlyMap<string, AvatarId>;
export type AvatarSnapshot = ReadonlyMap<string, AvatarAssignments>;
type Result<T> = { ok: true; value: T } | { ok: false; message: string };
export const AVATARS_EXHAUSTED = 'All 12 preset avatars are assigned in this store, including inactive Operators. Additional avatar assets are needed before another account can be created.';
export const AVATAR_IN_USE = 'This avatar is now in use by another account. Your draft is preserved. Please select another avatar.';

export function avatarInUse(snapshot: AvatarSnapshot, storeId: string, accountId: string, avatarId: AvatarId): boolean {
  return [...(snapshot.get(storeId) ?? [])].some(([id, assigned]) => id !== accountId && assigned === avatarId);
}

/** Pure migration plan. Preserve valid selections before filling any gaps. */
export function reconcileStoreAvatars(owner: AvatarAccount, operators: readonly AvatarAccount[]): Result<AvatarAssignments> {
  // Owner wins duplicates; Operators use code-point ID order, independent of list order/locale/status.
  const accounts = [owner, ...[...operators].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)];
  if (accounts.length > avatarPickerOrder.length) return { ok: false, message: AVATARS_EXHAUSTED };
  const assignments = new Map<string, AvatarId>();
  const used = new Set<AvatarId>();
  if (new Set(accounts.map(account => account.id)).size !== accounts.length) return { ok: false, message: 'Account IDs must be unique within a store.' };
  for (const account of accounts) {
    if (account.avatarId && avatarPickerOrder.includes(account.avatarId) && !used.has(account.avatarId)) {
      assignments.set(account.id, account.avatarId); used.add(account.avatarId);
    }
  }
  for (const account of accounts) {
    if (assignments.has(account.id)) continue;
    const first = avatarPickerOrder.find(id => !used.has(id))!;
    assignments.set(account.id, first); used.add(first);
  }
  return { ok: true, value: assignments };
}

/** In-memory assignment authority shared by profile and account creation adapters.
 * Reads and previews never mutate assignments. Inactive accounts are never released.
 */
// TODO(backend): Move avatar allocation and replacement into the account/profile transactions.
// - Method/Action: POST or PATCH / Assign or replace store avatar
// - Expected Input/Payload: Account ID and avatarId with store/actor derived from session
// - Expected Response: Canonical account assignment; enforce store-wide uniqueness including inactive operators
// - UI State to Wire: Refresh avatar snapshots after commit and preserve the prior assignment on conflicts
export function createAvatarService() {
  let snapshot: AvatarSnapshot = new Map();
  const listeners = new Set<() => void>();
  const committing = new Set<string>();
  const busy = (): Result<never> => ({ ok: false, message: 'Another avatar assignment is saving. Please retry.' });
  function publish(storeId: string, assignments: AvatarAssignments, commit: () => void) {
    committing.add(storeId);
    try {
      commit();
      snapshot = new Map(snapshot).set(storeId, assignments);
    } finally { committing.delete(storeId); }
    listeners.forEach(listener => listener());
  }
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    initializeStore(storeId: string, owner: AvatarAccount, operators: readonly AvatarAccount[] = []): Result<AvatarAssignments> {
      if (committing.has(storeId)) return busy();
      const existing = snapshot.get(storeId);
      if (existing) return { ok: true, value: existing };
      const result = reconcileStoreAvatars(owner, operators);
      if (result.ok) publish(storeId, result.value, () => {});
      return result;
    },
    allocate(storeId: string, accountId: string, commit: (avatarId: AvatarId) => void): Result<AvatarId> {
      if (committing.has(storeId)) return busy();
      const assignments = snapshot.get(storeId);
      if (!assignments) return { ok: false, message: 'Store avatar assignments are unavailable. Please retry.' };
      if (assignments.has(accountId)) return { ok: false, message: 'This account already has an assigned avatar.' };
      const first = avatarPickerOrder.find(id => ![...assignments.values()].includes(id));
      if (!first) return { ok: false, message: AVATARS_EXHAUSTED };
      publish(storeId, new Map(assignments).set(accountId, first), () => commit(first));
      return { ok: true, value: first };
    },
    rollbackAllocation(storeId: string, accountId: string) {
      if (committing.has(storeId)) return false;
      const assignments = snapshot.get(storeId);
      if (!assignments?.has(accountId)) return false;
      const next = new Map(assignments);
      next.delete(accountId);
      snapshot = new Map(snapshot).set(storeId, next);
      listeners.forEach(listener => listener());
      return true;
    },
    replace(storeId: string, accountId: string, avatarId: AvatarId, commit: () => void): Result<AvatarId> {
      if (committing.has(storeId)) return busy();
      const assignments = snapshot.get(storeId);
      if (!assignments?.has(accountId)) return { ok: false, message: 'Account avatar assignment unavailable. Please retry.' };
      if (!avatarPickerOrder.includes(avatarId)) return { ok: false, message: 'Choose one of the supplied avatars.' };
      if (avatarInUse(snapshot, storeId, accountId, avatarId)) return { ok: false, message: AVATAR_IN_USE };
      // Publish only after validation, asynchronous work and synchronous mock persistence succeed.
      publish(storeId, new Map(assignments).set(accountId, avatarId), commit);
      return { ok: true, value: avatarId };
    },
  };
}
export type AvatarService = ReturnType<typeof createAvatarService>;
