import type { ProductSelection } from './pos';

export type QuickAddKind = 'customerDebt' | 'storeDebt' | 'expense' | 'asset';
export type QuickAddDraft = {
  kind: QuickAddKind;
  borrowing: 'cash' | 'product';
  name: string;
  creditorId?: string;
  customerId?: string;
  amount: string;
  category: string;
  details: string;
  expenseDate: string;
  dueDate: string;
  items: ProductSelection;
  // Asset-specific fields (only used when kind === 'asset')
  assetClassification: string;
  assetLife: string;
};
// TODO(backend): Verify quick-add debt and expense record fields against the approved API schemas.
// - Method/Action: POST / Create customer debt, store debt, or expense
// - Expected Input/Payload: QuickAddDraft with stable linked IDs, item snapshots, amounts, and date-only dates
// - Expected Response: QuickAddRecord with canonical IDs, integer-centavo totals, status, and event timestamp
// - UI State to Wire: Keep drafts on failure and refresh ledgers/summaries after confirmed writes
export type QuickAddRecord = {
  id: string;
  ownerId: string;
  kind: QuickAddKind;
  name: string;
  amountCentavos: number;
  category: string | null;
  details: string;
  expenseDate: string | null;
  dueDate: string | null;
  borrowing: 'cash' | 'product' | null;
  items: ProductSelection;
  paymentStatus: 'unpaid' | 'partial' | 'paid' | null;
  creditorId?: string;
  customerId?: string;
  saleId?: string;
  originalAmountCentavos?: number;
  paidCentavos?: number;
  occurredAt: string;
};
