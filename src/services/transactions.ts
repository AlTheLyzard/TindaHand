import { transactionSeed } from '@/data/transactions';
import { projectTransactions, type TransactionSources } from '@/utils/transactions';

/** Replaceable read, currently projecting mock sources shared with other modules. */
// TODO(backend): Replace the local projection with authenticated canonical transaction history.
// - Method/Action: GET / Fetch paginated transaction history
// - Expected Input/Payload: Session-derived store scope, page, limit, search, category, dates, and payment method
// - Expected Response: { items: TransactionRecord[]; total: number }
// - UI State to Wire: Drive filters and pagination from server rows/total and expose retryable load errors
export async function readTransactions(ownerId: string, sources: TransactionSources, scope: 'owner' | 'operator' = 'owner') {
  const rows = projectTransactions(ownerId, sources, transactionSeed);
  // Operators can review sales and customer receivables for their assigned store.
  // Owner expenses, store payables, and supplier payments stay out of this read view.
  return scope === 'operator' ? rows.filter(row => ['sale', 'customerPayment', 'customerDebt'].includes(row.type)) : rows;
}
