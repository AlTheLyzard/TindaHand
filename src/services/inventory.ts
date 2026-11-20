import { businessAssets, inventoryProducts, inventorySales } from '@/data/inventory';
import type { DeviceSession, OwnerIdentity } from '@/types/auth';
import type { MockSale } from '@/types/pos';
import { inventoryReducer, type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { emptyPosLedger } from '@/utils/pos-checkout';
import { saleLines } from '@/utils/pos-records';
import { receivablesSeed } from '@/data/receivables';
import { hasCapability } from '@/utils/operator-access';

// TODO(backend): Replace seed loading with authenticated, store-scoped inventory reads.
// - Method/Action: GET / Fetch products, batches, assets, and sales summaries
// - Expected Input/Payload: Authenticated session, role scope, and search/filter/page parameters
// - Expected Response: InventoryStore-compatible records with canonical stock, batch, and asset values
// - UI State to Wire: Replace local collections and connect loading, error, retry, and empty states
export function loadMockInventory(includeAssets = true): InventoryStore {
  return { products: inventoryProducts.map(product => ({ ...product })),
    assets: includeAssets ? businessAssets.map(asset => ({ ...asset })) : [], restocks: [],
    pos: { ...emptyPosLedger(), customers: [...emptyPosLedger().customers, ...receivablesSeed.customers.map(customer => ({ ...customer }))], debts: receivablesSeed.debts.map(debt => ({ ...debt, items: {} })) },
    receivablePayments: receivablesSeed.payments.map(payment => ({ ...payment })) };
}

export function getInventorySales(sales: readonly MockSale[]) {
  return [...inventorySales, ...saleLines(sales)];
}

// TODO(backend): Replace local reducer writes with authorized, confirmed inventory and POS mutations.
// - Method/Action: POST, PATCH, or DELETE / Save product, restock, sale, customer, or asset changes
// - Expected Input/Payload: InventoryAction plus authenticated role/session and durable idempotency key
// - Expected Response: Canonical changed records; sale/tenders/debt/stock and restock/stock commit atomically
// - UI State to Wire: Await confirmation before updating state; preserve drafts and expose retry/conflict errors
export function applyInventoryAction(store: InventoryStore, owner: OwnerIdentity | null, action: InventoryAction): InventoryStore {
  if (!owner || ('command' in action && action.command.ownerId !== owner.id)) return store;
  return inventoryReducer(store, action);
}

/** Operators may commit POS sales only; every other inventory action stays Owner-only. */
export function applyOperatorPosAction(store: InventoryStore, session: DeviceSession | null,
  action: Extract<InventoryAction, { type: 'completeSale' }>): InventoryStore {
  if (!session || session.role !== 'operator' || session.ownerId !== session.owner.id
    || action.command.ownerId !== session.ownerId || !hasCapability(session, 'pos')
    || (action.command.draft.method === 'partial' && !hasCapability(session, 'receivables'))) return store;
  return inventoryReducer(store, action);
}

/** Operators may edit existing products or restock according to their assigned capability. */
export function applyOperatorInventoryAction(store: InventoryStore, session: DeviceSession | null,
  action: Extract<InventoryAction, { type: 'saveProduct' | 'restock' }>): InventoryStore {
  if (!session || session.role !== 'operator' || session.ownerId !== session.owner.id) return store;
  if (action.type === 'saveProduct') {
    if (!hasCapability(session, 'inventory-edit') || !store.products.some(product => product.id === action.product.id)) return store;
  } else if (!hasCapability(session, 'restock')) return store;
  return inventoryReducer(store, action);
}
