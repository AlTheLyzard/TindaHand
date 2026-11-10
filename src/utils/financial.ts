import type { FinancialDataset, FinancialReport, JournalDay, ReportFilterState, ReportKind, ReportPreset, ReportSelection } from '@/types/financial';
import { validCalendarDate, formatCalendarDate } from '@/utils/date';

export const reportTitles: Record<ReportKind, string> = { 'general-journal': 'General Journal', 'general-ledger': 'General Ledger', 'income-statement': 'Income Statement', 'balance-sheet': 'Balance Sheet' };
export const STORE_TIMEZONE = 'Asia/Manila';
export function storeToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: STORE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
/** UTC is only used as arithmetic on calendar components, never to convert event time. */
export function shiftDate(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export function presetSelection(preset: ReportPreset, today = storeToday()): ReportSelection {
  let from = today;
  if (preset === 'yesterday') from = shiftDate(today, -1);
  if (preset === 'week') from = shiftDate(today, -((new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7));
  if (preset === 'month') from = `${today.slice(0, 7)}-01`;
  return { preset, from, to: preset === 'yesterday' ? from : today };
}
export function selectionError(selection: ReportSelection) {
  if (!validCalendarDate(selection.from) || !validCalendarDate(selection.to)) return 'Enter a valid date in YYYY-MM-DD format.';
  if (selection.to < selection.from) return `To must be on or after From. Choose ${formatCalendarDate(selection.from)} or a later date.`;
  return null;
}
export function samePeriod(a: ReportSelection, b: ReportSelection) { return a.from === b.from && a.to === b.to; }
export type FilterAction = { type: 'draft'; selection: ReportSelection } | { type: 'apply' } | { type: 'reset'; today: string };
export function reportFilterReducer(state: ReportFilterState, action: FilterAction): ReportFilterState {
  if (action.type === 'draft') return { ...state, draft: { ...action.selection } };
  if (action.type === 'reset') { const today = presetSelection('today', action.today); return { draft: today, applied: { ...today } }; }
  return selectionError(state.draft) ? state : { draft: state.draft, applied: { ...state.draft } };
}
export function periodLabel(selection: ReportSelection, single = false) {
  return single ? `As of ${formatCalendarDate(selection.to)}` : selection.from === selection.to ? formatCalendarDate(selection.from) : `${formatCalendarDate(selection.from)} – ${formatCalendarDate(selection.to)}`;
}
export function reportTimestamp(value: string) {
  return new Date(value).toLocaleString('en-US', { timeZone: STORE_TIMEZONE, year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' PHT';
}
export function balanceSide(value: number) { return value < 0 ? 'credit' : 'debit'; }
export function accountExplanation(normal: 'debit' | 'credit', name: string) {
  return `${name} is ${normal}-normal. ${normal === 'debit' ? 'Debit increases; credit reduces' : 'Credit increases; debit reduces'} this account.`;
}
export function calculateFinancialReport(data: FinancialDataset, kind: ReportKind, selection: ReportSelection, generatedAt: string): FinancialReport {
  const error = selectionError(selection);
  if (error) throw new Error(error);
  if (kind === 'balance-sheet' && selection.from !== selection.to) throw new Error('Balance Sheet requires one As of Date.');
  const entries = [...data.entries].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const period = entries.filter(entry => entry.date >= selection.from && entry.date <= selection.to);
  const dayMap = new Map<string, JournalDay>();
  for (const entry of period) {
    const day = dayMap.get(entry.date) ?? { date: entry.date, entries: [], debit: 0, credit: 0 };
    day.entries.push(entry);
    entry.lines.forEach(line => { day.debit += line.debit; day.credit += line.credit; });
    dayMap.set(entry.date, day);
  }
  const days = [...dayMap.values()];
  const debit = days.reduce((total, day) => total + day.debit, 0);
  const credit = days.reduce((total, day) => total + day.credit, 0);
  const ledger = data.accounts.map(account => {
    const opening = entries.filter(entry => entry.date < selection.from).reduce((total, entry) => total + entry.lines.filter(line => line.accountId === account.id).reduce((sum, line) => sum + line.debit - line.credit, 0), 0);
    let balance = opening;
    const rows = period.flatMap(entry => entry.lines.filter(line => line.accountId === account.id).map(line => {
      balance += line.debit - line.credit;
      return { entryId: entry.id, date: entry.date, description: entry.description, debit: line.debit, credit: line.credit, balance };
    }));
    return { ...account, opening, rows, ending: balance, debit: rows.reduce((sum, row) => sum + row.debit, 0), credit: rows.reduce((sum, row) => sum + row.credit, 0) };
  });
  const sumCategory = (category: string, cumulative: boolean) => ledger.filter(account => account.category === category).reduce((sum, account) => sum + (cumulative ? account.ending : account.debit - account.credit), 0);
  const sales = -sumCategory('revenue', false) || 0, cost = sumCategory('cost', false);
  const expenses = ledger.filter(account => account.category === 'expense').map(account => ({ id: account.id, name: account.name, amount: account.debit - account.credit }));
  const totalExpenses = sumCategory('expense', false);
  const amounts = (category: string, sign = 1) => ledger.filter(account => account.category === category).map(account => ({ id: account.id, name: account.name, amount: account.ending * sign }));
  const currentTotal = sumCategory('current-asset', true), nonCurrentTotal = sumCategory('non-current-asset', true);
  const assets = currentTotal + nonCurrentTotal, liabilityTotal = -sumCategory('liability', true) || 0, capitalTotal = -sumCategory('equity', true) || 0;
  // Unclosed cumulative P&L appears once in equity. Never add selected-period net profit again.
  const accumulatedEarnings = (-sumCategory('revenue', true) - sumCategory('cost', true) - sumCategory('expense', true)) || 0;
  const equity = capitalTotal + accumulatedEarnings, liabilitiesAndEquity = liabilityTotal + equity;
  return { kind, selection: { ...selection }, storeName: data.storeName, timezone: data.timezone, generatedAt, sourceUpdatedAt: data.updatedAt,
    journal: { days, debit, credit, balanced: debit === credit }, ledger,
    income: { sales, cost, grossProfit: sales - cost, expenses, totalExpenses, netProfit: sales - cost - totalExpenses },
    balance: { currentAssets: amounts('current-asset'), nonCurrentAssets: amounts('non-current-asset'), liabilities: amounts('liability', -1), capital: amounts('equity', -1), currentTotal, nonCurrentTotal, assets, liabilityTotal, capitalTotal, accumulatedEarnings, equity, liabilitiesAndEquity, balanced: assets === liabilitiesAndEquity },
    hasActivity: kind === 'balance-sheet' ? entries.some(entry => entry.date <= selection.to) : period.length > 0 };
}
