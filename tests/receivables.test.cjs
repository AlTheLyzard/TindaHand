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
    if (!target) throw Error(`Unexpected import ${name}`);
    return load(target);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  cache.set(file, context.exports);
  return context.exports;
}
const { applyInventoryAction, loadMockInventory } = load('src/services/inventory.ts');
const { createReceivablesService } = load('src/services/receivables.ts');
const { emptyQuickAddDraft } = load('src/utils/quick-add.ts');
const { emptyPaymentDraft } = load('src/utils/pos-payment.ts');
const { selectProduct } = load('src/utils/pos.ts');
const { customerDebtErrors, receivableBalance, receivableLists, receivablePaymentError, localCalendarDate } = load('src/utils/receivables.ts');
const { payableDueLabel } = load('src/utils/payables.ts');
const owner = { id: 'ar-test-owner', name: 'Fictional Owner', mode: 'mock' };
const draft = (patch = {}) => ({ ...emptyQuickAddDraft('customerDebt', '2026-11-02'), name: 'Customer A', amount: '1200', ...patch });
function setup() {
  let store = loadMockInventory();
  const service = createReceivablesService(() => store, action => {
    const next = applyInventoryAction(store, owner, action);
    const changed = next !== store; store = next; return changed;
  });
  const debts = () => store.pos.debts.filter(debt => debt.ownerId === owner.id);
  const payments = () => (store.receivablePayments ?? []).filter(payment => payment.ownerId === owner.id);
  return { service, get: () => store, set: value => { store = value; }, debts, payments };
}

test('cash and selected-customer borrowings stay independent, while typed same names create distinct people', () => {
  const s = setup();
  const first = s.service.saveDebt(owner, 'cash-a', draft());
  const second = s.service.saveDebt(owner, 'cash-b', draft({ customerId: first.customerId }));
  let totals = receivableLists(s.debts(), s.payments(), '', '2026-11-02');
  assert.equal(totals.transactionCount, 2); assert.equal(totals.customerCount, 1);
  assert.equal(second.customerId, first.customerId);
  const typed = s.service.saveDebt(owner, 'cash-c', draft());
  assert.notEqual(typed.customerId, first.customerId);
  assert.equal(receivableLists(s.debts(), s.payments(), '', '2026-11-02').customerCount, 2);
  assert.throws(() => s.service.saveDebt(owner, 'stale-customer', draft({ customerId: 'missing' })));
  assert.equal(s.debts().length, 3);
});

test('product drafts leave stock unchanged, save snapshots and deduct exactly once, including rapid replay', () => {
  const s = setup(); const initial = JSON.stringify(s.get());
  const product = s.get().products.find(product => product.stock > 2);
  const items = selectProduct(selectProduct({}, product), product);
  const d = draft({ borrowing: 'product', amount: '', items });
  assert.equal(JSON.stringify(s.get()), initial);
  const first = s.service.saveDebt(owner, 'product-a', d);
  for (let i = 0; i < 20; i++) assert.equal(s.service.saveDebt(owner, 'product-a', d), first);
  assert.equal(s.debts().length, 1);
  assert.equal(s.get().products.find(p => p.id === product.id).stock, product.stock - 2);
  assert.equal(first.originalAmountCentavos, product.unitPriceCentavos * 2);
  s.set({ ...s.get(), products: s.get().products.map(p => p.id === product.id ? { ...p, unitPriceCentavos: 1 } : p) });
  assert.equal(first.items[product.id].unitPriceCentavos, product.unitPriceCentavos);
  assert.equal(first.originalAmountCentavos, product.unitPriceCentavos * 2);
});

test('stale stock, unavailable items, invalid quantities and bad fields reject atomically and allow retry', () => {
  const s = setup(); const product = s.get().products.find(product => product.stock > 0);
  const baseline = JSON.stringify(s.get()); const items = selectProduct({}, product);
  const invalidDrafts = [draft({ name: '' }), draft({ amount: '0' }), draft({ amount: '-1' }), draft({ amount: '1.001' }), draft({ dueDate: '' }), draft({ dueDate: '2026-02-30' }),
    ...[0, -1, 1.5, product.stock + 1].map(quantity => draft({ borrowing: 'product', items: { [product.id]: { ...items[product.id], quantity } } })),
    draft({ borrowing: 'product', items: {} }), draft({ borrowing: 'product', items: { missing: { ...items[product.id], productId: 'missing' } } })];
  for (const d of invalidDrafts) {
    assert.ok(Object.keys(customerDebtErrors(d, s.get().products)).length);
    assert.throws(() => s.service.saveDebt(owner, 'retry', d));
    assert.equal(JSON.stringify(s.get()), baseline);
  }
  s.service.saveDebt(owner, 'retry', draft()); assert.equal(s.debts().length, 1);
});

test('payment preview and cancel never mutate; partial then full payments affect only one debt with history', () => {
  const s = setup(); const a = s.service.saveDebt(owner, 'debt-a', draft());
  s.service.saveDebt(owner, 'debt-b', draft({ customerId: a.customerId }));
  const baseline = JSON.stringify(s.get());
  for (const amount of ['', '0', '-10', '1200.01', '1.001', '1e3']) assert.ok(receivablePaymentError(amount, 120000));
  assert.equal(receivablePaymentError('500', 120000), undefined);
  assert.equal(JSON.stringify(s.get()), baseline);
  s.service.confirmPayment(owner, 'payment-a', a.id, '500');
  let row = receivableBalance(s.debts()[1], s.payments(), '2026-11-02');
  assert.equal(row.remainingCentavos, 70000); assert.equal(row.paidCentavos, 50000);
  assert.equal(row.progress.toFixed(2), '41.67'); assert.equal(row.status, 'partial');
  assert.equal(receivableBalance(s.debts()[0], s.payments()).remainingCentavos, 120000);
  s.service.confirmPayment(owner, 'payment-b', a.id, '700');
  const settled = JSON.stringify(s.get());
  for (let i = 0; i < 20; i++) s.service.confirmPayment(owner, 'payment-b', a.id, '700');
  assert.equal(JSON.stringify(s.get()), settled);
  row = receivableBalance(s.debts()[1], s.payments());
  assert.equal(row.status, 'paid'); assert.equal(row.progress, 100); assert.equal(row.history.length, 2);
  assert.throws(() => s.service.confirmPayment(owner, 'payment-c', a.id, '1'));
  const lists = receivableLists(s.debts(), s.payments(), '', '2026-11-02');
  assert.equal(lists.paid.length, 1); assert.equal(lists.paidCentavos, 120000);
  assert.equal(lists.outstandingCentavos, 120000); assert.equal(lists.transactionCount, 1); assert.equal(lists.customerCount, 1);
});

