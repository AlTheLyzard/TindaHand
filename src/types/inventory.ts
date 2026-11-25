import type { PosProduct } from './pos';

// TODO(backend): Verify inventory product, batch, and restock records against the inventory API schema.
// - Method/Action: GET / Read products and batches; POST or PATCH / Save product or restock
// - Expected Input/Payload: ProductDraft or restock batch quantities and date-only stock/expiry dates
// - Expected Response: InventoryProduct and RestockRecord with canonical stock and batch values
// - UI State to Wire: Reconcile product lists, stock totals, expiry states, and form errors from responses
export type InventoryProduct = PosProduct & {
  costCentavos: number;
  expirationDate: string;
  note?: string;
  photoUri?: string;
  /** Optional for the existing catalog contract; legacy records adapt to one batch. */
  batches?: StockBatch[];
};
export type StockBatch = { id: string; quantity: number } & (
  { noExpiry: true; expirationDate: null } | { noExpiry: false; expirationDate: string }
);
export type BatchDraft = { id: string; quantity: string; noExpiry: boolean; expirationDate: string };
export type BatchErrors = Partial<Record<'quantity' | 'expirationDate', string>>;
export type AssetClassification = 'current' | 'equipment' | 'furniture';
// TODO(backend): Verify business asset records against the Owner asset API schema.
// - Method/Action: GET / Read business assets
// - Expected Input/Payload: None (authenticated Owner session)
// - Expected Response: BusinessAsset[] with integer-centavo values and date-only recordedDate
// - UI State to Wire: Populate asset screens and derive totals from the returned records
export type BusinessAsset = {
  id: string;
  name: string;
  valueCentavos: number;
  usefulLifeYears: number;
  classification: AssetClassification;
  recordedDate: string;
};
export type RestockRecord = {
  id: string;
  productId: string;
  itemName: string;
  quantity: number;
  stockDate: string;
  expirationDate: string;
  recordedAt: string;
  batches?: StockBatch[];
};
export type StockStatus = 'good' | 'low' | 'critical' | 'out';
export type InventorySort = 'name' | 'stockDesc' | 'stockAsc' | 'fast' | 'slow' | 'expiry';
export type InventoryFilters = {
  sort: InventorySort;
  category: string;
  letter: string;
  status: 'all' | StockStatus | 'nearExpiry' | 'expired';
};
export type ProductDraft = {
  name: string; category: string; expirationDate: string; note: string;
  sellingPrice: string; cost: string; quantity: string; stockDate: string; photoUri?: string;
};
