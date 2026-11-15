import { transactionSeed } from '@/data/transactions';
import { projectTransactions, type TransactionSources } from '@/utils/transactions';

/** Replaceable read, currently projecting mock sources shared with other modules.
 * TODO(BACKEND): Replace this local projection with an async authenticated store-scoped
 * query for canonical sale, payment, collection and expense events with actor attribution.
 * Agree server filters, ordering and pagination before wiring the UI; derive store access
 * from the session rather than trusting ownerId. See docs/transaction-history.md and
 * docs/api-contract.md. */
export async function readTransactions(ownerId: string, sources: TransactionSources) {
  return projectTransactions(ownerId, sources, transactionSeed);
}
