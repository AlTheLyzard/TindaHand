import { t } from '@/i18n';
import type { BusinessAsset, InventoryFilters, InventoryProduct, ProductDraft, RestockRecord, StockStatus } from '../types/inventory';
import type { CheckoutCommand, Customer, PosLedger, ProductCategory } from '../types/pos';
import { parsePaymentAmount } from './pos-payment';
import { commitMockSale, customerNameKey, emptyPosLedger } from './pos-checkout';
import { commitCustomerDebt, commitReceivablePayment } from './receivables';
import type { CustomerDebtCommand, ReceivablePayment, ReceivablePaymentCommand } from '@/types/receivables';

import { inventoryRules } from '../constants/inventory-rules';
import { batchStock, earliestBatchExpiry, earliestExpiry, productBatches, productExpiry, productStock, stockStatus, validDate, withBatches, todayInManila } from './inventory-stock';
export { batchStock, earliestBatchExpiry, earliestExpiry, expiryStatus, productBatches, productExpiry, productStock, stockCategory, stockStatus, validDate, withBatches, todayInManila } from './inventory-stock';

export const categoryLabels: Record<ProductCategory, string> = {
  get drinks() { return t("inventory.drinks"); }, get canned() { return t("inventory.canned.goods"); }, get snacks() { return t("inventory.snacks"); }, get coldCuts() { return t("inventory.cold.cuts"); },
  get groceries() { return t("inventory.groceries.rice"); }, get household() { return t("inventory.household"); }, get personalCare() { return t("inventory.personal.care"); },
};
export const assetLabels = { current: t("inventory.current.asset"), equipment: t("inventory.equipment2"), furniture: t("inventory.furniture.fixtures2") } as const;
export const stockLabels: Record<StockStatus, string> = { get good() { return t("inventory.good"); }, get low() { return t("inventory.low.stock"); }, get critical() { return t("inventory.critical.stock"); }, get out() { return t("inventory.out.of.stock"); } };
export const sortLabels = { name: t("inventory.name.a.z"), stockDesc: t("inventory.high.to.low.stock"), stockAsc: t("inventory.low.to.high.stock"), fast: t("inventory.fast.selling"), slow: t("inventory.slow.selling"), expiry: t("inventory.expiring.soon") } as const;
export const defaultFilters: InventoryFilters = { sort: 'stockDesc', category: 'all', letter: 'all', status: 'all' };
/** User-approved demo policy; replace with store settings when agreed with backend. */
export const inventoryPolicy = inventoryRules;
export function inventorySummary(products: readonly InventoryProduct[], today: string) {
  return products.reduce((result, product) => {
    result.total++;
    result.valueCentavos += product.costCentavos * productStock(product);
    result[stockStatus(productStock(product))]++;
    const expiry = productExpiry(product, today);
    if (expiry.nearExpiry) result.nearExpiry++;
    if (expiry.expired) result.expired++;
    return result;
  }, { total: 0, valueCentavos: 0, good: 0, low: 0, critical: 0, out: 0, nearExpiry: 0, expired: 0 });
}
export function filterInventory(products: readonly InventoryProduct[], query: string, filters: InventoryFilters, today: string, sales: readonly { productId: string; quantity: number }[]) {
  const sold = new Map<string, number>();
  for (const line of sales) sold.set(line.productId, (sold.get(line.productId) ?? 0) + line.quantity);
  return products.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase())
    && (filters.category === 'all' || p.category === filters.category)
    && (filters.letter === 'all' || p.name.toUpperCase().startsWith(filters.letter))
    && (filters.status === 'all' || stockStatus(productStock(p)) === filters.status || (filters.status === 'low' && stockStatus(productStock(p)) === 'critical') || (filters.status === 'nearExpiry' && productExpiry(p, today).nearExpiry) || (filters.status === 'expired' && productExpiry(p, today).expired)))
    .sort((a, b) => {
      const order = filters.sort === 'stockDesc' ? productStock(b) - productStock(a) : filters.sort === 'stockAsc' ? productStock(a) - productStock(b)
        : filters.sort === 'fast' ? (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0)
        : filters.sort === 'slow' ? (sold.get(a.id) ?? 0) - (sold.get(b.id) ?? 0)
        : filters.sort === 'expiry' ? (earliestExpiry(a) ?? '9999-99-99').localeCompare(earliestExpiry(b) ?? '9999-99-99') : 0;
      return order || a.name.localeCompare(b.name, 'en');
    });
}
export function emptyProductDraft(): ProductDraft {
  return { name: '', category: '', expirationDate: '', sellingPrice: '', cost: '', quantity: '', stockDate: todayInManila() };
}
export function productDraft(product: InventoryProduct): ProductDraft {
  return { name: product.name, category: product.category, expirationDate: product.expirationDate,
    sellingPrice: (product.unitPriceCentavos / 100).toFixed(2), cost: (product.costCentavos / 100).toFixed(2), quantity: String(product.stock), stockDate: todayInManila(), photoUri: product.photoUri };
}
export function validateProduct(draft: ProductDraft, mode: 'add' | 'edit' | 'restock', today: string) {
  const errors: Partial<Record<keyof ProductDraft, string>> = {};
  if (!draft.name.trim()) errors.name = t("inventory.product.name.is.required");
  if (!Object.prototype.hasOwnProperty.call(categoryLabels, draft.category)) errors.category = t("inventory.select.a.category");
  if (!validDate(draft.expirationDate)) errors.expirationDate = t("inventory.enter.a.valid.date.as.yyyy.mm");
  const selling = parsePaymentAmount(draft.sellingPrice), cost = parsePaymentAmount(draft.cost);
  if (selling === null || selling <= 0) errors.sellingPrice = t("inventory.enter.a.selling.price.greater.than.zero");
  if (cost === null || cost < 0) errors.cost = t("inventory.enter.a.cost.of.zero.or.more");
  if (!/^\d+$/.test(draft.quantity) || !Number.isSafeInteger(Number(draft.quantity)) || Number(draft.quantity) < (mode === 'restock' ? 1 : 0) || Number(draft.quantity) > inventoryRules.maxStock) errors.quantity = mode === 'restock' ? t("inventory.enter.an.incoming.quantity.from.1.to") : t("inventory.enter.a.whole.quantity.from.0.to");
  if (mode === 'restock' && (!validDate(draft.stockDate) || draft.stockDate > today)) errors.stockDate = t("inventory.enter.a.valid.stock.date.no.later");
  if (cost !== null && Number.isSafeInteger(Number(draft.quantity)) && !Number.isSafeInteger(cost * Number(draft.quantity))) errors.cost = t("inventory.cost.quantity.is.too.large");
  return errors;
}
export type InventoryStore = { products: InventoryProduct[]; assets: BusinessAsset[]; restocks: RestockRecord[]; pos?: PosLedger; receivablePayments?: ReceivablePayment[] };
export type InventoryAction = { type: 'saveProduct'; product: InventoryProduct } | { type: 'deleteProduct'; id: string }
  | { type: 'restock'; record: RestockRecord; photoUri?: string }
  | { type: 'saveAsset'; asset: BusinessAsset } | { type: 'deleteAsset'; id: string }
  | { type: 'completeSale'; command: CheckoutCommand }
  | { type: 'saveCustomerDebt'; command: CustomerDebtCommand }
  | { type: 'confirmReceivablePayment'; command: ReceivablePaymentCommand }
  | { type: 'registerCustomer'; customer: Customer };
