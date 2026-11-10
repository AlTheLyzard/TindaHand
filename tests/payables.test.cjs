const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const context = { exports: {}, Date, Map, require: name => load(`${name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(file), name)}.ts`) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  cache.set(file, context.exports);
  return context.exports;
}
const { createPayablesRepository } = load('src/services/payables.ts');
const { createQuickAddService } = load('src/services/quick-add.ts');
const { emptyQuickAddDraft, quickAddTotal, quickAddErrors } = load('src/utils/quick-add.ts');
const { payableBalance, payableLists, payableDueLabel, addPayableShortcut, payablePaymentError, payableAmountInput } = load('src/utils/payables.ts');
const owner = { id: 'ap-test-owner', name: 'Demo Owner', mode: 'mock' };
const empty = () => ({ creditors: [], debts: [], payments: [] });
const draft = (patch = {}) => ({ ...emptyQuickAddDraft('storeDebt', '2026-11-02'), name: 'Supplier A', amount: '4500', dueDate: '', ...patch });

test('new and selected creditors share identities while debts remain separate; seeds stay unchanged', () => {
  const seed = empty();
  const repo = createPayablesRepository(seed);
  const a = repo.saveDebt(owner, 'a', draft());
  const b = repo.saveDebt(owner, 'b', draft({ name: '  supplier   a  ', amount: '100' }));
  const c = repo.saveDebt(owner, 'c', draft({ name: 'Supplier A', creditorId: a.creditorId }));
  assert.equal(b.creditorId, a.creditorId);
  assert.equal(c.creditorId, a.creditorId);
  assert.equal(repo.read(owner).debts.length, 3);
  assert.equal(repo.read(owner).creditors.length, 1);
  assert.equal(payableLists(repo.read(owner), '').creditorCount, 1);
  assert.equal(a.dueDate, null);
  assert.equal(seed.debts.length, 0);
  assert.throws(() => repo.saveDebt(owner, 'bad', draft({ creditorId: 'missing' })));
});

test('validation corrects live, accepts optional/cleared due dates and never retains a previous total', () => {
  const repo = createPayablesRepository(empty());
  for (const amount of ['', '0', '-1', '1e3', '1.001', '900719925474099.99']) {
    assert.ok(quickAddErrors(draft({ amount })).amount);
    assert.throws(() => repo.saveDebt(owner, `invalid-${amount}`, draft({ amount })));
  }
  assert.equal(quickAddTotal(draft({ amount: '' })), 0);
  assert.equal(quickAddTotal(draft({ amount: '0' })), 0);
  assert.ok(quickAddErrors(draft({ name: ' ' })).name);
  assert.ok(quickAddErrors(draft({ dueDate: '2026-02-30' })).dueDate);
  assert.equal(Object.keys(quickAddErrors(draft({ dueDate: '' }))).length, 0);
  assert.equal(Object.keys(quickAddErrors(draft({ dueDate: '2028-02-29' }))).length, 0);
  const saved = repo.saveDebt(owner, 'valid', draft({ amount: '10.01', dueDate: '2026-12-01', details: ' Invoice 12 ' }));
  assert.equal(saved.originalAmountCentavos, 1001);
  assert.equal(saved.details, 'Invoice 12');
  assert.equal(saved.dueDate, '2026-12-01');
});

test('additive shortcuts repeat, respect cents, disable overflow and full payment stays exact', () => {
  let amount = '';
  amount = addPayableShortcut(amount, 50000, 450000);
  assert.equal(amount, '500.00');
  amount = addPayableShortcut(amount, 50000, 450000);
  assert.equal(amount, '1000.00');
  assert.equal(addPayableShortcut(amount, 200000, 450000), '3000.00');
  assert.equal(addPayableShortcut('4000.01', 50000, 450000), null);
  assert.equal(addPayableShortcut('1e3', 50000, 450000), null);
  assert.equal(addPayableShortcut('0.01', 50000, 450000), '500.01');
  assert.equal(payableAmountInput(450000), '4500.00');
  assert.equal(payableAmountInput(Number.MAX_SAFE_INTEGER), '90071992547409.91');
  for (const amount of ['', '0', '-1', '5000', '1.001']) assert.ok(payablePaymentError(amount, 450000));
  assert.equal(payablePaymentError('4500', 450000), undefined);
});

