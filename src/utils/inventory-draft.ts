import type { BatchDraft, BatchErrors, InventoryProduct, ProductDraft, StockBatch } from '../types/inventory';
import { inventoryRules } from '../constants/inventory-rules';
import { productBatches, validDate, withBatches } from './inventory-stock';
import { emptyProductDraft, productDraft, validateProduct } from './inventory';
import { parsePaymentAmount } from './pos-payment';

export type InventoryDraft = { details: ProductDraft; batches: BatchDraft[] };
export function newBatch(id: string): BatchDraft { return { id, quantity: '', noExpiry: false, expirationDate: '' }; }
export function createInventoryDraft(id: string, product?: InventoryProduct): InventoryDraft {
  return { details: product ? productDraft(product) : emptyProductDraft(),
    batches: product ? productBatches(product).map(batch => ({ ...batch, quantity: String(batch.quantity), expirationDate: batch.expirationDate ?? '' })) : [newBatch(id)] };
}
export function batchErrors(batch: BatchDraft, allowZero = false): BatchErrors {
  const errors: BatchErrors = {};
  if (!/^\d+$/.test(batch.quantity) || !Number.isSafeInteger(Number(batch.quantity)) || Number(batch.quantity) < (allowZero ? 0 : 1) || Number(batch.quantity) > inventoryRules.maxStock)
    errors.quantity = `Enter a whole quantity from ${allowZero ? 0 : 1} to ${inventoryRules.maxStock.toLocaleString('en')}.`;
  if (!batch.noExpiry && !validDate(batch.expirationDate)) errors.expirationDate = 'Enter a valid expiry date.';
  return errors;
}
export function setBatchNoExpiry(batch: BatchDraft, noExpiry: boolean): BatchDraft {
  return { ...batch, noExpiry, expirationDate: noExpiry ? '' : batch.expirationDate };
}
export function toStockBatches(batches: readonly BatchDraft[]): StockBatch[] {
  return batches.map(batch => ({ id: batch.id, quantity: Number(batch.quantity),
    ...(batch.noExpiry ? { noExpiry: true as const, expirationDate: null } : { noExpiry: false as const, expirationDate: batch.expirationDate }) }));
}
export function draftQuantity(batches: readonly BatchDraft[]) {
  return batches.reduce((sum, batch) => sum + (/^\d+$/.test(batch.quantity) ? Number(batch.quantity) : 0), 0);
}
export function detailsErrors(details: ProductDraft, today: string) {
  return validateProduct({ ...details, quantity: '1', expirationDate: today }, 'add', today);
}
export function buildDraftProduct(id: string, draft: InventoryDraft): InventoryProduct {
  return withBatches({ id, name: draft.details.name.trim(), category: draft.details.category as InventoryProduct['category'],
    unitPriceCentavos: parsePaymentAmount(draft.details.sellingPrice)!, costCentavos: parsePaymentAmount(draft.details.cost)!,
    photoUri: draft.details.photoUri, stock: 0, expirationDate: '' }, toStockBatches(draft.batches));
}
/** Clear only the selected step. Drafts are detached from the repository until
 * the final save; inline Update Batch and batch deletion never dispatch writes. */
export function clearInventoryStep(draft: InventoryDraft, step: 'details' | 'stock', batchId: string): InventoryDraft {
  return step === 'details' ? { ...draft, details: emptyProductDraft() } : { ...draft, batches: [newBatch(batchId)] };
}
