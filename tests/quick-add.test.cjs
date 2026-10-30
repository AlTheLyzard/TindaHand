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
const { emptyQuickAddDraft, quickAddErrors, quickAddTotal, addCalendarDays, hasQuickAddChanges, summarizeQuickAdd } = load('src/utils/quick-add.ts');
const { createQuickAddService } = load('src/services/quick-add.ts');
const { quickAddPolicy } = load('src/config/quick-add.ts');
const { selectProduct } = load('src/utils/pos.ts');
const owner = { id: 'demo-owner', name: 'Demo Owner', mode: 'mock' };
const cash = () => ({ ...emptyQuickAddDraft('customerDebt', '2026-10-27'), name: 'Uncle Daughs', amount: '1500.25' });

test('calendar defaults cross month/year and leap-day boundaries; store policy can be unset', () => {
  assert.equal(cash().dueDate, '2026-11-26');
  assert.equal(addCalendarDays('2028-02-01', 30), '2028-03-02');
  assert.equal(addCalendarDays('2026-12-15', 30), '2027-01-14');
  const previous = quickAddPolicy.storeDebtDueDays;
  try { quickAddPolicy.storeDebtDueDays = null; assert.equal(emptyQuickAddDraft('storeDebt', '2026-10-27').dueDate, ''); }
  finally { quickAddPolicy.storeDebtDueDays = previous; }
});
test('validation rejects missing identity/category, invalid or unsafe money and invalid dates', () => {
  for (const amount of ['', '0', '-1', '1e3', '1.001', '900719925474099.99']) assert.ok(quickAddErrors({ ...cash(), amount }).amount);
  assert.ok(quickAddErrors({ ...cash(), name: '  ' }).name);
  assert.ok(quickAddErrors({ ...cash(), dueDate: '2026-02-30' }).dueDate);
  assert.equal(Object.keys(quickAddErrors(cash())).length, 0);
  assert.ok(quickAddErrors({ ...cash(), kind: 'expense', category: 'Unapproved' }).category);
  assert.equal(Object.keys(quickAddErrors({ ...cash(), kind: 'expense', category: 'Water Expense', expenseDate: '2026-10-27', name: '' })).length, 0);
});
test('product selection uses selling-price snapshots without mutating catalog or cash draft', async () => {
  const product = { id: 'p1', name: 'Milk', unitPriceCentavos: 3500, stock: 5 };
  let items = selectProduct({}, product);
  items = selectProduct(items, { ...product, unitPriceCentavos: 9999 });
  const draft = { ...cash(), borrowing: 'product', items };
  assert.equal(quickAddTotal(draft), 7000);
  const record = await createQuickAddService().save(owner, 'snapshot', draft);
  assert.equal(record.items.p1.itemName, 'Milk');
  assert.equal(record.items.p1.unitPriceCentavos, 3500);
  draft.items.p1.quantity = 4;
  assert.equal(record.items.p1.quantity, 2);
  assert.equal(product.stock, 5);
  assert.equal(record.paymentStatus, 'unpaid');
});
test('duplicate concurrent submissions return one record; failed save leaves draft retryable', async () => {
  const service = createQuickAddService();
  const draft = cash();
  const before = JSON.stringify(draft);
  await assert.rejects(service.save(null, 'retry', draft));
  assert.equal(JSON.stringify(draft), before);
  const [a, b] = await Promise.all([service.save(owner, 'retry', draft), service.save(owner, 'retry', draft)]);
  assert.equal(a, b);
  assert.equal(a.amountCentavos, 150025);
  assert.equal(a.name, 'Uncle Daughs');
  const totals = summarizeQuickAdd([a]);
  assert.equal(totals.customerDebt, 150025);
  assert.equal(totals.expense, 0);
});
test('dirty checks include edited dates and optional details; corrected fields clear errors', () => {
  const baseline = emptyQuickAddDraft('storeDebt', '2026-10-27');
  assert.equal(hasQuickAddChanges({ ...baseline }, baseline), false);
  assert.equal(hasQuickAddChanges({ ...baseline, dueDate: '' }, baseline), true);
  assert.equal(hasQuickAddChanges({ ...baseline, details: 'Invoice' }, baseline), true);
  assert.ok(quickAddErrors(baseline).name);
  assert.equal(Object.keys(quickAddErrors({ ...baseline, name: 'ABC Trading', amount: '3400' })).length, 0);
});