test('partial then final settlement uses cumulative history and only confirmed writes mutate state', () => {
  const repo = createPayablesRepository(empty());
  repo.saveDebt(owner, 'debt', draft());
  const before = repo.read(owner);
  const debt = before.debts[0];
  // Opening, typing, previewing or canceling only reads. No repository write.
  payablePaymentError('2500', payableBalance(debt, before.payments).remainingCentavos);
  assert.equal(repo.read(owner).payments.length, 0);
  assert.equal(payableBalance(debt, before.payments).status, 'pending');
  repo.confirmPayment(owner, 'partial', debt.id, '2500');
  const partial = payableBalance(debt, repo.read(owner).payments);
  assert.equal(partial.remainingCentavos, 200000);
  assert.equal(partial.paidCentavos, 250000);
  assert.equal(partial.progress.toFixed(2), '55.56');
  assert.equal(partial.status, 'partial');
  assert.equal(payableLists(repo.read(owner), '').partial.length, 1);
  assert.equal(payableLists(repo.read(owner), '').paidCentavos, 0);
  // Old snapshot remains unchanged and stale overpayments fail atomically.
  assert.equal(before.payments.length, 0);
  assert.throws(() => repo.confirmPayment(owner, 'stale', debt.id, '2500'));
  assert.equal(repo.read(owner).payments.length, 1);
  repo.confirmPayment(owner, 'final', debt.id, '2000');
  const paid = payableBalance(debt, repo.read(owner).payments);
  assert.equal(paid.remainingCentavos, 0);
  assert.equal(paid.progress, 100);
  assert.equal(paid.history.length, 2);
  assert.equal(paid.status, 'paid');
  assert.equal(payableLists(repo.read(owner), '').paidCentavos, 450000);
  assert.equal(payableLists(repo.read(owner), '').creditorCount, 0);
  assert.throws(() => repo.confirmPayment(owner, 'extra', debt.id, '0.01'));
});

test('Quick Add and AP share records and idempotency; signed-out and other-owner writes are denied', async () => {
  const service = createQuickAddService();
  const [a, b] = await Promise.all([service.save(owner, 'shared', draft()), service.save(owner, 'shared', draft())]);
  assert.equal(a.id, b.id);
  assert.equal(service.readPayables(owner).debts.length, 1);
  const p1 = service.confirmPayablePayment(owner, 'double-tap', a.id, '500');
  const p2 = service.confirmPayablePayment(owner, 'double-tap', a.id, '500');
  assert.equal(p1.id, p2.id);
  assert.equal(service.readPayables(owner).payments.length, 1);
  assert.throws(() => service.confirmPayablePayment(owner, 'double-tap', a.id, '1000'));
  assert.throws(() => service.confirmPayablePayment(null, 'deny', a.id, '500'));
  assert.throws(() => service.confirmPayablePayment({ ...owner, id: 'other' }, 'deny', a.id, '500'));
  await assert.rejects(service.save(null, 'deny', draft()));
  assert.equal(service.readPayables(null).debts.length, 0);
  const selected = await service.save(owner, 'via-ap', draft({ creditorId: a.creditorId }));
  assert.equal(selected.creditorId, a.creditorId);
});

test('search filters paid totals only; unpaid summary and unique creditor counts ignore search', () => {
  const repo = createPayablesRepository(empty());
  repo.saveDebt(owner, 'a', draft());
  repo.saveDebt(owner, 'b', draft({ amount: '100' }));
  repo.saveDebt(owner, 'c', draft({ name: 'Supplier B', amount: '200' }));
  repo.confirmPayment(owner, 'settle-b', 'b', '100');
  repo.confirmPayment(owner, 'part-c', 'c', '50');
  const filtered = payableLists(repo.read(owner), '  SUPPLIER a  ');
  assert.equal(filtered.pending.length, 1);
  assert.equal(filtered.partial.length, 0);
  assert.equal(filtered.paidCentavos, 10000);
  assert.equal(filtered.outstandingCentavos, 465000);
  assert.equal(filtered.creditorCount, 2);
  const none = payableLists(repo.read(owner), 'missing');
  assert.equal(none.paidCentavos, 0);
  assert.equal(none.pending.length, 0);
  assert.equal(none.outstandingCentavos, 465000);
  assert.equal(payableLists(empty(), '').creditorCount, 0);
});

test('due labels distinguish today, overdue, future and unset without device timezone shifts', () => {
  assert.match(payableDueLabel('2026-11-02', '2026-11-02'), /Due today/);
  assert.match(payableDueLabel('2026-11-01', '2026-11-02'), /1 day overdue/);
  assert.match(payableDueLabel('2026-11-04', '2026-11-02'), /2 days left/);
  assert.equal(payableDueLabel(null, '2026-11-02'), 'No due date');
});
