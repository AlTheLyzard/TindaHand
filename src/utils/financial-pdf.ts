import type { FinancialReport } from '@/types/financial';
import { reportTitles, periodLabel, reportTimestamp, accountExplanation, balanceSide } from '@/utils/financial';

/** HTML never includes raw store/account/transaction strings. */
export function escapeReportHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
const money = (amount: number) => `₱${((amount || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cell = (value: string | number, numeric = false) => `<td${numeric ? ' class="number"' : ''}>${escapeReportHtml(String(value))}</td>`;
const row = (name: string, amount: number) => `<tr>${cell(name)}${cell(money(amount), true)}</tr>`;
function table(headers: string[], body: string) { return `<table><thead><tr>${headers.map(value => `<th>${escapeReportHtml(value)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`; }
const summary = (label: string, value: number, tone: boolean | 'blue' = true) => `<div class="summary ${tone === 'blue' ? 'blue' : tone ? 'good' : 'bad'}"><strong>${escapeReportHtml(label)}</strong><h2>${money(value)}</h2></div>`;
export function financialFilename(report: FinancialReport) {
  return `TindaHand-${report.kind}-${report.kind === 'balance-sheet' ? report.selection.to : `${report.selection.from}-to-${report.selection.to}`}.pdf`;
}
/** Complete applied snapshot only. CSS repeats headers and permits multipage tables.
 * Rows can wrap; tables/cards have no fixed heights and no overflow clipping. */
export function financialReportHtml(report: FinancialReport) {
  let body = '';
  if (!report.hasActivity) body += '<p>No posted activity for this period.</p>';
  if (report.kind === 'general-journal') {
    for (const day of report.journal.days) {
      body += `<h2>${escapeReportHtml(day.date)}</h2>` + table(['Particulars', 'Debit', 'Credit'], day.entries.map(entry => `<tr class="description"><td colspan="3">${escapeReportHtml(`${entry.id} · ${entry.description}`)}</td></tr>` + entry.lines.map(line => `<tr><td${line.credit ? ' class="indent"' : ''}>${escapeReportHtml(report.ledger.find(account => account.id === line.accountId)?.name ?? line.accountId)}</td>${cell(line.debit ? money(line.debit) : '—', true)}${cell(line.credit ? money(line.credit) : '—', true)}</tr>`).join('')).join('') + `<tr class="total">${cell('Daily totals')}${cell(money(day.debit), true)}${cell(money(day.credit), true)}</tr>`);
    }
    body += table(['Overall totals', 'Debit', 'Credit'], `<tr class="total">${cell('All posted entries in period')}${cell(money(report.journal.debit), true)}${cell(money(report.journal.credit), true)}</tr>`);
    body += `<p class="${report.journal.balanced ? 'good' : 'bad'}">${report.journal.balanced ? 'Double-entry balance check: Total Debits = Total Credits' : 'Balance discrepancy: Total Debits do not equal Total Credits'}</p>`;
  } else if (report.kind === 'general-ledger') {
    for (const account of report.ledger) {
      const amount = (value: number) => `${money(Math.abs(value))} ${balanceSide(value) === 'debit' ? 'Dr' : 'Cr'}`;
      body += `<h2>${escapeReportHtml(account.name)}</h2>` + table(['Date / Particulars', 'Debit', 'Credit', 'Balance'],
        `<tr>${cell(`Opening balance · before ${report.selection.from}`)}${cell('—', true)}${cell('—', true)}${cell(amount(account.opening), true)}</tr>` +
        account.rows.map(item => `<tr>${cell(`${item.date} · ${item.description}`)}${cell(item.debit ? money(item.debit) : '—', true)}${cell(item.credit ? money(item.credit) : '—', true)}${cell(amount(item.balance), true)}</tr>`).join('') +
        `<tr class="total">${cell('Period activity / Ending balance')}${cell(money(account.debit), true)}${cell(money(account.credit), true)}${cell(amount(account.ending), true)}</tr>`);
      body += summary(`Ending ${balanceSide(account.ending)} balance`, Math.abs(account.ending)) + `<p>${escapeReportHtml(accountExplanation(account.normal, account.name))}</p>`;
    }
  } else if (report.kind === 'income-statement') {
    const income = report.income;
    body += '<h2>REVENUE</h2>' + table(['Particulars', 'Amount'], row('Gross Sales', income.sales) + row('Less: Cost of Goods Sold (COGS)', -income.cost));
    body += summary('Gross Profit', income.grossProfit, income.grossProfit >= 0 ? 'blue' : false) + '<h2>OPERATING EXPENSES</h2>';
    body += table(['Expense', 'Amount'], income.expenses.map(expense => row(expense.name, expense.amount)).join('') + `<tr class="total">${cell('Total Operating Expenses')}${cell(money(income.totalExpenses), true)}</tr>`);
    body += summary(income.netProfit < 0 ? 'NET LOSS' : 'NET PROFIT', income.netProfit, income.netProfit >= 0);
  } else {
    const b = report.balance;
    body += '<h2>Assets</h2><h3>Current Assets</h3>' + table(['Account', 'Amount'], b.currentAssets.map(item => row(item.name, item.amount)).join('') + row('Total Current Assets', b.currentTotal));
    body += '<h3>Non-Current Assets</h3>' + table(['Account', 'Amount'], b.nonCurrentAssets.map(item => row(item.name, item.amount)).join('') + row('Total Non-Current Assets', b.nonCurrentTotal));
    body += summary('TOTAL ASSETS', b.assets) + '<h2>Liabilities</h2>' + table(['Account', 'Amount'], b.liabilities.map(item => row(item.name, item.amount)).join('') + row('TOTAL LIABILITIES', b.liabilityTotal));
    body += '<h2>Owner’s Equity</h2>' + table(['Account', 'Amount'], b.capital.map(item => row(item.name, item.amount)).join('') + row('Accumulated Earnings', b.accumulatedEarnings) + row('TOTAL OWNER’S EQUITY', b.equity));
    body += '<p>Accumulated earnings include all posted earnings through the reporting date.</p>' + summary('TOTAL LIABILITIES & EQUITY', b.liabilitiesAndEquity, b.balanced);
    body += `<p>${b.balanced ? 'Matches' : 'Does not match'} Total Assets: ${money(b.assets)}</p>`;
  }
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${financialFilename(report)}</title><style>
    @page { size: A4; margin: 18mm 14mm; } * { box-sizing: border-box; } html, body { background: #FFFFFF; color-scheme: light; } body { font: 11px Arial, sans-serif; color: #0C1B3C; }
    h1 { color: #112F6F; font-size: 22px; margin-bottom: 8px; } h2 { font-size: 16px; color: #112F6F; break-after: avoid; } h3 { break-after: avoid; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; table-layout: auto; } thead { display: table-header-group; } th { text-align: left; background: #D1E1F5; }
    td, th { border-bottom: 1px solid #B0C8E3; padding: 9px 7px; overflow-wrap: anywhere; vertical-align: top; } th:not(:first-child), .number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    tr { break-inside: avoid; page-break-inside: avoid; } .total { font-weight: bold; background: #D1E1F5; } .indent { padding-left: 24px; } .description { font-size: 10px; color: #4A607A; }
    .summary { padding: 14px; border: 1px solid #B0C8E3; margin: 12px 0; break-inside: avoid; } .summary h2 { margin: 8px 0 0; color: inherit; } .good { color: #21642C; background: #E8F5E9; } .blue { color: #112F6F; background: #D1E1F5; } .bad { color: #B4232C; background: #FFEBEE; }
    footer { margin-top: 20px; color: #4A607A; font-size: 10px; }
  </style></head><body><h1>${escapeReportHtml(report.storeName)}</h1><h2>${reportTitles[report.kind]}</h2><p>${escapeReportHtml(periodLabel(report.selection, report.kind === 'balance-sheet'))}</p><p>Generated: ${escapeReportHtml(reportTimestamp(report.generatedAt))}</p>${body}<footer>TindaHand · Fictional posted demo records · ${escapeReportHtml(report.timezone)}</footer></body></html>`;
}
