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
  id: number;
  name: string;
  category: string;
  priceCentavos: number;
  stockQuantity: number;
  reorderPoint: number | null;
  expirationDate: string | null;
  barcode: string | null;
}

export interface ApiAsset {
  id: number;
  name: string;
  classification: string;
  purchasePriceCentavos: number;
  purchasedAt: string;
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
  priceCentavos: number;
  reorderPoint?: number;
  barcode?: string;
}): Promise<ApiProduct> {
  return apiFetch<ApiProduct>('/inventory/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Update a product. */
export async function updateProduct(id: number, data: Partial<{
  name: string;
  category: string;
  priceCentavos: number;
  reorderPoint: number;
  barcode: string;
}>): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/inventory/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Delete a product. */
export async function deleteProduct(id: number): Promise<void> {
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
  purchasePriceCentavos: number;
  purchasedAt: string;
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

/** Add a restock batch for a product. */
export async function addRestock(data: {
  productId: number;
  quantityAdded: number;
  costPerUnitCentavos: number;
  expirationDate?: string;
}): Promise<RestockRecord> {
  return apiFetch<RestockRecord>('/inventory/restocks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** Update an asset. */
export async function updateAsset(id: number, data: Partial<{
  name: string;
  classification: string;
  purchasePriceCentavos: number;
  purchasedAt: string;
}>): Promise<ApiAsset> {
  return apiFetch<ApiAsset>(`/inventory/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/** Delete an asset. */
export async function deleteAsset(id: number): Promise<void> {
  return apiFetch<void>(`/inventory/assets/${id}`, { method: 'DELETE' });
}
