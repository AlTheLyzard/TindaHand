import type { PaymentMethod } from './pos';

/** Read-only projection of existing mock ledgers, not a new persistence schema. */
// TODO(backend): Verify transaction history row fields against the canonical events API schema.
// - Method/Action: GET / Read paginated transaction history
// - Expected Input/Payload: Page, limit, search, type, date range, and payment method filters
// - Expected Response: { items: TransactionRecord[]; total: number } with stable source IDs and timestamps
// - UI State to Wire: Use returned total for pagination and map canonical rows into history details
export type TransactionType = 'sale' | 'customerPayment' | 'expense' | 'customerDebt' | 'storeDebt' | 'supplierPayment';
export type TransactionMethod = Exclude<PaymentMethod, 'partial'>;
export type TransactionRecord = {
  id: string;
  sourceId: string;
  ownerId: string;
  transactionNumber: string;
  type: TransactionType;
  occurredAt: string;
  description: string;
  partyName: string | null;
  paymentMethod: TransactionMethod | null;
  amountCentavos: number;
  direction: 'in' | 'out' | 'neutral';
  saleId?: string;
  debtId?: string;
  saleTotalCentavos?: number;
  amountReceivedCentavos?: number;
  outstandingCentavos?: number;
};
export type TransactionCategory = 'all' | TransactionType;
export type TransactionFilterMethod = 'all' | TransactionMethod | 'kulang';
export type TransactionSortOrder = 'newest' | 'oldest';
export type TransactionFilters = { from: string; to: string; paymentMethod: TransactionFilterMethod };
