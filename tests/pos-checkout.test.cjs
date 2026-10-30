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
  const context = { exports: {}, Intl, require: name => load(`${name === '@/i18n' ? 'src/i18n/index' : name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(file), name)}.ts`) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  cache.set(file, context.exports);
  return context.exports;
}
const { inventoryReducer } = load('src/utils/inventory.ts');
const { inventoryProducts } = load('src/data/inventory.ts');
const { emptyPaymentDraft } = load('src/utils/pos-payment.ts');
const { emptyPosLedger } = load('src/utils/pos-checkout.ts');
const { selectProduct } = load('src/utils/pos.ts');
const { dashboardWithSales } = load('src/utils/pos-records.ts');
const { dashboardDemo } = load('src/data/dashboard.ts');
const { summarizeDashboard } = load('src/utils/dashboard.ts');
const fresh = () => ({ products: inventoryProducts.map(p => ({ ...p })), assets: [], restocks: [], pos: emptyPosLedger() });
const product = inventoryProducts.find(p => p.id === 'demo-argentina-corned-beef');
const order = () => selectProduct({}, product);
const command = (patch = {}) => ({ id: 'sale-1', ownerId: 'owner-1', occurredAt: '2026-10-30T04:00:00.000Z', selection: order(), draft: { ...emptyPaymentDraft(), cashAmount: '50' }, ...patch });
const save = (state, cmd) => inventoryReducer(state, { type: 'completeSale', command: cmd });

test('one commit saves immutable sale/payment snapshots and deducts inventory once', () => {
  const state = fresh(), cmd = command();
  const before = JSON.stringify(state);
  const next = save(state, cmd);
  assert.equal(JSON.stringify(state), before);
  assert.equal(next.products.find(p => p.id === product.id).stock, product.stock - 1);
  assert.equal(next.pos.sales.length, 1);
  const sale = next.pos.sales[0];
  assert.equal(sale.totalCentavos, 3200);
  assert.equal(sale.payment.cashChangeCentavos, 1800);
  assert.equal(sale.payment.appliedCentavos, 3200);
  assert.equal(sale.payment.recording, 'manual');
  assert.equal(next.pos.debts.length, 0);
  cmd.selection[product.id].itemName = 'Changed';
  assert.equal(sale.items[product.id].itemName, product.name);
  for (let n = 0; n < 100; n++) assert.equal(save(next, cmd), next);
  const another = save(next, command({ id: 'sale-2' }));
  assert.equal(another.pos.sales.length, 2, 'a later identical purchase is a new order');
});

test('stock conflicts, invalid orders and stale customers leave every store unchanged and permit retry', () => {
  const state = fresh();
  for (const selection of [{}, { [product.id]: { ...order()[product.id], quantity: product.stock + 1 } },
    { [product.id]: { ...order()[product.id], quantity: 0 } }, { [product.id]: { ...order()[product.id], quantity: 1.5 } },
    { missing: { ...order()[product.id], productId: 'missing' } }]) assert.equal(save(state, command({ selection })), state);
  assert.equal(save(state, command({ draft: { ...emptyPaymentDraft(), cashAmount: '1' } })), state);
  assert.equal(save(state, command({ draft: { ...emptyPaymentDraft(), method: 'partial', partialAmount: '1', customerId: 'deleted', customerName: 'Demo' } })), state);
  const reduced = { ...state, products: state.products.map(p => p.id === product.id ? { ...p, stock: 0 } : p) };
  assert.equal(save(reduced, command()), reduced);
  assert.ok(save(state, command()) !== state);
});

