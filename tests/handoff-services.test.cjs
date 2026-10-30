const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  file = path.normalize(file);
  if (cache.has(file)) return cache.get(file);
  const context = { exports: {}, Intl, require(name) {
    const base = name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(file), name);
    const target = [`${base}.ts`, `${base}/index.ts`].find(candidate => fs.existsSync(candidate));
    if (!target) throw new Error(`Unexpected module: ${name}`);
    return load(target);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  cache.set(file, context.exports);
  return context.exports;
}
const { loadMockInventory, applyInventoryAction, getInventorySales } = load('src/services/inventory.ts');
const { createCashRegisterService } = load('src/services/cash-register.ts');
const { getDashboardData } = load('src/services/dashboard.ts');
const { summarizeDashboard } = load('src/utils/dashboard.ts');
const { emptyPaymentDraft } = load('src/utils/pos-payment.ts');
const { selectProduct } = load('src/utils/pos.ts');
const owner = { id: 'handoff-owner', name: 'Fictional Owner', mode: 'mock' };

test('service rejects unauthorized and invalid checkout, then commits once across stock, debt and dashboard', () => {
  const store = loadMockInventory();
  const before = JSON.stringify(store);
  const product = store.products.find(item => item.id === 'demo-argentina-corned-beef');
  const command = { id: 'handoff-sale', ownerId: owner.id, occurredAt: '2026-10-30T04:00:00.000Z',
    selection: selectProduct({}, product), draft: { ...emptyPaymentDraft(), method: 'partial',
      partialMethod: 'cash', partialAmount: '12', customerName: 'Fictional Customer' } };
  const action = { type: 'completeSale', command };
  assert.equal(applyInventoryAction(store, null, action), store);
  assert.equal(applyInventoryAction(store, { ...owner, id: 'other-owner' }, action), store);
  assert.equal(applyInventoryAction(store, owner, { ...action, command: { ...command, draft: { ...command.draft, partialAmount: '0' } } }), store);
  assert.equal(JSON.stringify(store), before);
  const saved = applyInventoryAction(store, owner, action);
  assert.equal(saved.products.find(item => item.id === product.id).stock, product.stock - 1);
  assert.equal(saved.pos.sales.length, 1);
  assert.equal(saved.pos.debts[0].amountCentavos, 2000);
  assert.equal(saved.pos.debts[0].customerId, saved.pos.sales[0].customerId);
  assert.equal(applyInventoryAction(saved, owner, action), saved);
  assert.equal(summarizeDashboard('daily', getDashboardData(saved.pos.sales)).totalSalesCentavos, 3200);
  assert.equal(getInventorySales(saved.pos.sales).filter(line => line.saleId === command.id).length, 1);
  assert.equal(JSON.stringify(loadMockInventory()), before, 'a new session still receives unchanged seeds');
});

test('inventory service preserves edit/restock/delete semantics and session isolation', () => {
  const store = loadMockInventory(), product = store.products[0];
  const edit = { type: 'saveProduct', product: { ...product, name: 'Edited demo product' } };
  assert.equal(applyInventoryAction(store, null, edit), store);
  const edited = applyInventoryAction(store, owner, edit);
  const action = { type: 'restock', record: { id: 'handoff-restock', productId: product.id,
    itemName: edit.product.name, quantity: 2, stockDate: '2026-10-30', expirationDate: '2027-01-01', recordedAt: '2026-10-30T04:00:00.000Z' } };
  const restocked = applyInventoryAction(edited, owner, action);
  assert.equal(restocked.products[0].stock, product.stock + 2);
  assert.equal(applyInventoryAction(restocked, owner, action), restocked);
  const removed = applyInventoryAction(restocked, owner, { type: 'deleteProduct', id: product.id });
  assert.equal(removed.products.some(item => item.id === product.id), false);
  assert.equal(removed.restocks.length, 1);
  assert.equal(loadMockInventory().products[0].name, product.name);
});

test('cash service denies signed-out saves without consuming retry and keeps per-session totals', () => {
  const service = createCashRegisterService(), token = service.begin();
  assert.equal(service.add(null, token, '10.25'), null);
  assert.equal(service.add(owner, token, 'invalid'), null);
  assert.equal(service.add(owner, token, '10.25'), 1025);
  assert.equal(service.add(owner, token, '10.25'), null);
  assert.equal(service.add(owner, service.begin(), '1'), 1125);
  const fresh = createCashRegisterService();
  assert.equal(fresh.add(owner, fresh.begin(), '1'), 100);
});
