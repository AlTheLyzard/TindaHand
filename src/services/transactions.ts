import { transactionSeed } from '@/data/transactions';
import { projectTransactions, type TransactionSources } from '@/utils/transactions';

/** Replaceable owner-scoped read, using the same in-memory sources as other modules. */
export async function readTransactions(ownerId: string, sources: TransactionSources) {
  return projectTransactions(ownerId, sources, transactionSeed);
}
