import type { PosProduct } from './pos';

export type InventoryProduct = PosProduct & {
  costCentavos: number;
  expirationDate: string;
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
  name: string; category: string; expirationDate: string;
  sellingPrice: string; cost: string; quantity: string; stockDate: string; photoUri?: string;
};
