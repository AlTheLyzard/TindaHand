const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const context = { exports: {}, Date, Intl, Map, require: name => load((name.startsWith('@/') ? name.replace('@/', 'src/') : path.join(path.dirname(file), name)) + '.ts') };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  cache.set(file, context.exports);
  return context.exports;
}
const f = load('src/utils/financial.ts');
const pdf = load('src/utils/financial-pdf.ts');
const { financialSeed: seed } = load('src/data/financial.ts');
const { createFinancialRepository } = load('src/services/financial.ts');
const owner = { id: 'TH-DEMO-OWNER', name: 'Demo Owner', mode: 'mock' };
const period = (from = '2026-10-01', to = '2026-10-31') => ({ preset: 'custom', from, to });
const report = (kind = 'general-journal', selection = period(), data = seed) => f.calculateFinancialReport(data, kind, selection, '2026-11-09T02:00:00Z');

test('inclusive filters permit same-day ranges and exclude either adjacent day', () => {
  const result = report('general-journal', period('2026-10-24', '2026-10-25'));
  assert.equal(result.journal.days.length, 2);
  assert.equal(result.journal.days[0].date, '2026-10-24');
  assert.equal(result.journal.days[1].date, '2026-10-25');
  assert.equal(result.journal.debit, 1680000);
  assert.equal(report('general-journal', period('2026-10-24', '2026-10-24')).journal.days.length, 1);
  assert.equal(report('general-journal', period('2020-01-01', '2020-01-01')).journal.debit, 0);
});
test('presets use Manila dates and Monday week starts across month/year boundaries', () => {
  assert.equal(f.storeToday(new Date('2026-11-08T16:01:00Z')), '2026-11-09');
  assert.equal(f.storeToday(new Date('2026-11-08T15:59:00Z')), '2026-11-08');
  assert.equal(f.presetSelection('week', '2026-11-01').from, '2026-10-26');
  assert.equal(f.presetSelection('week', '2026-11-02').from, '2026-11-02');
  assert.equal(f.presetSelection('month', '2026-11-09').from, '2026-11-01');
  assert.equal(f.presetSelection('yesterday', '2026-01-01').to, '2025-12-31');
  assert.equal(f.shiftDate('2024-03-01', -1), '2024-02-29');
});
test('invalid ranges and calendar values never apply, and Reset applies Today', () => {
  const today = f.presetSelection('today', '2026-11-09');
  const initial = { draft: today, applied: today };
  for (const bad of [period('2026-10-31', '2026-10-01'), period('2026-02-29', '2026-03-01'), period('', ''), period('2026-04-31', '2026-05-01')]) {
    assert.ok(f.selectionError(bad));
    const changed = f.reportFilterReducer(initial, { type: 'draft', selection: bad });
    assert.equal(f.reportFilterReducer(changed, { type: 'apply' }), changed);
    assert.throws(() => report('general-journal', bad));
    const reset = f.reportFilterReducer(changed, { type: 'reset', today: '2026-11-09' });
    assert.equal(f.selectionError(reset.draft), null);
    assert.equal(reset.applied.from, '2026-11-09');
    assert.equal(reset.applied.preset, 'today');
  }
  assert.equal(f.selectionError(period('2026-10-01', '2026-10-01')), null);
  assert.throws(() => report('balance-sheet', period()), /one As of Date/);
});
test('draft and applied selections remain separate, including presets and refresh', async () => {
  const today = f.presetSelection('today', '2026-11-09');
  const initial = { draft: today, applied: today };
  const changed = f.reportFilterReducer(initial, { type: 'draft', selection: period() });
  assert.equal(changed.applied.to, '2026-11-09');
  assert.equal(changed.draft.to, '2026-10-31');
  assert.equal(f.samePeriod(changed.draft, changed.applied), false);
  const repository = createFinancialRepository(seed);
  const refreshed = await repository.getReport(owner, 'general-journal', changed.applied);
  assert.equal(refreshed.selection.to, '2026-11-09');
  const applied = f.reportFilterReducer(changed, { type: 'apply' });
  assert.equal(applied.applied.to, '2026-10-31');
  assert.notEqual(applied.applied, applied.draft);
  const preset = f.reportFilterReducer(initial, { type: 'draft', selection: f.presetSelection('month', '2026-11-09') });
  assert.equal(preset.applied.from, '2026-11-09');
  assert.equal(preset.draft.from, '2026-11-01');
});
test('all entries and daily journal totals balance; periods reconcile with ledger and income', () => {
  for (const entry of seed.entries) assert.equal(entry.lines.reduce((sum, line) => sum + line.debit - line.credit, 0), 0, entry.id);
  const r = report();
  for (const day of r.journal.days) assert.equal(day.debit, day.credit);
  assert.equal(r.journal.balanced, true);
  assert.equal(r.ledger.reduce((sum, account) => sum + account.debit, 0), r.journal.debit);
  assert.equal(r.ledger.reduce((sum, account) => sum + account.credit, 0), r.journal.credit);
  assert.equal(r.income.sales, 1050000);
  assert.equal(r.income.cost, 630000);
  assert.equal(r.income.grossProfit, 420000);
  assert.equal(r.income.totalExpenses, 155000);
  assert.equal(r.income.netProfit, 265000);
  assert.equal(r.ledger.length, seed.accounts.length);
});
test('ledger includes opening balances, every account, chronological running and ending balances with Dr/Cr sides', () => {
  const before = JSON.stringify(seed);
  const r = report('general-ledger');
  const cash = r.ledger.find(a => a.id === 'cash');
  assert.equal(cash.opening, 2500000);
  assert.equal(cash.ending, 2745000);
  let previous = cash.opening;
  for (const row of cash.rows) { assert.equal(row.balance, previous + row.debit - row.credit); previous = row.balance; }
  const payable = r.ledger.find(a => a.id === 'payables');
  assert.equal(payable.opening, -1200000);
  assert.equal(payable.ending, -800000);
  assert.equal(f.balanceSide(payable.ending), 'credit');
  assert.equal(f.balanceSide(cash.ending), 'debit');
  assert.equal(r.ledger.find(a => a.id === 'equipment').rows.length, 0);
  assert.equal(r.ledger.find(a => a.id === 'equipment').ending, 1000000);
  assert.equal(JSON.stringify(seed), before);
});
test('as-of balances reconcile and cumulative earnings are included exactly once', () => {
  const september = report('balance-sheet', period('2026-09-30', '2026-09-30'));
  const october = report('balance-sheet', period('2026-10-31', '2026-10-31'));
  const november = report('balance-sheet', period('2026-11-09', '2026-11-09'));
  assert.equal(september.balance.accumulatedEarnings, 200000);
  assert.equal(october.balance.accumulatedEarnings, 465000);
  assert.equal(october.balance.accumulatedEarnings - september.balance.accumulatedEarnings, report('income-statement').income.netProfit);
  assert.equal(october.balance.assets, 4765000);
  assert.equal(november.balance.assets, 4884000);
  assert.equal(november.balance.accumulatedEarnings, 584000);
  for (const r of [september, october, november]) { assert.equal(r.balance.assets, r.balance.liabilitiesAndEquity); assert.equal(r.balance.balanced, true); }
  const empty = report('balance-sheet', period('2020-01-01', '2020-01-01'));
  assert.equal(empty.balance.assets, 0); assert.equal(empty.hasActivity, false);
});
test('losses, empty periods, and unbalanced data never produce misleading success checks', () => {
  const loss = report('income-statement', period('2026-10-30', '2026-10-31'));
  assert.equal(loss.income.netProfit, -155000);
  assert.match(pdf.financialReportHtml(loss), /NET LOSS/);
  const empty = report('income-statement', period('2030-01-01', '2030-01-31'));
  assert.equal(empty.income.netProfit, 0);
  const emptyLedger = report('general-ledger', period('2030-01-01', '2030-01-31'));
  assert.equal(emptyLedger.ledger[0].opening, emptyLedger.ledger[0].ending);
  const broken = { ...seed, entries: [...seed.entries, { id: 'bad', date: '2026-10-31', description: 'Unbalanced', lines: [{ accountId: 'cash', debit: 1, credit: 0 }] }] };
  const journal = report('general-journal', period(), broken);
  const balance = report('balance-sheet', period('2026-10-31', '2026-10-31'), broken);
  assert.equal(journal.journal.balanced, false);
  assert.equal(balance.balance.balanced, false);
  assert.match(pdf.financialReportHtml(journal), /Balance discrepancy/);
  assert.match(pdf.financialReportHtml(balance), /Does not match Total Assets/);
});
test('service rejects missing owner and returns isolated applied query metadata', async () => {
  const service = createFinancialRepository(seed, () => '2026-11-09T04:00:00Z');
  await assert.rejects(service.getReport(null, 'general-journal', period()), /owner session/);
  await assert.rejects(service.getStatus(null), /owner session/);
  const query = period(); const r = await service.getReport(owner, 'general-journal', query);
  query.from = '2000-01-01';
  assert.equal(r.selection.from, '2026-10-01');
  assert.equal(r.generatedAt, '2026-11-09T04:00:00Z');
  assert.equal((await service.getStatus(owner)).updatedAt, seed.updatedAt);
});
test('every PDF uses applied data, complete rows, correct title, dates, totals, metadata and safe HTML', () => {
  for (const kind of Object.keys(f.reportTitles)) {
    const selection = kind === 'balance-sheet' ? period('2026-10-31', '2026-10-31') : period();
    const r = report(kind, selection);
    const html = pdf.financialReportHtml(r);
    assert.ok(html.includes(f.reportTitles[kind]));
    assert.ok(html.includes(seed.storeName));
    assert.ok(html.includes('Generated:'));
    assert.ok(html.includes('October') || html.includes('Oct'));
    assert.ok(html.includes('<thead>'));
    assert.ok(html.includes('table-header-group'));
    assert.match(pdf.financialFilename(r), new RegExp(kind + '-2026-10-'));
    const state = f.reportFilterReducer({ draft: selection, applied: selection }, { type: 'draft', selection: period('2030-01-01', '2030-01-31') });
    assert.equal(pdf.financialReportHtml(r), html);
    assert.equal(state.applied.to, r.selection.to);
    if (kind === 'general-journal') for (const day of r.journal.days) for (const entry of day.entries) assert.ok(html.includes(entry.id));
    if (kind === 'general-ledger') for (const account of r.ledger) assert.ok(html.includes(pdf.escapeReportHtml(account.name)));
  }
  assert.equal(pdf.escapeReportHtml('<script>"a" & \'b\'</script>'), '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/script&gt;');
  assert.ok(!pdf.financialReportHtml({ ...report(), storeName: '<script>bad()</script>' }).includes('<script>'));
});
test('many posted entries, long names and large amounts remain complete in PDF output', () => {
  const entries = Array.from({ length: 120 }, (_, i) => ({ id: `bulk-${String(i).padStart(3, '0')}`, date: '2026-10-24', description: 'Long transaction '.repeat(8), lines: [{ accountId: 'cash', debit: 12345678901, credit: 0 }, { accountId: 'capital', debit: 0, credit: 12345678901 }] }));
  const data = { ...seed, entries, accounts: seed.accounts.map(a => a.id === 'cash' ? { ...a, name: 'A long account name '.repeat(5) } : a) };
  const r = report('general-journal', period(), data);
  const html = pdf.financialReportHtml(r);
  assert.equal(r.journal.debit, 120 * 12345678901);
  for (const entry of entries) assert.ok(html.includes(entry.id));
  assert.ok(html.includes('123,456,789.01'));
});

