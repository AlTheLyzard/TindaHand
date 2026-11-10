import { inventoryRules } from '../constants/inventory-rules';
import type { InventoryProduct, StockBatch, StockStatus } from '../types/inventory';

export function todayInManila(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: inventoryRules.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
export function stockStatus(stock: number): StockStatus {
  return stock <= 0 ? 'out' : stock <= inventoryRules.criticalStock ? 'critical' : stock <= inventoryRules.lowStock ? 'low' : 'good';
}
export function stockCategory(stock: number) {
  const status = stockStatus(stock);
  return status === 'critical' ? 'low' : status;
}
export function expiryStatus(date: string | null, today: string) {
  if (!date || !validDate(date) || !validDate(today)) return 'fresh';
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return days < 0 ? 'expired' : days <= inventoryRules.expiryDays ? 'nearExpiry' : 'fresh';
}
/** BACKEND-INTEGRATION: INVENTORY_RULES — adapt legacy products without changing
 * their contract. All new writes carry explicit dated/undated remaining batches. */
export function productBatches(product: InventoryProduct): StockBatch[] {
  return product.batches ?? [{ id: `legacy-${product.id}`, quantity: product.stock,
    ...(product.expirationDate ? { noExpiry: false as const, expirationDate: product.expirationDate } : { noExpiry: true as const, expirationDate: null }) }];
}
export function batchStock(batches: readonly StockBatch[]) { return batches.reduce((sum, batch) => sum + batch.quantity, 0); }
export function productStock(product: InventoryProduct) { return batchStock(productBatches(product)); }
export function earliestExpiry(product: InventoryProduct) {
  return earliestBatchExpiry(productBatches(product));
}
export function earliestBatchExpiry(batches: readonly StockBatch[]) {
  return batches.filter(batch => batch.quantity > 0 && !batch.noExpiry && validDate(batch.expirationDate))
    .map(batch => batch.expirationDate!).sort()[0] ?? null;
}
export function productExpiry(product: InventoryProduct, today: string) {
  const eligible = productBatches(product).filter(batch => batch.quantity > 0 && !batch.noExpiry);
  return { nearExpiry: eligible.some(batch => expiryStatus(batch.expirationDate, today) === 'nearExpiry'),
    expired: eligible.some(batch => expiryStatus(batch.expirationDate, today) === 'expired') };
}
export function withBatches(product: InventoryProduct, batches: readonly StockBatch[]): InventoryProduct {
  const next = { ...product, batches: batches.map(batch => ({ ...batch })), stock: batchStock(batches) };
  return { ...next, expirationDate: earliestExpiry(next) ?? '' };
}
/** Retain existing total availability (expired units included). Deplete recorded
 * batch order without introducing FEFO/expiry restrictions into POS or credit. */
export function deductProductStock(product: InventoryProduct, quantity: number) {
  if (!product.batches) return { ...product, stock: product.stock - quantity };
  let remaining = quantity;
  return withBatches(product, product.batches.map(batch => {
    const taken = Math.min(batch.quantity, remaining); remaining -= taken;
    return { ...batch, quantity: batch.quantity - taken };
  }));
}
