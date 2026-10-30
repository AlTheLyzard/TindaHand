import { businessAssets, inventoryProducts, inventorySales } from '@/data/inventory';
import type { OwnerIdentity } from '@/types/auth';
import type { MockSale } from '@/types/pos';
import { inventoryReducer, type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { emptyPosLedger } from '@/utils/pos-checkout';
import { saleLines } from '@/utils/pos-records';

// TODO(BACKEND): Replace seed loading with store-scoped reads; search/filter/ranking
// currently use complete local collections, without pagination. See docs/backend-handoff.md#inventory-and-pos.
export function loadMockInventory(): InventoryStore {
  return { products: inventoryProducts.map(product => ({ ...product })),
    assets: businessAssets.map(asset => ({ ...asset })), restocks: [], pos: emptyPosLedger() };
}

export function getInventorySales(sales: readonly MockSale[]) {
  return [...inventorySales, ...saleLines(sales)];
}

// TODO(BACKEND): These synchronous mock writes simulate success. Authorize every
// command on the server, validate current data, and await confirmed writes before
// updating UI. Sale + tender + customer/debt + stock, and restock + stock, require
// atomic transactions and durable idempotency. See docs/api-contract.md#inventory-and-pos.
export function applyInventoryAction(store: InventoryStore, owner: OwnerIdentity | null, action: InventoryAction): InventoryStore {
  if (!owner || (action.type === 'completeSale' && action.command.ownerId !== owner.id)) return store;
  return inventoryReducer(store, action);
}
