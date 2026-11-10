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
  cache.set(file, context.exports); return context.exports;
}
const { projectTransactions, filterTransactions, emptyTransactionFilters, transactionFilterError, transactionDateKey, transactionAmount, transactionMetadata } = load('src/utils/transactions.ts');
const { readTransactions } = load('src/services/transactions.ts');
const { loadMockInventory, applyInventoryAction } = load('src/services/inventory.ts');
const { createReceivablesService } = load('src/services/receivables.ts');
const { createQuickAddService } = load('src/services/quick-add.ts');
const { emptyQuickAddDraft } = load('src/utils/quick-add.ts');
const { emptyPaymentDraft } = load('src/utils/pos-payment.ts');
const { demoOwner } = load('src/data/mock-auth.ts');
const { dashboardDemo } = load('src/data/dashboard.ts');
const owner = { ...demoOwner, mode: 'mock' };
const input = patch => ({ sales: [], records: [], customers: [], payments: [], ...patch });
const record = patch => ({ id: 'a', sourceId: 'a', ownerId: owner.id, transactionNumber: 'TX-1042', type: 'sale', occurredAt: '2026-11-09T02:00:00Z', description: 'Rice and coffee', partyName: 'Aling Nena', amountCentavos: 21500, direction: 'in', paymentMethod: 'cash', ...patch });

test('source reads reuse Dashboard history, scope owners, and do not duplicate events', async () => {
  const store = loadMockInventory();
  const sources = input({ records: store.pos.debts, payments: store.receivablePayments });
  const rows = await readTransactions(owner.id, sources);
  for (const activity of dashboardDemo.activity) assert.equal(rows.filter(row => row.sourceId === activity.id).length, 1);
  assert.equal(rows.filter(row => row.type === 'customerPayment').length, store.receivablePayments.length + 1);
  assert.equal((await readTransactions('another-owner', sources)).length, 0);
  assert.equal(projectTransactions(owner.id, input({ records: [...store.pos.debts, ...store.pos.debts], payments: [...store.receivablePayments, ...store.receivablePayments] })).length, store.receivablePayments.length);
});

test('real POS partial sale and later repayment remain distinct, net of change and linked once', () => {
  let store = loadMockInventory();
  const dispatch = action => { const next = applyInventoryAction(store, owner, action); const changed = next !== store; store = next; return changed; };
  const product = store.products.find(row => row.stock > 0 && row.unitPriceCentavos > 100);
  const selection = { [product.id]: { productId: product.id, itemName: product.name, quantity: 1, unitPriceCentavos: product.unitPriceCentavos } };
  const draft = { ...emptyPaymentDraft(), method: 'partial', partialAmount: '1', partialMethod: 'gcash', partialReference: 'TEST-REFERENCE', customerName: 'Long Fictional Customer Name' };
  assert.ok(dispatch({ type: 'completeSale', command: { id: 'partial-sale', ownerId: owner.id, occurredAt: '2026-11-09T02:00:00Z', selection, draft } }));
  const debt = store.pos.debts.find(row => row.saleId === 'partial-sale');
  const ar = createReceivablesService(() => store, dispatch);
  ar.confirmPayment(owner, 'later-payment', debt.id, '1');
  const sources = () => input({ sales: store.pos.sales, records: store.pos.debts, customers: store.pos.customers, payments: store.receivablePayments });
  const rows = projectTransactions(owner.id, sources());
  const sale = rows.find(row => row.sourceId === 'partial-sale');
  assert.equal(sale.amountCentavos, 100); assert.equal(sale.saleTotalCentavos, product.unitPriceCentavos);
  assert.equal(sale.outstandingCentavos, product.unitPriceCentavos - 100); assert.equal(sale.paymentMethod, 'gcash');
  assert.equal(sale.partyName, 'Long Fictional Customer Name');
  const payment = rows.find(row => row.sourceId === 'later-payment');
  assert.equal(payment.debtId, debt.id); assert.equal(payment.saleId, sale.sourceId);
  assert.equal(payment.amountCentavos, 100); assert.equal(payment.paymentMethod, null);
  assert.equal(rows.filter(row => row.debtId === debt.id).length, 2);
  const cashDraft = { ...emptyPaymentDraft(), method: 'cash', cashAmount: String(product.unitPriceCentavos / 100 + 10) };
  assert.ok(dispatch({ type: 'completeSale', command: { id: 'cash-sale', ownerId: owner.id, occurredAt: '2026-11-09T02:00:00Z', selection, draft: cashDraft } }));
  assert.equal(projectTransactions(owner.id, sources()).find(row => row.sourceId === 'cash-sale').amountCentavos, product.unitPriceCentavos);
});

