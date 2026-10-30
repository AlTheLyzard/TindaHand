import type { QuickAddRecord } from './quick-add';

/** Frontend catalog contract; no backend schema has been agreed yet. */
export type ProductCategory = 'drinks' | 'canned' | 'snacks' | 'coldCuts' | 'groceries' | 'household' | 'personalCare';
export type PosProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  unitPriceCentavos: number;
  stock: number;
};
export type ProductSelection = Readonly<Record<string, {
  productId: string;
  itemName: string;
  unitPriceCentavos: number;
  quantity: number;
}>>;

export type TenderMethod = 'cash' | 'gcash';
export type PaymentMethod = TenderMethod | 'split' | 'partial';
export type PaymentDraft = {
  method: PaymentMethod;
  cashAmount: string; gcashAmount: string; gcashReference: string;
  splitCashAmount: string; splitGcashAmount: string; splitReference: string;
  partialAmount: string; partialMethod: TenderMethod | null; partialReference: string;
  customerId: string | null; customerName: string;
};
export type Customer = { id: string; name: string };
export type SalePayment = {
  id: string; saleId: string; method: PaymentMethod;
  /** Manually entered tenders do not verify an electronic transfer. */
  recording: 'manual';
  tenders: { method: TenderMethod; receivedCentavos: number; reference: string | null }[];
  receivedCentavos: number; appliedCentavos: number;
  cashChangeCentavos: number;
};
/** In-memory records only. Map through an adapter once an API contract is agreed. */
export type MockSale = {
  id: string; ownerId: string; occurredAt: string; customerId: string | null;
  items: ProductSelection;
  totalCentavos: number;
  remainingCentavos: number; paymentStatus: 'paid' | 'partial' | 'unpaid';
  payment: SalePayment;
};

export type PosLedger = { customers: Customer[]; sales: MockSale[]; debts: QuickAddRecord[] };
export type CheckoutCommand = { id: string; ownerId: string; occurredAt: string; selection: ProductSelection; draft: PaymentDraft };
