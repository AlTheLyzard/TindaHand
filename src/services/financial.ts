import { financialSeed } from '@/data/financial';
import type { FinancialDataset, FinancialRepository } from '@/types/financial';
import type { OwnerIdentity } from '@/types/auth';
import { calculateFinancialReport } from '@/utils/financial';

function requireOwner(owner: OwnerIdentity | null) {
  if (!owner?.id || !['mock', 'preview', 'confirmed'].includes(owner.mode)) throw new Error('An owner session is required to view financial statements.');
}
/** Proposed local read contract. Replace with authenticated API retrieval, not UI calculations.
 * This fictional posted book intentionally does not infer accounting from unsaved/demo POS drafts. */
export function createFinancialRepository(data: FinancialDataset = financialSeed, clock = () => new Date().toISOString()): FinancialRepository {
  return {
    async getStatus(owner) { requireOwner(owner); return { updatedAt: data.updatedAt, storeName: data.storeName }; },
    async getReport(owner, kind, selection) { requireOwner(owner); return calculateFinancialReport(data, kind, selection, clock()); },
  };
}
export const financialRepository = createFinancialRepository();
