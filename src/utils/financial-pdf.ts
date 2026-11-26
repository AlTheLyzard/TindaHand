import type { FinancialReport } from '@/types/financial';
import { reportTitles, periodLabel, reportTimestamp, accountExplanation, balanceSide } from '@/utils/financial';
import tokens from '@/constants/design-tokens.json';

/** HTML never includes raw store/account/transaction strings. */
export function escapeReportHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
const money = (amount: number) => `₱${(Math.abs(amount || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      body += `<h2>${escapeReportHtml(day.date)}</h2>` + table(['Particulars', 'Debit', 'Credit'], day.entries.map(entry => `<tr class="description"><td colspan="3">${escapeReportHtml(`${entry.id} · ${entry.description}`)}</td></tr>` + entry.lines.map(line => `<tr><td${line.credit ? ' class="indent"' : ''}>${escapeReportHtml(report.ledger.find(account => account.id === line.accountId)?.name ?? line.accountId)}</td>${cell(money(line.debit), true)}${cell(money(line.credit), true)}</tr>`).join('')).join('') + `<tr class="total">${cell('Daily totals')}${cell(money(day.debit), true)}${cell(money(day.credit), true)}</tr>`);
    }
    body += table(['Overall totals', 'Debit', 'Credit'], `<tr class="total">${cell('All posted entries in period')}${cell(money(report.journal.debit), true)}${cell(money(report.journal.credit), true)}</tr>`);
    body += `<p class="${report.journal.balanced ? 'good' : 'bad'}">${report.journal.balanced ? 'Double-entry balance check: Total Debits = Total Credits' : 'Balance discrepancy: Total Debits do not equal Total Credits'}</p>`;
    body += `<div class="glossary"><h2>Talaan ng mga Termino (Glossary)</h2><p class="glossary-intro">Para sa mga hindi sanay sa accounting, narito ang simpleng paliwanag ng mga termino sa ulat na ito:</p><table><thead><tr><th>Termino sa Sistema</th><th>Ibig Sabihin</th></tr></thead><tbody>` +
      `<tr><td><strong>Pera sa Kaha (Cash)</strong></td><td>Ang aktwal na pera na nasa kamay o kaha ng tindahan. Ito ang cash na maaari mong gamitin kaagad.</td></tr>` +
      `<tr><td><strong>Sisingilin (Accounts Receivable)</strong></td><td>Ang utang ng mga customer sa tindahan — ang pera na dapat mong singilin pa. Nabibili na nila ang paninda pero hindi pa nabayaran.</td></tr>` +
      `<tr><td><strong>Paninda (Merchandise Inventory)</strong></td><td>Ang mga produkto o kalakal na mayroon ka sa tindahan para ibenta. Ito ang iyong stock.</td></tr>` +
      `<tr><td><strong>Gamit ng Tindahan (Store Equipment)</strong></td><td>Mga kagamitan na ginagamit sa tindahan tulad ng ref, timbangan, istante, at iba pa. Hindi ito para ibenta.</td></tr>` +
      `<tr><td><strong>Utang Ko (Accounts Payable)</strong></td><td>Ang utang ng tindahan sa supplier o nagbibigay ng paninda — ang pera na dapat mong bayaran pa.</td></tr>` +
      `<tr><td><strong>Puhunan (Capital)</strong></td><td>Ang sariling pera o ari-arian na inilagay mo sa negosyo bilang simula ng tindahan.</td></tr>` +
      `<tr><td><strong>Kita sa Benta (Sales)</strong></td><td>Ang kabuuang kita mula sa mga binentang produkto. Ito ang bayad ng mga customer sa iyong tindahan.</td></tr>` +
      `<tr><td><strong>Halaga ng Binentang Paninda (COGS)</strong></td><td>Ang halaga ng mga produktong nabenta — kung magkano ang ginastos mo para makuha ang mga produktong iyon. Ibinabawas ito sa kita para malaman ang totoong kita.</td></tr>` +
      `<tr><td><strong>Bayad sa Kuryente at Tubig (Utilities)</strong></td><td>Mga gastos sa kuryente at tubig ng tindahan.</td></tr>` +
      `<tr><td><strong>Bayad sa Pagdadala (Transportation)</strong></td><td>Gastos sa pagsasakay o pagdadala ng mga paninda mula sa supplier.</td></tr>` +
      `<tr><td><strong>Gastusin (General Expense)</strong></td><td>Iba pang mga gastos sa pagpapatakbo ng tindahan na hindi kasali sa nabanggit na kategorya.</td></tr>` +
      `<tr><td><strong>Debit</strong></td><td>Ang "dagdag" sa asset o gastusin, o "bawas" sa utang at kita. Sa simpleng salita: may pumasok o may ginastos.</td></tr>` +
      `<tr><td><strong>Credit</strong></td><td>Ang "bawas" sa asset, o "dagdag" sa utang at kita. Sa simpleng salita: may lumabas o may kinikita.</td></tr>` +
      `</tbody></table></div>`;
  } else if (report.kind === 'general-ledger') {
    for (const account of report.ledger) {
      const amount = (value: number) => money(value);
      body += `<h2>${escapeReportHtml(account.name)}</h2>` + table(['Date / Particulars', 'Debit', 'Credit', 'Balance'],
        `<tr>${cell(`Opening balance · before ${report.selection.from}`)}${cell(money(0), true)}${cell(money(0), true)}${cell(amount(account.opening), true)}</tr>` +
        account.rows.map(item => `<tr>${cell(`${item.date} · ${item.description}`)}${cell(money(item.debit), true)}${cell(money(item.credit), true)}${cell(amount(item.balance), true)}</tr>`).join('') +
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
    @page { size: A4; margin: 18mm 14mm; } * { box-sizing: border-box; } html, body { background: ${tokens.color.surfaceCard}; color-scheme: light; } body { font: 11px Arial, sans-serif; color: ${tokens.color.textPrimary}; }
    h1 { color: ${tokens.color.darkNavy}; font-size: 22px; margin-bottom: 8px; } h2 { font-size: 16px; color: ${tokens.color.darkNavy}; break-after: avoid; } h3 { break-after: avoid; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; table-layout: auto; } thead { display: table-header-group; } th { text-align: left; background: ${tokens.color.softBlue}; }
    td, th { border-bottom: 1px solid ${tokens.color.borderOutline}; padding: 9px 7px; overflow-wrap: anywhere; vertical-align: top; } th:not(:first-child), .number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    tr { break-inside: avoid; page-break-inside: avoid; } .total { font-weight: bold; background: ${tokens.color.softBlue}; } .indent { padding-left: 24px; } .description { font-size: 10px; color: ${tokens.color.textSecondary}; }
    .summary { padding: 14px; border: 1px solid ${tokens.color.borderOutline}; margin: 12px 0; break-inside: avoid; } .summary h2 { margin: 8px 0 0; color: inherit; } .good { color: ${tokens.color.successBase}; background: ${tokens.color.successTint}; } .blue { color: ${tokens.color.darkNavy}; background: ${tokens.color.softBlue}; } .bad { color: ${tokens.color.errorBase}; background: ${tokens.color.errorTint}; }
    footer { margin-top: 20px; color: ${tokens.color.textSecondary}; font-size: 10px; }
    .glossary { margin-top: 32px; border-top: 2px solid ${tokens.color.darkNavy}; padding-top: 16px; }
    .glossary h2 { font-size: 14px; color: ${tokens.color.darkNavy}; margin-bottom: 4px; }
    .glossary-intro { font-size: 10px; color: ${tokens.color.textSecondary}; margin-bottom: 10px; }
    .glossary table { margin: 8px 0 0; } .glossary td { font-size: 10px; vertical-align: top; padding: 7px 7px; }
    .glossary td:first-child { width: 38%; white-space: normal; }
  </style></head><body><h1>${escapeReportHtml(report.storeName)}</h1><h2>${reportTitles[report.kind]}</h2><p>${escapeReportHtml(periodLabel(report.selection, report.kind === 'balance-sheet'))}</p><p>Generated: ${escapeReportHtml(reportTimestamp(report.generatedAt))}</p>${body}<footer>TindaHand · ${escapeReportHtml(report.timezone)}</footer></body></html>`;
}
