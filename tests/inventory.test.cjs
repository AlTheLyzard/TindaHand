const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const context = { exports: {}, Intl, require: name => name === '@/i18n' ? load('src/i18n/index.ts') : load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts'))) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
const inv = load('src/utils/inventory.ts');
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
