import type { QuickAddRecord } from './quick-add';

/** Frontend catalog contract; no backend schema has been agreed yet. */
// TODO(backend): Verify catalog and checkout product fields against inventory/POS API schemas.
// - Method/Action: GET / Read POS catalog; POST / Complete sale
// - Expected Input/Payload: ProductSelection snapshots and PaymentDraft with customer/tender details
// - Expected Response: PosProduct[] or canonical sale/payment records with current stock and integer-centavo totals
// - UI State to Wire: Refresh catalog/stock and clear checkout drafts only after confirmed sale responses
export type ProductCategory = 'drinks' | 'canned' | 'snacks' | 'coldCuts' | 'groceries' | 'household' | 'personalCare';
export type PosCatalogPriceRange = 'all' | 'under50' | '50to100' | 'over100';
export type PosCatalogAvailability = 'all' | 'inStock' | 'lowStock' | 'outOfStock';
export type PosCatalogSort = 'default' | 'az' | 'za';
export type PosCatalogFilters = {
  category: ProductCategory | 'all';
  priceRange: PosCatalogPriceRange;
  sort: PosCatalogSort;
  availability: PosCatalogAvailability;
};
export type PosProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  unitPriceCentavos: number;
  stock: number;
  photoUri?: string;
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
// TODO(backend): Verify customer identity fields and store scope against the customer API schema.
// - Method/Action: GET / Read customers; POST / Create or link customer
// - Expected Input/Payload: Search query or normalized customer name and optional stable ID
// - Expected Response: Customer with canonical ID and display name
// - UI State to Wire: Preserve selected customer IDs and map duplicate/name validation errors
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
// TODO(backend): Verify completed sale and tender records against the POS API schema.
// - Method/Action: POST / Complete sale and record tenders atomically
// - Expected Input/Payload: CheckoutCommand with owner/store session, item snapshots, and payment draft
// - Expected Response: MockSale-compatible canonical sale, payment, and any receivable records
// - UI State to Wire: Show success and refresh stock/history only after server confirmation
export type MockSale = {
  id: string; ownerId: string; occurredAt: string; customerId: string | null;
  items: ProductSelection;
  totalCentavos: number;
  remainingCentavos: number; paymentStatus: 'paid' | 'partial' | 'unpaid';
  payment: SalePayment;
};

export type PosLedger = { customers: Customer[]; sales: MockSale[]; debts: QuickAddRecord[] };
export type CheckoutCommand = { id: string; ownerId: string; occurredAt: string; selection: ProductSelection; draft: PaymentDraft };

/** Greedy coin change breakdown returned by the backend after a cash sale. */
export type ChangeBreakdown = {
  totalChangeCentavos: number;
  /** denomination in centavos → count, e.g. { 10000: 1, 500: 1, 200: 1 } */
  breakdown: Record<number, number>;
};

export type CheckoutApiResult = {
  saleId: string;
  change: ChangeBreakdown | null;
};
