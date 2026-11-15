import type { AccountRole, IdentityStorage, RememberedIdentities } from '@/types/auth';
import { isOwnerId } from '@/utils/owner-id';

/** Explicit role slots prevent an Owner login from selecting an Operator's store. */
export function createRememberedIdentities(storage: IdentityStorage) {
  let identities: RememberedIdentities | undefined;
  function restore(): RememberedIdentities {
    if (identities) return { ...identities };
    identities = {};
    try {
      const saved: unknown = JSON.parse(storage.read() ?? '{}');
      if (saved && typeof saved === 'object') {
        for (const role of ['owner', 'cashier'] as const) {
          const id = (saved as Record<string, unknown>)[role];
          if (typeof id === 'string' && isOwnerId(id)) identities[role] = id;
        }
      }
    } catch { /* Missing, corrupt or unavailable storage behaves as first login. */ }
    return { ...identities };
  }
  function save() {
    try { storage.write(JSON.stringify(identities)); }
    catch { /* Remembering an ID must never prevent authentication or logout. */ }
  }
  return {
    restore,
    remember(role: AccountRole, ownerId: string) {
      restore();
      if (!isOwnerId(ownerId)) return;
      identities = { ...identities, [role]: ownerId };
      save();
    },
    forget(role: AccountRole) {
      identities = restore();
      delete identities[role];
      save();
    },
  };
}
