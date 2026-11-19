import { businessAssets, inventoryProducts, inventorySales } from '@/data/inventory';
import type { DeviceSession, OwnerIdentity } from '@/types/auth';
import type { MockSale } from '@/types/pos';
import { inventoryReducer, type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { emptyPosLedger } from '@/utils/pos-checkout';
import { saleLines } from '@/utils/pos-records';
import { receivablesSeed } from '@/data/receivables';
import { hasCapability } from '@/utils/operator-access';
import { apiFetch } from '@/services/api';

// ── Legacy in-memory helpers (used by state/inventory.tsx — do not remove) ──────────────
export function loadMockInventory(): InventoryStore {
  return { products: inventoryProducts.map(product => ({ ...product })),
    assets: businessAssets.map(asset => ({ ...asset })), restocks: [],
    pos: { ...emptyPosLedger(), customers: [...emptyPosLedger().customers, ...receivablesSeed.customers.map(customer => ({ ...customer }))], debts: receivablesSeed.debts.map(debt => ({ ...debt, items: {} })) },
    receivablePayments: receivablesSeed.payments.map(payment => ({ ...payment })) };
}

export function getInventorySales(sales: readonly MockSale[]) {
  return [...inventorySales, ...saleLines(sales)];
}

export function applyInventoryAction(store: InventoryStore, owner: OwnerIdentity | null, action: InventoryAction): InventoryStore {
  if (!owner || ('command' in action && action.command.ownerId !== owner.id)) return store;
  return inventoryReducer(store, action);
}

export function applyOperatorPosAction(store: InventoryStore, session: DeviceSession | null,
  action: Extract<InventoryAction, { type: 'completeSale' }>): InventoryStore {
  if (!session || session.role !== 'operator' || session.ownerId !== session.owner.id
    || action.command.ownerId !== session.ownerId || !hasCapability(session, 'pos')
    || (action.command.draft.method === 'partial' && !hasCapability(session, 'receivables'))) return store;
  return inventoryReducer(store, action);
}

// ── Real API functions ────────────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: string;                    // "prod-abc123" — matches backend ProductOut.id: str
  name: string;
  category: string;
  unitPriceCentavos: number;     // backend field name (not priceCentavos)
  costCentavos: number;
  stock: number;                 // backend field name (not stockQuantity)
  expirationDate: string | null;
  photoUri: string | null;
  batches?: {
    id: string;
    quantity: number;
    noExpiry: boolean;
    expirationDate: string | null;
  }[] | null;
}

export interface ApiAsset {
  id: string;    // "asset-abc123" — matches backend AssetOut.id: str
  name: string;
  classification: string;
  valueCentavos: number;         // backend field (not purchasePriceCentavos)
  usefulLifeYears: number;
  recordedDate: string;          // backend field (not purchasedAt)
}

export interface ExpiryAlert {
  productId: number;
  productName: string;
  expirationDate: string;
  daysUntilExpiry: number;
  stockQuantity: number;
}

export interface RestockRecord {
  id: number;
  productId: number;
  productName: string;
  quantityAdded: number;
  costPerUnitCentavos: number;
  expirationDate: string | null;
  occurredAt: string;
}

/** List all products for this store. */
export async function getProducts(): Promise<ApiProduct[]> {
  return apiFetch<ApiProduct[]>('/inventory/products');
}

/** Create a new product. */
export async function createProduct(data: {
  name: string;
  category: string;
  unitPriceCentavos: number;
  costCentavos: number;
  stock?: number;
  expirationDate?: string;
  photoUri?: string;
  batches?: { id?: string; quantity: number; noExpiry: boolean; expirationDate?: string }[];
}): Promise<ApiProduct> {
  return apiFetch<ApiProduct>('/inventory/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Update a product. */
export async function updateProduct(id: string, data: Partial<{
  name: string;
  category: string;
  unitPriceCentavos: number;
  costCentavos: number;
  expirationDate: string;
  photoUri: string;
}>): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/inventory/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Delete a product. */
export async function deleteProduct(id: string): Promise<void> {
  return apiFetch<void>(`/inventory/products/${id}`, { method: 'DELETE' });
}

/** Get expiry alerts — products expiring within `daysAhead` days, sorted by soonest first. */
export async function getExpiryAlerts(daysAhead = 30): Promise<ExpiryAlert[]> {
  return apiFetch<ExpiryAlert[]>(`/inventory/expiry-alerts?days_ahead=${daysAhead}`);
}

/** List all assets. */
export async function getAssets(): Promise<ApiAsset[]> {
  return apiFetch<ApiAsset[]>('/inventory/assets');
}

/** Create an asset. */
export async function createAsset(data: {
  name: string;
  classification: string;
  valueCentavos: number;
  usefulLifeYears: number;
  recordedDate: string;
}): Promise<ApiAsset> {
  return apiFetch<ApiAsset>('/inventory/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** List restocks. */
export async function getRestocks(): Promise<RestockRecord[]> {
  return apiFetch<RestockRecord[]>('/inventory/restocks');
}

/** Add a restock for a product. */
export async function addRestock(productId: string, data: {
  quantity: number;
  stockDate: string;        // YYYY-MM-DD
  expirationDate: string;   // YYYY-MM-DD or "noExpiry"
  batchId?: string;
}): Promise<RestockRecord> {
  return apiFetch<RestockRecord>(`/inventory/products/${productId}/restock`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Update an asset. */
export async function updateAsset(id: string, data: Partial<{
  name: string;
  classification: string;
  valueCentavos: number;
  usefulLifeYears: number;
  recordedDate: string;
}>): Promise<ApiAsset> {
  return apiFetch<ApiAsset>(`/inventory/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Delete an asset. */
export async function deleteAsset(id: string): Promise<void> {
  return apiFetch<void>(`/inventory/assets/${id}`, { method: 'DELETE' });
}
