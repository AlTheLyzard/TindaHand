import { financialSeed } from '@/data/financial';
import type { FinancialDataset, FinancialRepository, JournalEntry } from '@/types/financial';
import type { OwnerIdentity } from '@/types/auth';
import { calculateFinancialReport } from '@/utils/financial';

function requireOwner(owner: OwnerIdentity | null) {
  if (!owner?.id || !['mock', 'preview', 'confirmed'].includes(owner.mode)) throw new Error('An owner session is required to view financial statements.');
}

/**
 * Merge local in-memory journal entries into the seed dataset.
 * Local entries take precedence over demo seed data for the same day
 * when real transactions exist — the seed always provides the chart of
 * accounts and opening balances, while local entries supply real activity.
 */
export function mergeLocalEntries(base: FinancialDataset, local: readonly JournalEntry[]): FinancialDataset {
  if (!local.length) return base;
  // Dedup by id: local entries override any seed entry with the same id.
  const byId = new Map<string, JournalEntry>(base.entries.map(e => [e.id, e]));
  for (const entry of local) byId.set(entry.id, entry);
  return { ...base, entries: [...byId.values()], updatedAt: new Date().toISOString() };
}

/** Proposed local read contract. Local transactions are posted as journal
 * entries and merged with the seed dataset so all four statements reflect
 * real recorded activity without a backend connection. */
// TODO(backend): Replace the seed dataset and local calculations with confirmed report data.
// - Method/Action: GET / Fetch owner-scoped financial report by kind and period
// - Expected Input/Payload: Authenticated Owner session, ReportKind, and date-only ReportSelection
// - Expected Response: FinancialReport with reporting timezone, sourceUpdatedAt, and confirmed posted totals
// - UI State to Wire: Feed report hooks and loading/error/empty states from the server response
export function createFinancialRepository(data: FinancialDataset = financialSeed, clock = () => new Date().toISOString()): FinancialRepository {
  return {
    async getStatus(owner) { requireOwner(owner); return { updatedAt: data.updatedAt, storeName: data.storeName }; },
    async getReport(owner, kind, selection) { requireOwner(owner); return calculateFinancialReport(data, kind, selection, clock()); },
  };
}

/** Repository pre-loaded with the seed data; call withLocalEntries() to overlay real transactions. */
export const financialRepository = createFinancialRepository();

/** Build a repository that overlays local in-memory journal entries onto the seed dataset. */
export function financialRepositoryWithLocal(local: readonly JournalEntry[]) {
  return createFinancialRepository(mergeLocalEntries(financialSeed, local));
}
