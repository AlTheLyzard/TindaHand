import { transactionSeed } from '@/data/transactions';
import { projectTransactions, type TransactionSources } from '@/utils/transactions';

/** Replaceable read, currently projecting mock sources shared with other modules.
 * TODO: Backend developer: replace this local projection with an authenticated API call
 * for canonical transaction events. Accept page and limit alongside search/category/date/
 * payment filters, return rows plus a total count, and derive store access from the session.
 * See docs/transaction-history.md and docs/api-contract.md. */
export async function readTransactions(ownerId: string, sources: TransactionSources) {
  return projectTransactions(ownerId, sources, transactionSeed);
}
