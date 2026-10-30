import type { ExpenseFilter, ExpenseRecord } from '@/types/expenses';
import type { QuickAddRecord } from '@/types/quick-add';
import { formatPesos } from './dashboard';
import { formatCalendarDate } from './date';

export function expenseCategoryLabel(category: string | null) {
  return category?.replace(/ Expense$/, '') || 'Others';
}

/** UTC is explicit: a calendar date must never shift with the viewing device's timezone. */
export function formatExpenseDate(date: string) {
  return formatCalendarDate(date);
}

export function expenseRecords(records: readonly QuickAddRecord[]): ExpenseRecord[] {
  return records.filter((record): record is ExpenseRecord => record.kind === 'expense' && !!record.expenseDate);
}

export function monthlyExpenses(records: readonly ExpenseRecord[], today: string) {
  const month = today.slice(0, 7);
  return records.reduce((total, record) => total + (record.expenseDate.slice(0, 7) === month ? record.amountCentavos : 0), 0);
}

export function filterExpenses(records: readonly ExpenseRecord[], query: string, category: ExpenseFilter) {
  const terms = query.trim().toLocaleLowerCase('en').split(/\s+/).filter(Boolean);
  return records.filter(record => {
    if (category !== 'all' && record.category !== category) return false;
    const text = [record.name, record.category, record.details, record.expenseDate, formatExpenseDate(record.expenseDate), formatPesos(record.amountCentavos), (record.amountCentavos / 100).toFixed(2)].join(' ').toLocaleLowerCase('en');
    return terms.every(term => text.includes(term));
  });
}
