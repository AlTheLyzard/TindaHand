import type { PayableDebt, PayablePayment, PayablesLedger, PayableStatus } from '@/types/payables';
import type { QuickAddRecord } from '@/types/quick-add';
import { formatCalendarDate } from '@/utils/date';
import { parsePaymentAmount } from '@/utils/pos-payment';

export function payableBalance(debt: PayableDebt, payments: readonly PayablePayment[]) {
  const history = payments.filter(payment => payment.debtId === debt.id && payment.ownerId === debt.ownerId);
  const paidCentavos = history.reduce((sum, payment) => sum + payment.amountCentavos, 0);
  const remainingCentavos = debt.originalAmountCentavos - paidCentavos;
  const status: PayableStatus = remainingCentavos === 0 ? 'paid' : paidCentavos === 0 ? 'pending' : 'partial';
  return { paidCentavos, remainingCentavos, status, progress: paidCentavos / debt.originalAmountCentavos * 100, history };
}

export function payableLists(ledger: PayablesLedger, query: string) {
  const rows = ledger.debts.map(debt => ({ debt, ...payableBalance(debt, ledger.payments) }));
  const open = rows.filter(row => row.remainingCentavos > 0);
  const matching = rows.filter(row => row.debt.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const paid = matching.filter(row => row.status === 'paid');
  return {
    pending: matching.filter(row => row.status === 'pending'),
    partial: matching.filter(row => row.status === 'partial'), paid,
    outstandingCentavos: open.reduce((sum, row) => sum + row.remainingCentavos, 0),
    creditorCount: new Set(open.map(row => row.debt.creditorId)).size,
    paidCentavos: paid.reduce((sum, row) => sum + row.debt.originalAmountCentavos, 0),
  };
}

export function payablePaymentError(amount: string, outstanding: number) {
  const centavos = parsePaymentAmount(amount);
  if (centavos === null || centavos <= 0) return 'Enter a positive amount with up to two decimal places.';
  if (centavos > outstanding) return 'Payment cannot exceed the current outstanding balance.';
  return undefined;
}

/** Empty input starts at zero; malformed input must be corrected before adding. */
export function addPayableShortcut(amount: string, increment: number, outstanding: number) {
  const current = amount.trim() ? parsePaymentAmount(amount) : 0;
  if (current === null || !Number.isSafeInteger(increment) || increment <= 0) return null;
  const next = current + increment;
  return Number.isSafeInteger(next) && next <= outstanding ? payableAmountInput(next) : null;
}

export function payableAmountInput(centavos: number) {
  return `${Math.floor(centavos / 100)}.${String(centavos % 100).padStart(2, '0')}`;
}

export function payableDueLabel(dueDate: string | null, today: string) {
  if (!dueDate) return 'No due date';
  const days = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  const relative = days === 0 ? 'Due today' : days < 0 ? `${-days} ${days === -1 ? 'day' : 'days'} overdue` : `${days} ${days === 1 ? 'day' : 'days'} left`;
  return `Due: ${formatCalendarDate(dueDate)} · ${relative}`;
}

export function payableAsQuickAdd(debt: PayableDebt, payments: readonly PayablePayment[]): QuickAddRecord {
  const balance = payableBalance(debt, payments);
  return { ...debt, kind: 'storeDebt', amountCentavos: balance.remainingCentavos,
    paidCentavos: balance.paidCentavos, paymentStatus: balance.status === 'pending' ? 'unpaid' : balance.status,
    category: null, expenseDate: null, borrowing: null, items: {} };
}