test('overdue precedes partial; today and absent due dates stay current; calendar days cross DST and leap dates', () => {
  const s = setup(); const a = s.service.saveDebt(owner, 'late', draft({ dueDate: '2026-11-01' }));
  s.service.confirmPayment(owner, 'partial', a.id, '500');
  const debt = s.debts()[0];
  assert.equal(receivableBalance(debt, s.payments(), '2026-11-02').status, 'overdue');
  assert.equal(receivableBalance({ ...debt, dueDate: '2026-11-02' }, s.payments(), '2026-11-02').status, 'partial');
  assert.equal(receivableBalance({ ...debt, dueDate: null }, s.payments(), '2026-11-02').status, 'partial');
  assert.match(payableDueLabel('2028-03-01', '2028-02-28'), /2 days left/);
  assert.match(payableDueLabel('2026-11-02', '2026-11-01'), /1 day left/);
  assert.match(payableDueLabel('2026-11-02', '2026-11-02'), /Due today/);
  assert.equal(localCalendarDate(new Date(2026, 10, 2, 0, 1)), '2026-11-02');
  s.service.confirmPayment(owner, 'finish', a.id, '700');
  assert.equal(receivableBalance(s.debts()[0], s.payments(), '2026-12-01').status, 'paid');
});

test('POS partial debts use the same ledger and retain original tender references without a second stock deduction', () => {
  const s = setup(); const product = s.get().products.find(product => product.stock > 0 && product.unitPriceCentavos > 100);
  const command = { id: 'pos-ar-sale', ownerId: owner.id, occurredAt: '2026-11-02T04:00:00Z', selection: selectProduct({}, product),
    draft: { ...emptyPaymentDraft(), method: 'partial', partialMethod: 'gcash', partialAmount: '1', partialReference: '00042', customerName: 'POS Customer' } };
  s.set(applyInventoryAction(s.get(), owner, { type: 'completeSale', command }));
  let debt = s.debts()[0]; let row = receivableBalance(debt, s.payments(), '2026-12-01');
  assert.equal(row.paidCentavos, 100); assert.equal(row.originalCentavos, product.unitPriceCentavos);
  assert.equal(row.history[0].reference, '00042'); assert.equal(debt.dueDate, null); assert.equal(row.status, 'partial');
  s.service.confirmPayment(owner, 'pos-final', debt.id, ((product.unitPriceCentavos - 100) / 100).toFixed(2));
  row = receivableBalance(s.debts()[0], s.payments()); assert.equal(row.progress, 100);
  assert.equal(row.history.length, 2);
  assert.equal(s.get().products.find(p => p.id === product.id).stock, product.stock - 1);
  assert.equal(s.get().pos.sales.length, 1);
  const cashStore = applyInventoryAction(s.get(), owner, { type: 'completeSale', command: { ...command, id: 'cash-with-hidden-reference', draft: { ...command.draft, partialMethod: 'cash', partialReference: 'old-hidden-reference' } } });
  assert.equal(cashStore.receivablePayments.find(payment => payment.debtId === 'debt-cash-with-hidden-reference').reference, undefined);
});

test('search leaves outstanding totals intact, counts unique IDs, and scopes paid summary to settled matches', () => {
  const s = setup(); const a = s.service.saveDebt(owner, 'a', draft());
  s.service.saveDebt(owner, 'b', draft({ name: 'Customer B', amount: '200' }));
  s.service.confirmPayment(owner, 'settle-a', a.id, '1200');
  const match = receivableLists(s.debts(), s.payments(), ' CUSTOMER A ', '2026-11-02');
  assert.equal(match.outstandingCentavos, 20000); assert.equal(match.transactionCount, 1); assert.equal(match.paidCentavos, 120000);
  const missing = receivableLists(s.debts(), s.payments(), 'missing', '2026-11-02');
  assert.equal(missing.paidCentavos, 0); assert.equal(missing.paid.length, 0); assert.equal(missing.pending.length, 0);
  const empty = receivableLists([], [], '', '2026-11-02');
  assert.equal(empty.transactionCount, 0); assert.equal(empty.customerCount, 0); assert.equal(empty.outstandingCentavos, 0);
});

test('unauthorized mutations and unknown/other-store debts never change state', () => {
  const s = setup(); const a = s.service.saveDebt(owner, 'a', draft()); const before = JSON.stringify(s.get());
  assert.throws(() => s.service.saveDebt(null, 'signed-out', draft()));
  assert.throws(() => s.service.confirmPayment(null, 'out', a.id, '1'));
  assert.throws(() => s.service.confirmPayment(owner, 'unknown', 'missing', '1'));
  assert.throws(() => s.service.confirmPayment({ ...owner, id: 'other' }, 'other', a.id, '1'));
  assert.equal(JSON.stringify(s.get()), before);
});
