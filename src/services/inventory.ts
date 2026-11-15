import { businessAssets, inventoryProducts, inventorySales } from '@/data/inventory';
import type { DeviceSession, OwnerIdentity } from '@/types/auth';
import type { MockSale } from '@/types/pos';
import { inventoryReducer, type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { emptyPosLedger } from '@/utils/pos-checkout';
import { saleLines } from '@/utils/pos-records';
import { receivablesSeed } from '@/data/receivables';
import { hasCapability } from '@/utils/operator-access';

// TODO(BACKEND): Replace seed loading with store-scoped reads; search/filter/ranking
// currently use complete local collections, without pagination. See docs/backend-handoff.md#inventory-and-pos.
export function loadMockInventory(): InventoryStore {
  return { products: inventoryProducts.map(product => ({ ...product })),
    assets: businessAssets.map(asset => ({ ...asset })), restocks: [],
    pos: { ...emptyPosLedger(), customers: [...emptyPosLedger().customers, ...receivablesSeed.customers.map(customer => ({ ...customer }))], debts: receivablesSeed.debts.map(debt => ({ ...debt, items: {} })) },
    receivablePayments: receivablesSeed.payments.map(payment => ({ ...payment })) };
}

export function getInventorySales(sales: readonly MockSale[]) {
  return [...inventorySales, ...saleLines(sales)];
}

// TODO(BACKEND): These synchronous mock writes simulate success. Authorize every
// command on the server, validate current data, and await confirmed writes before
// updating UI. Sale + tender + customer/debt + stock, and restock + stock, require
// atomic transactions and durable idempotency. See docs/api-contract.md#inventory-and-pos.
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
