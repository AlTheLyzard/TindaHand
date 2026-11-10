const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const context = { exports: {}, Intl, require: name => name === '@/i18n' ? load('src/i18n/index.ts') : name.startsWith('@/') ? load(name.replace('@/', 'src/') + '.ts') : load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts'))) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
const inv = load('src/utils/inventory.ts');
const batches = load('src/utils/inventory-stock.ts');
const drafts = load('src/utils/inventory-draft.ts');
const { inventoryProducts, businessAssets, inventorySales } = load('src/data/inventory.ts');
const today = '2026-10-24';
const valid = { ...inv.emptyProductDraft(), name: 'Demo Rice', category: 'groceries', sellingPrice: '12.29', cost: '10.20', quantity: '8', expirationDate: '2027-01-01', stockDate: today };

test('stock and expiry boundaries distinguish zero, critical, low, expired and today', () => {
  for (const [quantity, status] of [[0, 'out'], [1, 'critical'], [2, 'critical'], [3, 'low'], [5, 'low'], [6, 'good']]) assert.equal(inv.stockStatus(quantity), status);
  for (const [date, expected] of [['2026-10-23', 'expired'], ['2026-10-24', 'nearExpiry'], ['2026-11-23', 'nearExpiry'], ['2026-11-24', 'fresh']]) assert.equal(inv.expiryStatus(date, today), expected);
  assert.equal(inv.validDate('2027-02-29'), false);
  assert.equal(inv.validDate('2028-02-29'), true);
  assert.equal(inv.validDate('2026-13-01'), false);
  assert.equal(inv.validDate('10/24/2026'), false);
});
test('validation rejects malformed money, fractional/negative stock and future stock dates', () => {
  assert.equal(Object.keys(inv.validateProduct(valid, 'add', today)).length, 0);
  for (const value of ['', '-1', '1e3', '1.234', 'Infinity']) assert.ok(inv.validateProduct({ ...valid, sellingPrice: value }, 'add', today).sellingPrice);
  for (const value of ['', '-1', '2.5', '1000001', 'Infinity']) assert.ok(inv.validateProduct({ ...valid, quantity: value }, 'add', today).quantity);
  assert.equal(inv.validateProduct({ ...valid, quantity: '0' }, 'add', today).quantity, undefined);
  assert.ok(inv.validateProduct({ ...valid, quantity: '0' }, 'restock', today).quantity);
  assert.ok(inv.validateProduct({ ...valid, stockDate: '2026-10-25' }, 'restock', today).stockDate);
  assert.ok(inv.validateProduct({ ...valid, expirationDate: '2027-02-30' }, 'edit', today).expirationDate);
  assert.ok(inv.validateProduct({ ...valid, category: 'missing', name: ' ' }, 'add', today).category);
});
test('summary uses cost times stock and filters intersect search, category, letter, status', () => {
  const products = inventoryProducts.slice(0, 4);
  const summary = inv.inventorySummary(products, today);
  assert.equal(summary.total, 4);
  assert.equal(summary.valueCentavos, 12 * 1800 + 3 * 1600 + 8 * 1200);
  assert.equal(summary.out, 1);
  assert.equal(summary.low, 1);
  const filters = { ...inv.defaultFilters, category: 'drinks', letter: 'C', status: 'good' };
  assert.equal(inv.filterInventory(products, '  c2 ', filters, today, inventorySales)[0].id, 'demo-c2');
  assert.equal(inv.filterInventory(products, 'c2', { ...filters, letter: 'D' }, today, inventorySales).length, 0);
  const low = inv.filterInventory(inventoryProducts, '', { ...inv.defaultFilters, status: 'low' }, today, inventorySales);
  assert.ok(low.some(p => p.stock === 2));
  assert.ok(low.every(p => p.stock > 0 && p.stock <= 5));
});
test('sorting derives sales rankings and expiry order without mutating seeds', () => {
  const products = inventoryProducts.slice(0, 4);
  const before = JSON.stringify(products);
  const filter = sort => inv.filterInventory(products, '', { ...inv.defaultFilters, sort }, today, inventorySales);
  assert.equal(filter('stockAsc')[0].stock, 0);
  assert.equal(filter('stockDesc')[0].stock, 12);
  assert.equal(filter('fast')[0].id, 'demo-c2');
  assert.equal(filter('slow')[0].id, 'demo-dinorado');
  assert.equal(filter('expiry')[0].id, 'demo-delata');
  assert.equal(JSON.stringify(products), before);
});
test('restock is atomic, immutable, idempotent, and retains history after product deletion', () => {
  const state = { products: inventoryProducts.map(p => ({ ...p })), assets: [], restocks: [] };
  const product = state.products[2];
  const before = JSON.stringify(state);
  const record = { id: 'r1', productId: product.id, itemName: product.name, quantity: 8, stockDate: today, expirationDate: '2028-01-01', recordedAt: '2026-10-24T10:00:00Z' };
  const next = inv.inventoryReducer(state, { type: 'restock', record });
  assert.equal(next.products[2].stock, 8);
  assert.equal(inv.stockStatus(next.products[2].stock), 'good');
  assert.equal(next.restocks.length, 1);
  assert.equal(JSON.stringify(state), before);
  assert.equal(inv.inventoryReducer(next, { type: 'restock', record }), next);
  for (const quantity of [0, -1, 0.5, 1000001]) assert.equal(inv.inventoryReducer(state, { type: 'restock', record: { ...record, quantity } }), state);
  const deleted = inv.inventoryReducer(next, { type: 'deleteProduct', id: product.id });
  assert.equal(deleted.products.some(p => p.id === product.id), false);
  assert.equal(deleted.restocks[0].itemName, product.name);
});
test('product and asset edits propagate to derived values and do not change seed fixtures', () => {
  let state = { products: inventoryProducts.map(p => ({ ...p })), assets: businessAssets.map(a => ({ ...a })), restocks: [] };
  const seeds = JSON.stringify({ inventoryProducts, businessAssets });
  const product = { ...state.products[0], name: 'Updated Rice', stock: 10, costCentavos: 1000 };
  state = inv.inventoryReducer(state, { type: 'saveProduct', product });
  assert.equal(state.products[0].name, 'Updated Rice');
  assert.equal(state.products[0].stock * state.products[0].costCentavos, 10000);
  const asset = { ...state.assets[0], valueCentavos: 5000 };
  state = inv.inventoryReducer(state, { type: 'saveAsset', asset });
  assert.equal(state.assets[0].valueCentavos, 5000);
  state = inv.inventoryReducer(state, { type: 'deleteAsset', id: asset.id });
  assert.equal(state.assets.length, 2);
  assert.equal(JSON.stringify({ inventoryProducts, businessAssets }), seeds);
});
test('domain writes reject invalid categories and totals beyond exact centavo precision', () => {
  const state = { products: inventoryProducts.map(p => ({ ...p })), assets: businessAssets.map(a => ({ ...a })), restocks: [] };
  assert.equal(inv.inventoryReducer(state, { type: 'saveProduct', product: { ...state.products[0], category: 'toString' } }), state);
  assert.equal(inv.inventoryReducer(state, { type: 'saveProduct', product: { ...state.products[0], stock: 1, costCentavos: Number.MAX_SAFE_INTEGER } }), state);
  assert.equal(inv.inventoryReducer(state, { type: 'saveAsset', asset: { ...state.assets[0], valueCentavos: Number.MAX_SAFE_INTEGER } }), state);
  assert.equal(inv.inventoryReducer(state, { type: 'saveAsset', asset: { ...state.assets[0], classification: 'equipment', usefulLifeYears: 0 } }), state);
});

const dated = (id, quantity, expirationDate) => ({ id, quantity, expirationDate, noExpiry: false });
const undated = (id, quantity) => ({ id, quantity, expirationDate: null, noExpiry: true });
const batched = (lots, patch = {}) => batches.withBatches({ ...inventoryProducts[0], ...patch }, lots);
test('three UI stock categories include the preserved critical tier at 0, 1, 5 and 6', () => {
  for (const [quantity, expected] of [[0, 'out'], [1, 'low'], [5, 'low'], [6, 'good']]) assert.equal(batches.stockCategory(quantity), expected);
});
test('expiry is per remaining dated batch, with inclusive today/30 day boundaries', () => {
  for (const [date, expected] of [['2026-10-23', 'expired'], [today, 'nearExpiry'], ['2026-11-23', 'nearExpiry'], ['2026-11-24', 'fresh']]) {
    const result = batches.productExpiry(batched([dated('one', 1, date)]), today);
    assert.equal(result.nearExpiry, expected === 'nearExpiry'); assert.equal(result.expired, expected === 'expired');
  }
  const product = batched([dated('expired', 3, '2026-10-23'), dated('near', 1, today), dated('zero', 0, today), undated('none', 4)]);
  assert.equal(batches.productStock(product), 8, 'preserve expired-stock availability and valuation');
  assert.equal(batches.productExpiry(product, today).expired, true);
  assert.equal(batches.productExpiry(product, today).nearExpiry, true);
  assert.equal(batches.productExpiry(batched([dated('empty', 0, today), undated('none', 5)]), today).nearExpiry, false);
  assert.equal(batches.productExpiry(batched([dated('empty', 0, '2026-10-23')]), today).expired, false);
});
test('Manila date-only comparisons handle UTC midnight, month/year and leap boundaries', () => {
  assert.equal(batches.todayInManila(new Date('2026-10-23T16:00:00Z')), today);
  assert.equal(batches.todayInManila(new Date('2026-10-23T15:59:59Z')), '2026-10-23');
  assert.equal(batches.expiryStatus('2027-01-15', '2026-12-16'), 'nearExpiry');
  assert.equal(batches.expiryStatus('2028-03-01', '2028-01-31'), 'nearExpiry');
  assert.equal(batches.expiryStatus(null, today), 'fresh');
});
test('expiry sorting ignores depleted/undated batches and puts undated products last', () => {
  const products = [batched([undated('a', 3)], { id: 'none', name: 'A' }), batched([dated('zero', 0, '2025-01-01'), dated('b', 2, '2027-01-01')], { id: 'later' }), batched([dated('c', 1, today)], { id: 'soon' })];
  assert.deepEqual(Array.from(inv.filterInventory(products, '', { ...inv.defaultFilters, sort: 'expiry' }, today, []), p => p.id), ['soon', 'later', 'none']);
});
test('combined category, search and optional stock filters precede recorded-sales sorting', () => {
  const products = [batched([undated('a', 5)], { id: 'a', name: 'Rice A', category: 'groceries' }), batched([undated('b', 1)], { id: 'b', name: 'Rice B', category: 'groceries' }), batched([undated('c', 6)], { id: 'c', name: 'Rice C', category: 'groceries' })];
  const filters = { ...inv.defaultFilters, category: 'groceries', status: 'low', sort: 'fast' };
  const sold = [{ productId: 'a', quantity: 2 }, { productId: 'b', quantity: 10 }];
  assert.deepEqual(Array.from(inv.filterInventory(products, ' RICE ', filters, today, sold), p => p.id), ['b', 'a']);
  assert.equal(inv.filterInventory(products, 'nothing', filters, today, sold).length, 0);
  assert.equal(inv.filterInventory(products, '', { ...filters, status: 'all' }, today, sold).length, 3);
  assert.equal(inv.inventorySummary(products, today).total, 3);
});
test('add review and edit details retain draft values and do not write until final save', () => {
  const state = { products: [], assets: [], restocks: [] };
  const before = JSON.stringify(state);
  let draft = drafts.createInventoryDraft('first');
  draft = { ...draft, details: { ...valid }, batches: [{ id: 'first', quantity: '2', expirationDate: today, noExpiry: false }, { id: 'second', quantity: '4', expirationDate: '', noExpiry: true }] };
  assert.equal(drafts.draftQuantity(draft.batches), 6);
  assert.equal(Object.keys(drafts.detailsErrors(draft.details, today)).length, 0);
  const review = drafts.buildDraftProduct('created', draft);
  assert.equal(review.stock, 6); assert.equal(JSON.stringify(state), before);
  draft = { ...draft, details: { ...draft.details, name: 'Reviewed product' } };
  const saved = inv.inventoryReducer(state, { type: 'saveProduct', product: drafts.buildDraftProduct('created', draft) });
  assert.equal(saved.products[0].name, 'Reviewed product'); assert.equal(saved.products[0].batches[1].expirationDate, null);
  assert.equal(inv.inventoryReducer(saved, { type: 'saveProduct', product: drafts.buildDraftProduct('created', draft) }).products.length, 1);
  const cleared = drafts.clearInventoryStep(draft, 'stock', 'new');
  assert.equal(cleared.details, draft.details); assert.equal(cleared.batches.length, 1); assert.equal(cleared.batches[0].quantity, '');
});
test('new batch validation requires positive whole quantities and explicit valid dates or no expiry', () => {
  const batch = { id: 'a', quantity: '1', expirationDate: today, noExpiry: false };
  for (const quantity of ['0', '-1', '1.5', '', '1000001']) assert.ok(drafts.batchErrors({ ...batch, quantity }).quantity);
  assert.equal(drafts.batchErrors({ ...batch, quantity: '0' }, true).quantity, undefined);
  assert.ok(drafts.batchErrors({ ...batch, expirationDate: '2027-02-29' }).expirationDate);
  const noExpiry = drafts.setBatchNoExpiry(batch, true);
  assert.equal(noExpiry.expirationDate, ''); assert.equal(Object.keys(drafts.batchErrors(noExpiry)).length, 0);
  assert.equal(drafts.toStockBatches([noExpiry])[0].expirationDate, null);
  assert.ok(drafts.batchErrors(drafts.setBatchNoExpiry(noExpiry, false)).expirationDate);
});
test('batch edit/delete draft can be cancelled without mutation; final save recalculates all stock', () => {
  const product = batched([dated('a', 8, today), undated('b', 7)]);
  const state = { products: [product], assets: [], restocks: [] };
  const before = JSON.stringify(state);
  let draft = drafts.createInventoryDraft('unused', product);
  draft = { ...draft, batches: draft.batches.filter(b => b.id !== 'a').map(b => ({ ...b, quantity: '1' })) };
  assert.equal(JSON.stringify(state), before, 'Update Batch and deletion are local; Cancel discards them');
  const next = inv.inventoryReducer(state, { type: 'saveProduct', product: drafts.buildDraftProduct(product.id, draft) });
  assert.equal(next.products[0].stock, 1); assert.equal(batches.stockCategory(next.products[0].stock), 'low');
  assert.equal(batches.productExpiry(next.products[0], today).nearExpiry, false);
  assert.equal(JSON.stringify(state), before);
});
test('restock confirmation appends multiple dated/undated batches atomically and rejects replay', () => {
  const product = batched([dated('a', 8, today), dated('b', 7, '2028-01-01')]);
  const state = { products: [product], assets: [], restocks: [] };
  const incoming = [dated('new-a', 2, '2027-01-01'), undated('new-b', 3)];
  const record = { id: 'many', productId: product.id, itemName: product.name, quantity: 5, stockDate: today, expirationDate: '', batches: incoming, recordedAt: '2026-10-24T00:00:00Z' };
  const before = JSON.stringify(state);
  assert.equal(state.products[0].stock, 15, 'opening/cancelling confirmation leaves existing stock');
  const next = inv.inventoryReducer(state, { type: 'restock', record });
  assert.equal(next.products[0].stock, 20); assert.equal(next.products[0].batches.length, 4);
  assert.equal(JSON.stringify(next.products[0].batches.slice(0, 2)), JSON.stringify(product.batches));
  assert.equal(inv.inventoryReducer(next, { type: 'restock', record }), next);
  assert.equal(inv.inventoryReducer(state, { type: 'restock', record: { ...record, quantity: 6 } }), state);
  assert.equal(inv.inventoryReducer(state, { type: 'restock', record: { ...record, batches: [undated('bad', 0)] } }), state);
  assert.equal(JSON.stringify(state), before);
});
test('batch-aware depletion keeps POS quantity and expiry summaries aligned, preserving legacy behavior', () => {
  const product = batched([dated('a', 2, today), undated('b', 3)]);
  const next = batches.deductProductStock(product, 2);
  assert.equal(next.stock, 3); assert.equal(batches.productStock(next), 3);
  assert.equal(next.batches[0].quantity, 0); assert.equal(batches.productExpiry(next, today).nearExpiry, false);
  assert.equal(product.batches[0].quantity, 2);
});
test('confirmed POS and product-credit sales deplete remaining batches once and retain snapshots after deletion', () => {
  const { emptyPaymentDraft } = load('src/utils/pos-payment.ts');
  const { emptyQuickAddDraft } = load('src/utils/quick-add.ts');
  const product = batched([dated('a', 2, today), undated('b', 3)]);
  const state = { products: [product], assets: [], restocks: [] };
  const selection = { [product.id]: { productId: product.id, itemName: product.name, unitPriceCentavos: product.unitPriceCentavos, quantity: 2 } };
  const command = { id: 'batch-sale', ownerId: 'owner', occurredAt: '2026-10-24T00:00:00Z', selection, draft: { ...emptyPaymentDraft(), cashAmount: '100' } };
  const sale = inv.inventoryReducer(state, { type: 'completeSale', command });
  assert.equal(sale.products[0].stock, 3); assert.equal(batches.productStock(sale.products[0]), 3);
  assert.equal(batches.productExpiry(sale.products[0], today).nearExpiry, false);
  assert.equal(inv.inventoryReducer(sale, { type: 'completeSale', command }), sale);
  const creditCommand = { id: 'batch-credit', ownerId: 'owner', occurredAt: '2026-10-24T00:00:00Z', draft: { ...emptyQuickAddDraft('customerDebt', today), name: 'Demo Customer', borrowing: 'product', items: selection } };
  const credit = inv.inventoryReducer(state, { type: 'saveCustomerDebt', command: creditCommand });
  assert.equal(credit.products[0].stock, 3); assert.equal(batches.productStock(credit.products[0]), 3);
  assert.equal(inv.inventoryReducer(credit, { type: 'saveCustomerDebt', command: creditCommand }), credit);
  const deleted = inv.inventoryReducer(sale, { type: 'deleteProduct', id: product.id });
  assert.equal(deleted.pos.sales[0].items[product.id].itemName, product.name);
  assert.equal(deleted.pos.sales[0].items[product.id].unitPriceCentavos, product.unitPriceCentavos);
});
