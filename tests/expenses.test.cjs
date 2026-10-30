const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (!fs.existsSync(path.join(__dirname, '..', file))) file = file.replace(/\.ts$/, '/index.ts');
  if (cache.has(file)) return cache.get(file);
  const context = { exports: {}, Date, Map, require: name => {
    const target = name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(file), name);
    return load(`${target}.ts`);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  cache.set(file, context.exports);
  return context.exports;
}
const { emptyQuickAddDraft, quickAddErrors, hasQuickAddChanges } = load('src/utils/quick-add.ts');
const { createQuickAddService } = load('src/services/quick-add.ts');
const { monthlyExpenses, filterExpenses, expenseRecords, formatExpenseDate } = load('src/utils/expenses.ts');
const { expenseSeed } = load('src/data/expenses.ts');
const owner = { id: 'TH-DEMO-OWNER', name: 'Demo Owner', mode: 'mock' };
const draft = (patch = {}) => ({ ...emptyQuickAddDraft('expense', '2026-10-30'), category: 'Water Expense', amount: '100.25', expenseDate: '2026-10-30', ...patch });

test('expenses require a real calendar date and exact positive centavos, with no past/future policy', () => {
  const initial = emptyQuickAddDraft('expense', '2026-10-30');
  assert.ok(quickAddErrors(initial).category);
  assert.ok(quickAddErrors(initial).amount);
  assert.ok(quickAddErrors(initial).expenseDate);
  for (const expenseDate of ['', '2026-02-29', '2026-04-31', '10/30/2026', '2026-1-02', '0000-01-01']) assert.ok(quickAddErrors(draft({ expenseDate })).expenseDate, expenseDate);
  for (const expenseDate of ['2024-02-29', '2020-01-01', '2030-12-31', '1800-01-01']) assert.equal(Object.keys(quickAddErrors(draft({ expenseDate }))).length, 0, expenseDate);
  for (const amount of ['', '0', '-1', '1.001', '1e3', 'Infinity', '900719925474099.99']) assert.ok(quickAddErrors(draft({ amount })).amount, amount);
  assert.ok(quickAddErrors(draft({ category: 'Custom' })).category);
  assert.equal(Object.keys(quickAddErrors(draft({ amount: '0.01', details: '' }))).length, 0);
});

test('both expense entry points use one idempotent service and keep event timestamp separate from expense date', async () => {
  const service = createQuickAddService();
  const input = draft({ expenseDate: '2020-12-31', details: ' Water bill ' });
  const before = JSON.stringify(input);
  await assert.rejects(service.save(null, 'expense', input));
  const [quick, repeated] = await Promise.all([service.save(owner, 'expense', input), service.save(owner, 'expense', input)]);
  assert.equal(quick, repeated);
  assert.equal(quick.expenseDate, '2020-12-31');
  assert.equal(quick.amountCentavos, 10025);
  assert.equal(quick.name, 'Water Expense');
  assert.equal(quick.details, 'Water bill');
  assert.equal(quick.paymentStatus, null);
  assert.equal(quick.borrowing, null);
  assert.equal(quick.dueDate, null);
  assert.match(quick.occurredAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(JSON.stringify(input), before);
  const fullScreen = await service.save(owner, 'full-screen', draft());
  assert.equal(expenseRecords([quick, fullScreen]).length, 2);
});

test('monthly total uses expense calendar month and year independently of filters and recorded-at timestamp', async () => {
  const service = createQuickAddService();
  const records = await Promise.all(['2026-10-01', '2026-10-31', '2026-09-30', '2026-11-01', '2025-10-30'].map((expenseDate, i) => service.save(owner, String(i), draft({ expenseDate }))));
  assert.equal(monthlyExpenses(records, '2026-10-30'), 20050);
  assert.equal(monthlyExpenses(records, '2026-11-01'), 10025);
  assert.equal(monthlyExpenses([], '2026-10-30'), 0);
  filterExpenses(records, 'no match', 'Water Expense');
  assert.equal(monthlyExpenses(records, '2026-10-30'), 20050);
  assert.equal(monthlyExpenses(expenseSeed, '2026-10-30'), 245000);
});

test('search combines category, details, formatted/raw amount and date, with category intersection', () => {
  assert.equal(filterExpenses(expenseSeed, '  MERALCO september ', 'Electricity Expense').length, 1);
  assert.equal(filterExpenses(expenseSeed, 'Meralco', 'Water Expense').length, 0);
  assert.equal(filterExpenses(expenseSeed, 'water', 'all').length, 1);
  assert.equal(filterExpenses(expenseSeed, '2026-10-10', 'all').length, 1);
  assert.equal(filterExpenses(expenseSeed, 'Oct 10', 'Water Expense').length, 1);
  assert.equal(filterExpenses(expenseSeed, '1,850.00', 'all').length, 1);
  assert.equal(filterExpenses(expenseSeed, '1850', 'Electricity Expense').length, 1);
  assert.equal(filterExpenses(expenseSeed, 'nonexistent', 'all').length, 0);
  assert.equal(filterExpenses(expenseSeed, '   ', 'all').length, 3);
});

test('date display is timezone-stable and expense dirty checks include date and optional details', () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ['America/Los_Angeles', 'Asia/Manila', 'Pacific/Kiritimati']) {
      process.env.TZ = timezone;
      assert.equal(formatExpenseDate('2026-10-01'), 'Oct 01, 2026');
    }
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
  const initial = emptyQuickAddDraft('expense', '2026-10-30');
  assert.equal(hasQuickAddChanges({ ...initial }, initial), false);
  assert.equal(hasQuickAddChanges({ ...initial, expenseDate: '2026-10-30' }, initial), true);
  assert.equal(hasQuickAddChanges({ ...initial, details: 'Bill' }, initial), true);
  assert.equal(hasQuickAddChanges(draft(), initial), true);
});