test('Partial Payment links an existing customer, sale, tender and remaining debt', () => {
  const state = fresh(), customer = state.pos.customers[0];
  const next = save(state, command({ draft: { ...emptyPaymentDraft(), method: 'partial', partialMethod: 'gcash', partialAmount: '12', partialReference: '0000123', customerId: customer.id, customerName: customer.name } }));
  assert.equal(next.pos.customers.length, state.pos.customers.length);
  const sale = next.pos.sales[0], debt = next.pos.debts[0];
  assert.equal(sale.customerId, customer.id);
  assert.equal(sale.remainingCentavos, 2000);
  assert.equal(sale.payment.tenders[0].method, 'gcash');
  assert.equal(sale.payment.tenders[0].reference, '0000123');
  assert.equal(debt.saleId, sale.id);
  assert.equal(debt.customerId, customer.id);
  assert.equal(debt.amountCentavos, 2000);
  assert.equal(debt.originalAmountCentavos, 3200);
  assert.equal(debt.paymentStatus, 'partial');
  assert.equal(debt.dueDate, null, 'no invented deadline');
  assert.equal(debt.items[product.id].unitPriceCentavos, 3200);
});

test('new customers are created only on success, normalized names reuse records and zero/full payments are rejected', () => {
  const state = fresh();
  const draft = { ...emptyPaymentDraft(), method: 'partial', partialMethod: 'cash', partialAmount: 'bad', customerName: 'New Demo Customer' };
  assert.equal(save(state, command({ draft })), state);
  assert.equal(save(state, command({ draft: { ...draft, partialAmount: '0' } })), state);
  const next = save(state, command({ draft: { ...draft, partialAmount: '12' } }));
  assert.equal(next.pos.customers.length, state.pos.customers.length + 1);
  assert.equal(next.pos.debts[0].amountCentavos, 2000);
  assert.equal(next.pos.debts[0].paymentStatus, 'partial');
  const second = save(next, command({ id: 'sale-2', draft: { ...draft, partialAmount: '1', customerName: '  new   DEMO customer ' } }));
  assert.equal(second.pos.customers.length, next.pos.customers.length);
  assert.equal(second.pos.sales[0].customerId, next.pos.sales[0].customerId);
  assert.equal(save(state, command({ draft: { ...draft, partialAmount: '32' } })), state);
});

test('GCash and Split preserve references, never create implicit debt, and do not count GCash as physical cash', () => {
  const state = fresh();
  const gcash = { ...emptyPaymentDraft(), method: 'gcash', gcashAmount: '32', gcashReference: '000123' };
  const next = save(state, command({ draft: gcash }));
  assert.equal(next.pos.sales[0].payment.tenders[0].reference, '000123');
  assert.equal(next.pos.sales[0].payment.cashChangeCentavos, 0);
  const split = { ...emptyPaymentDraft(), method: 'split', splitCashAmount: '20', splitGcashAmount: '12', splitReference: '0009' };
  assert.equal(save(state, command({ draft: { ...split, splitCashAmount: '19.99' } })), state);
  const combined = save(next, command({ id: 'sale-2', draft: split }));
  assert.equal(combined.pos.debts.length, 0);
  const data = dashboardWithSales(dashboardDemo, combined.pos.sales);
  assert.equal(summarizeDashboard('daily', data).totalSalesCentavos, 6400);
  assert.equal(data.movements.slice(dashboardDemo.movements.length).reduce((sum, m) => sum + m.amountCentavos, 0), 2000);
  assert.equal(data.activity.filter(a => a.id === 'sale-2').length, 1);
});

test('multi-product orders count as one sale and dashboard periods respect midnight in Manila', () => {
  const state = fresh();
  const milk = state.products.find(p => p.id === 'demo-bear-brand-powder');
  const selection = selectProduct(order(), milk);
  const next = save(state, command({ selection, occurredAt: '2026-10-31T16:30:00.000Z' })); // November 1, 00:30 Manila
  const data = dashboardWithSales(dashboardDemo, next.pos.sales);
  data.sales.push({ id: 'prior-day', productId: 'prior', itemName: 'Prior day', quantity: 1, unitPriceCentavos: 10000, occurredAt: '2026-10-31T15:59:59.000Z' });
  assert.equal(summarizeDashboard('daily', data).totalSalesCentavos, 4500);
  assert.equal(summarizeDashboard('daily', data).saleCount, 1);
  assert.equal(summarizeDashboard('monthly', data).totalSalesCentavos, 4500);
  const monday = { ...data, asOf: '2026-11-01T16:30:00.000Z' }; // November 2, Monday
  assert.equal(summarizeDashboard('weekly', monday).saleCount, 0);
});