test('unpaid debt creation is not a receipt; zero-received POS sale is neutral; split uses actual tenders', () => {
  const store = loadMockInventory();
  assert.equal(projectTransactions(owner.id, input({ records: store.pos.debts })).length, 0);
  const sale = { id: 'unpaid', ownerId: owner.id, occurredAt: '2026-11-09T02:00:00Z', totalCentavos: 10000, remainingCentavos: 10000, items: {}, customerId: null, paymentStatus: 'unpaid', payment: { appliedCentavos: 0, tenders: [] } };
  const neutral = projectTransactions(owner.id, input({ sales: [sale] }))[0];
  assert.equal(neutral.direction, 'neutral'); assert.equal(transactionAmount(neutral), '₱0.00');
  const split = projectTransactions(owner.id, input({ sales: [{ ...sale, id: 'split', payment: { appliedCentavos: 10000, tenders: [{ method: 'cash', receivedCentavos: 5000 }, { method: 'gcash', receivedCentavos: 5000 }] } }] }))[0];
  assert.equal(split.paymentMethod, 'split'); assert.equal(split.amountCentavos, 10000);
});

test('new shared expenses appear once and retain unknown payment method', async () => {
  const service = createQuickAddService();
  const draft = { ...emptyQuickAddDraft('expense', '2026-11-09'), expenseDate: '2026-11-09', amount: '1500', category: 'Electricity Expense', details: 'Meralco' };
  const expense = await service.save(owner, 'history-expense', draft);
  const rows = projectTransactions(owner.id, input({ records: [expense, expense] }));
  assert.equal(rows.length, 1); assert.equal(rows[0].direction, 'out');
  assert.equal(rows[0].paymentMethod, null); assert.equal(transactionAmount(rows[0]), '−₱1,500.00');
  assert.equal(filterTransactions(rows, 'mErAlCo', 'expense', emptyTransactionFilters()).length, 1);
  assert.equal(filterTransactions(rows, '', 'all', { ...emptyTransactionFilters(), paymentMethod: 'cash' }).length, 0);
});

test('search, each category, date boundaries and tender filters intersect without mutating sources', () => {
  const rows = [record({ id: 'z' }), record({ id: 'b', type: 'expense', paymentMethod: 'gcash' }), record({ id: 'a', type: 'customerPayment' }), record({ id: 'next', occurredAt: '2026-11-09T16:00:00Z' })];
  const before = JSON.stringify(rows); const any = emptyTransactionFilters();
  assert.equal(filterTransactions(rows, 'tx-1042', 'all', any).length, 4);
  assert.equal(filterTransactions(rows, 'ALING NENA', 'all', any).length, 4);
  assert.equal(filterTransactions(rows, 'COFFEE', 'all', any).length, 4);
  assert.equal(filterTransactions(rows, 'coffee', 'sale', { from: '2026-11-09', to: '2026-11-09', paymentMethod: 'cash' }).length, 1);
  for (const type of ['sale', 'expense', 'customerPayment']) assert.ok(filterTransactions(rows, '', type, any).every(row => row.type === type));
  assert.equal(filterTransactions(rows, 'nonexistent', 'all', any).length, 0);
  assert.equal(filterTransactions([], '', 'all', any).length, 0);
  assert.equal(filterTransactions(rows, '', 'all', any).map(row => row.id).join(','), 'next,a,b,z');
  assert.equal(JSON.stringify(rows), before);
  assert.equal(transactionDateKey('2026-11-08T16:00:00Z'), '2026-11-09');
  assert.equal(transactionDateKey('2026-11-09T15:59:59Z'), '2026-11-09');
});

test('filters validate real dates and open ranges; amounts stay exact and metadata uses Manila', () => {
  assert.equal(transactionFilterError(emptyTransactionFilters()), null);
  assert.match(transactionFilterError({ from: '2026-11-10', to: '2026-11-09', paymentMethod: 'all' }), /End date/);
  assert.match(transactionFilterError({ from: '2026-02-30', to: '', paymentMethod: 'all' }), /valid date/);
  assert.equal(transactionFilterError({ from: '2024-02-29', to: '', paymentMethod: 'all' }), null);
  assert.equal(transactionAmount(record({ amountCentavos: 123456789012 })), '+₱1,234,567,890.12');
  assert.equal(transactionAmount(record({ amountCentavos: 1 })), '+₱0.01');
  assert.match(transactionMetadata(record({ occurredAt: '2026-11-08T16:15:00Z' })), /Nov 09, 12:15 AM • Cash/);
});
