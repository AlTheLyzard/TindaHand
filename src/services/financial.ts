import { financialSeed } from '@/data/financial';
import type { FinancialDataset, FinancialRepository } from '@/types/financial';
import type { OwnerIdentity } from '@/types/auth';
import { calculateFinancialReport } from '@/utils/financial';

function requireOwner(owner: OwnerIdentity | null) {
  if (!owner?.id || !['mock', 'preview', 'confirmed'].includes(owner.mode)) throw new Error('An owner session is required to view financial statements.');
}
/** Proposed local read contract. This fictional posted book intentionally does not infer
 * accounting from unsaved/demo POS drafts.
 * TODO(BACKEND): Replace the seed dataset and local calculations with an authenticated,
 * owner-scoped report read from the approved source of truth. The API must define the
 * reporting period/timezone and return confirmed report data; do not calculate statements
 * from UI drafts or demo POS state. See docs/backend-handoff.md and docs/api-contract.md. */
export function createFinancialRepository(data: FinancialDataset = financialSeed, clock = () => new Date().toISOString()): FinancialRepository {
  return {
    async getStatus(owner) { requireOwner(owner); return { updatedAt: data.updatedAt, storeName: data.storeName }; },
    async getReport(owner, kind, selection) { requireOwner(owner); return calculateFinancialReport(data, kind, selection, clock()); },
  };
}
export const financialRepository = createFinancialRepository();