function nativeExporter({ available = true, printError = false, shareError = false } = {}) {
  const calls = { print: [], share: [], move: [], directories: [] };
  class Directory {
    constructor(base, name) { this.uri = `${base}/${name}`; }
    create() { calls.directories.push(this.uri); }
  }
  class File {
    constructor(base, name) { this.uri = name ? `${base.uri}/${name}` : base; }
    async move(destination) { calls.move.push(destination.uri); }
  }
  const modules = {
    'expo-file-system': { File, Directory, Paths: { cache: 'file:///cache' } },
    'expo-print': { async printToFileAsync(options) { calls.print.push(options); if (printError) throw Error('Print failed'); return { uri: 'file:///cache/source.pdf' }; } },
    'expo-sharing': { async isAvailableAsync() { return available; }, async shareAsync(uri, options) { calls.share.push({ uri, options }); if (shareError) throw Error('Share failed'); } },
  };
  const context = { exports: {}, Date, require: name => modules[name] ?? load(name.replace('@/', 'src/') + '.ts') };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', 'src/services/financial-export.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { exportPdf: context.exports.exportFinancialPdf, calls };
}
test('native export generates a real applied-report payload, names the PDF and hands it to sharing exactly once', async () => {
  const { exportPdf, calls } = nativeExporter();
  const applied = report('income-statement');
  const result = await exportPdf(applied);
  assert.equal(result, 'ready'); // Does not claim saved/shared; native dismissal is indistinguishable.
  assert.equal(calls.print.length, 1); assert.equal(calls.share.length, 1);
  assert.ok(calls.print[0].html.includes('₱2,650.00'));
  assert.ok(calls.print[0].html.includes('Oct 01, 2026'));
  assert.match(calls.move[0], /TindaHand-income-statement-2026-10-01-to-2026-10-31\.pdf$/);
  assert.equal(calls.share[0].uri, calls.move[0]);
  assert.equal(calls.share[0].options.mimeType, 'application/pdf');
});
test('native unavailable, print, and share failures reject without fake success', async () => {
  const unavailable = nativeExporter({ available: false });
  await assert.rejects(unavailable.exportPdf(report()), /unavailable/);
  assert.equal(unavailable.calls.print.length, 0);
  const print = nativeExporter({ printError: true });
  await assert.rejects(print.exportPdf(report()), /Print failed/);
  assert.equal(print.calls.share.length, 0);
  const share = nativeExporter({ shareError: true });
  await assert.rejects(share.exportPdf(report()), /Share failed/);
  assert.equal(share.calls.share.length, 1);
});