function safeTotal(values: number[]) {
  return values.every(value => Number.isSafeInteger(value) && value >= 0) && Number.isSafeInteger(values.reduce((sum, value) => sum + value, 0));
}
/** Pure domain operations; services/inventory.ts is the mock data-access boundary. */
export function inventoryReducer(state: InventoryStore, action: InventoryAction): InventoryStore {
  switch (action.type) {
    case 'saveCustomerDebt': return commitCustomerDebt(state, action.command);
    case 'confirmReceivablePayment': return commitReceivablePayment(state, action.command);
    case 'completeSale': return commitMockSale(state, action.command);
    case 'registerCustomer': {
      const ledger = state.pos ?? emptyPosLedger();
      if (!action.customer.id || !action.customer.name.trim() || ledger.customers.some(customer => customer.id === action.customer.id || customerNameKey(customer.name) === customerNameKey(action.customer.name))) return state;
      return { ...state, pos: { ...ledger, customers: [...ledger.customers, { ...action.customer }] } };
    }
    case 'saveProduct': {
      if (action.product.batches && !validBatches(action.product.batches, false)) return state;
      const product = action.product.batches ? withBatches(action.product, action.product.batches) : action.product;
      if (!product.id || !product.name.trim() || !Object.prototype.hasOwnProperty.call(categoryLabels, product.category) || (!product.batches && !validDate(product.expirationDate)) || !Number.isSafeInteger(product.stock) || product.stock < 0 || product.stock > inventoryRules.maxStock || !Number.isSafeInteger(product.unitPriceCentavos) || product.unitPriceCentavos <= 0 || !Number.isSafeInteger(product.costCentavos) || product.costCentavos < 0) return state;
      const products = state.products.some(p => p.id === product.id) ? state.products.map(p => p.id === product.id ? { ...product } : p) : [...state.products, { ...product }];
      return safeTotal(products.map(p => p.costCentavos * p.stock)) ? { ...state, products } : state;
    }
    case 'deleteProduct': return { ...state, products: state.products.filter(p => p.id !== action.id) };
    case 'saveAsset': {
      const asset = action.asset;
      if (!asset.name.trim() || !Object.prototype.hasOwnProperty.call(assetLabels, asset.classification) || !Number.isSafeInteger(asset.valueCentavos) || asset.valueCentavos <= 0 || !validDate(asset.recordedDate) || !Number.isSafeInteger(asset.usefulLifeYears) || (asset.classification === 'current' ? asset.usefulLifeYears !== 0 : asset.usefulLifeYears < 1 || asset.usefulLifeYears > 100)) return state;
      const assets = state.assets.some(a => a.id === asset.id) ? state.assets.map(a => a.id === asset.id ? { ...asset } : a) : [...state.assets, { ...asset }];
      return safeTotal(assets.map(a => a.valueCentavos)) ? { ...state, assets } : state;
    }
    case 'deleteAsset': return { ...state, assets: state.assets.filter(a => a.id !== action.id) };
    case 'restock': {
      if (state.restocks.some(r => r.id === action.record.id)) return state;
      const product = state.products.find(p => p.id === action.record.productId);
      const batches = action.record.batches ?? [{ id: action.record.id, quantity: action.record.quantity, noExpiry: false as const, expirationDate: action.record.expirationDate }];
      if (!product || !action.record.id || !validDate(action.record.stockDate) || action.record.stockDate > todayInManila() || !validBatches(batches, true) || batchStock(batches) !== action.record.quantity || batches.some(batch => productBatches(product).some(existing => existing.id === batch.id)) || productStock(product) + action.record.quantity > inventoryRules.maxStock || !safeTotal(state.products.map(p => (productStock(p) + (p.id === product.id ? action.record.quantity : 0)) * p.costCentavos))) return state;
      const next = withBatches({ ...product, photoUri: action.photoUri ?? product.photoUri }, [...productBatches(product), ...batches]);
      return { ...state, products: state.products.map(p => p.id === product.id ? next : p), restocks: [...state.restocks, { ...action.record, expirationDate: earliestBatchExpiry(batches) ?? '', batches: batches.map(batch => ({ ...batch })) }] };
    }
  }
}

function validBatches(batches: readonly import('../types/inventory').StockBatch[], positive: boolean) {
  return (!positive || batches.length > 0) && new Set(batches.map(batch => batch.id)).size === batches.length
    && batches.every(batch => !!batch.id && Number.isSafeInteger(batch.quantity) && batch.quantity >= (positive ? 1 : 0)
      && (batch.noExpiry ? batch.expirationDate === null : validDate(batch.expirationDate)))
    && batchStock(batches) <= inventoryRules.maxStock;
}
