import type { PaymentMethod } from './pos';

/** Read-only projection of existing mock ledgers, not a new persistence schema. */
export type TransactionType = 'sale' | 'customerPayment' | 'expense';
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
export type TransactionFilters = { from: string; to: string; paymentMethod: 'all' | TransactionMethod };
