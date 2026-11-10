import type { Cashier, SyncState } from '@/types/settings';
import { demoOwner } from './mock-auth';

/** Fictional read fixtures; credentials never appear in list responses. */
export const demoCashiers: readonly Cashier[] = [
  { id: 'TH-KH-0001', ownerId: demoOwner.id, name: 'Maria Santos', status: 'active' },
  { id: 'TH-KH-0002', ownerId: demoOwner.id, name: 'Jely Reyes', status: 'active' },
];
export const syncFixtures = {
  'up-to-date': { status: 'up-to-date', pendingRecords: 0, progress: 100, lastSyncedAt: '2026-10-31T01:00:00.000Z' },
  offline: { status: 'offline', pendingRecords: 3, progress: 0, lastSyncedAt: '2026-10-30T01:00:00.000Z' },
  failed: { status: 'failed', pendingRecords: 3, progress: 0, lastSyncedAt: '2026-10-30T01:00:00.000Z' },
  syncing: { status: 'syncing', pendingRecords: 3, progress: 58, lastSyncedAt: null },
  complete: { status: 'complete', pendingRecords: 0, progress: 100, lastSyncedAt: '2026-10-31T01:00:00.000Z' },
} as const satisfies Record<string, SyncState>;
