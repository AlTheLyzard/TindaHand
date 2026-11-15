const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/creditor-selection.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { selectDraftCreditor } = context.exports;
const creditors = [{ id: 'creditor-1', name: 'Fictional Rice Supply' }, { id: 'creditor-2', name: 'Fictional Packaging' }];
const draft = Object.freeze({ kind: 'storeDebt', name: 'Unselected name', amount: '12500.50', dueDate: '2026-12-01', details: 'Unpaid delivery', expenseDate: '', category: '', borrowing: 'cash', items: Object.freeze({}) });

test('creditor selection/reselection changes only identity and preserves every debt draft field', () => {
  const before = JSON.stringify(draft);
  let selected = draft;
  for (const id of ['creditor-1', 'creditor-2', 'creditor-1']) {
    selected = selectDraftCreditor(selected, creditors, id);
    assert.equal(selected.creditorId, id); assert.equal(selected.name, creditors.find(row => row.id === id).name);
    for (const key of ['amount', 'dueDate', 'details', 'expenseDate', 'category', 'borrowing', 'items', 'kind']) assert.equal(selected[key], draft[key], key);
  }
  assert.equal(JSON.stringify(draft), before);
});

test('empty/stale/missing creditor selections leave the current draft intact', () => {
  assert.equal(selectDraftCreditor(draft, [], 'creditor-1'), draft);
  assert.equal(selectDraftCreditor(draft, creditors, undefined), draft);
  assert.equal(selectDraftCreditor(draft, creditors, 'deleted-id'), draft);
  const selected = selectDraftCreditor(draft, creditors, 'creditor-1');
  assert.equal(selectDraftCreditor(selected, [], 'creditor-1'), selected);
});
