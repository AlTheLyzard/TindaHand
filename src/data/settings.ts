import type { Cashier, SyncState } from '@/types/settings';
import { demoOwner } from './mock-auth';

/** Fictional read fixtures; credentials never appear in list responses. */
// TODO(backend): Replace demo cashiers with the authenticated store operator list.
// - Method/Action: GET / Fetch operators
// - Expected Input/Payload: None (authenticated Owner session)
// - Expected Response: Cashier[] without PINs or other credentials
// - UI State to Wire: Populate operator management and profile screens from server records
export const demoCashiers: readonly Cashier[] = [
  { id: 'TH-KH-0001', ownerId: demoOwner.id, name: 'Maria Santos', status: 'active', avatarId: 'avatar-11' },
  { id: 'TH-KH-0002', ownerId: demoOwner.id, name: 'Jely Reyes', status: 'active', avatarId: 'avatar-04' },
];
// TODO(backend): Replace simulated sync states with the server's sync status response.
// - Method/Action: GET / Fetch synchronization status
// - Expected Input/Payload: None (authenticated Owner session)
// - Expected Response: SyncState with status, pendingRecords, progress, and lastSyncedAt
// - UI State to Wire: Show server-confirmed sync status, pending counts, and retry/error states
export const syncFixtures = {
  'up-to-date': { status: 'up-to-date', pendingRecords: 0, progress: 100, lastSyncedAt: '2026-10-31T01:00:00.000Z' },
  offline: { status: 'offline', pendingRecords: 3, progress: 0, lastSyncedAt: '2026-10-30T01:00:00.000Z' },
  failed: { status: 'failed', pendingRecords: 3, progress: 0, lastSyncedAt: '2026-10-30T01:00:00.000Z' },
  syncing: { status: 'syncing', pendingRecords: 3, progress: 58, lastSyncedAt: null },
  complete: { status: 'complete', pendingRecords: 0, progress: 100, lastSyncedAt: '2026-10-31T01:00:00.000Z' },
} as const satisfies Record<string, SyncState>;
