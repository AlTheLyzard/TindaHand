import { quickAddPolicy } from '@/config/quick-add';
import { expenseCategories } from '@/data/quick-add';
import type { QuickAddDraft, QuickAddKind, QuickAddRecord } from '@/types/quick-add';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { selectionSummary } from '@/utils/pos';
import { validCalendarDate } from '@/utils/date';

export function addCalendarDays(today: string, days: number) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function emptyQuickAddDraft(kind: QuickAddKind, today: string): QuickAddDraft {
  const days = kind === 'customerDebt' ? 30 : kind === 'storeDebt' ? quickAddPolicy.storeDebtDueDays : null;
  return { kind, borrowing: 'cash', name: '', amount: '', category: '', details: '', expenseDate: today, dueDate: days === null ? '' : addCalendarDays(today, days), items: {}, assetClassification: '', assetLife: '' };
}
export function quickAddTotal(draft: QuickAddDraft) {
  return draft.kind === 'customerDebt' && draft.borrowing === 'product' ? selectionSummary(draft.items).totalCentavos : parsePaymentAmount(draft.amount) ?? 0;
}
export function quickAddErrors(draft: QuickAddDraft) {
  const errors: Partial<Record<keyof QuickAddDraft, string>> = {};
  if (draft.kind === 'asset') {
    if (!draft.name.trim()) errors.name = 'Enter an asset name.';
    if (!['current', 'equipment', 'furniture'].includes(draft.assetClassification)) errors.assetClassification = 'Select an asset classification.';
    if (draft.assetClassification !== 'current') {
      const life = Number(draft.assetLife);
      if (!/^\d+$/.test(draft.assetLife) || life < 1 || life > 100) errors.assetLife = 'Enter a whole useful life from 1 to 100 years.';
    }
    const total = quickAddTotal(draft);
    if (!Number.isSafeInteger(total) || total <= 0) errors.amount = 'Enter a positive value with up to two decimal places.';
    if (!validCalendarDate(draft.expenseDate)) errors.expenseDate = 'Enter a valid recorded date as YYYY-MM-DD.';
    return errors;
  }
  if (draft.kind !== 'expense' && !draft.name.trim()) errors.name = 'Enter a name or other identifying details.';
  if (draft.kind === 'expense' && !expenseCategories.some(category => category === draft.category)) errors.category = 'Select an expense category.';
  if (draft.kind === 'expense') {
    if (!validCalendarDate(draft.expenseDate)) errors.expenseDate = 'Enter a valid expense date as YYYY-MM-DD.';
  }
  const total = quickAddTotal(draft);
  const product = draft.kind === 'customerDebt' && draft.borrowing === 'product';
  if (!Number.isSafeInteger(total) || total <= 0) errors[product ? 'items' : 'amount'] = product ? 'Select products with a positive total.' : 'Enter a positive amount with up to two decimal places.';
  if (product && Object.values(draft.items).some(item => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || !Number.isSafeInteger(item.unitPriceCentavos) || item.unitPriceCentavos < 0)) errors.items = 'Check product quantities and prices.';
  if (draft.kind !== 'expense' && (draft.dueDate || draft.kind === 'customerDebt')) {
    const date = new Date(`${draft.dueDate}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== draft.dueDate) errors.dueDate = 'Enter a valid date as YYYY-MM-DD.';
  }
  return errors;
}
export function hasQuickAddChanges(draft: QuickAddDraft, baseline: QuickAddDraft) {
  return JSON.stringify(draft) !== JSON.stringify(baseline);
}
export function summarizeQuickAdd(records: readonly QuickAddRecord[]) {
  return records.reduce((totals, record) => ({ ...totals, [record.kind]: (totals[record.kind as keyof typeof totals] ?? 0) + record.amountCentavos }), { customerDebt: 0, storeDebt: 0, expense: 0, asset: 0 });
}
