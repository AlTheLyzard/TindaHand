const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const context = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
const { posProducts } = load('src/data/pos.ts');
const { filterProducts, selectProduct, selectionSummary, setSelectedQuantity, removeSelectedProduct, stockConflicts } = load('src/utils/pos.ts');

test('live inventory changes flag deleted or reduced stock while preserving cart snapshots', () => {
  const product = posProducts[0];
  const selection = setSelectedQuantity(selectProduct({}, product), product, 3);
  const before = JSON.stringify(selection);
  assert.equal(stockConflicts(selection, posProducts).length, 0);
  assert.equal(stockConflicts(selection, [{ ...product, stock: 2 }])[0], product.id);
  assert.equal(stockConflicts(selection, [])[0], product.id);
  assert.equal(stockConflicts(selection, [{ ...product, name: 'Edited name', unitPriceCentavos: 9999 }]).length, 0);
  assert.equal(JSON.stringify(selection), before);
});

test('name search is case insensitive, trims spaces and intersects category and letter', () => {
  assert.equal(filterProducts(posProducts, '  MILK ', 'drinks', 'B')[0].id, 'demo-bear-brand-powder');
  assert.equal(filterProducts(posProducts, 'milk', 'canned', null).length, 0);
  assert.equal(filterProducts(posProducts, 'milk', null, 'C').length, 0);
  assert.equal(filterProducts(posProducts, 'unknown', null, null).length, 0);
  assert.equal(filterProducts(posProducts, '', null, null).length, 6);
  assert.equal(filterProducts(posProducts, '', 'coldCuts', null).length, 0);
});
test('repeated selection caps at stock, blocks zero stock and leaves seeds unchanged', () => {
  const before = JSON.stringify(posProducts);
  let selection = {};
  const ariel = posProducts.find(p => p.id === 'demo-ariel-red');
  for (let tap = 0; tap < 100; tap++) selection = selectProduct(selection, ariel);
  assert.equal(selection[ariel.id].quantity, 3);
  assert.equal(selectionSummary(selection).quantity, 3);
  assert.equal(selectionSummary(selection).totalCentavos, 3600);
  assert.equal(selectProduct(selection, posProducts.find(p => p.stock === 0)), selection);
  assert.equal(JSON.stringify(posProducts), before);
});
test('totals derive from name and price snapshots across products and filter changes', () => {
  let selection = selectProduct({}, posProducts[0]);
  selection = selectProduct(selection, posProducts[1]);
  selection = selectProduct(selection, posProducts[1]);
  filterProducts(posProducts, 'cola', 'drinks', 'C');
  assert.equal(selectionSummary(selection).quantity, 3);
  assert.equal(selectionSummary(selection).totalCentavos, 5600);
  assert.equal(selection[posProducts[0].id].itemName, posProducts[0].name);
  assert.equal(selection[posProducts[0].id].unitPriceCentavos, 3200);
  const next = selectProduct(selection, { ...posProducts[0], unitPriceCentavos: 9999 });
  assert.equal(next[posProducts[0].id].unitPriceCentavos, 3200);
  assert.equal(selection[posProducts[0].id].quantity, 1);
});

test('cart quantities recalculate totals while preserving snapshots and enforcing stock', () => {
  const product = posProducts[0];
  const seed = selectProduct({}, product);
  const cart = setSelectedQuantity(seed, { ...product, unitPriceCentavos: 9999 }, 3);
  assert.equal(cart[product.id].quantity, 3);
  assert.equal(cart[product.id].unitPriceCentavos, 3200);
  assert.equal(selectionSummary(cart).totalCentavos, 9600);
  assert.equal(seed[product.id].quantity, 1);
  assert.equal(selectionSummary(setSelectedQuantity(cart, product, 2)).totalCentavos, 6400);
  for (const invalid of [0, -1, 1.5, NaN, Infinity, product.stock + 1]) {
    assert.equal(setSelectedQuantity(cart, product, invalid), cart);
  }
  assert.equal(setSelectedQuantity({}, product, 1)[product.id], undefined);
});

test('confirmed removal releases selection without mutating other lines or stock', () => {
  const before = JSON.stringify(posProducts);
  let cart = selectProduct(selectProduct({}, posProducts[0]), posProducts[1]);
  const original = cart;
  cart = removeSelectedProduct(cart, posProducts[0].id);
  assert.equal(Object.keys(cart).length, 1);
  assert.equal(Object.keys(original).length, 2);
  assert.equal(cart[posProducts[1].id], original[posProducts[1].id]);
  assert.equal(selectionSummary(cart).totalCentavos, 1200);
  assert.equal(removeSelectedProduct(cart, 'missing'), cart);
  cart = removeSelectedProduct(cart, posProducts[1].id);
  assert.equal(selectionSummary(cart).quantity, 0);
  assert.equal(selectionSummary(cart).totalCentavos, 0);
  assert.equal(JSON.stringify(posProducts), before);
});
