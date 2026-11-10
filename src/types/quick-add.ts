import type { ProductSelection } from './pos';

export type QuickAddKind = 'customerDebt' | 'storeDebt' | 'expense';
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
};
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
