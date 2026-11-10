import type { Customer, MockSale } from '@/types/pos';
import type { QuickAddRecord } from '@/types/quick-add';
import type { ReceivablePayment } from '@/types/receivables';
import type { TransactionCategory, TransactionFilters, TransactionRecord } from '@/types/transactions';
import { validCalendarDate } from './date';

export const emptyTransactionFilters = (): TransactionFilters => ({ from: '', to: '', paymentMethod: 'all' });
export function transactionFilterError(filters: TransactionFilters) {
  if ((filters.from && !validCalendarDate(filters.from)) || (filters.to && !validCalendarDate(filters.to))) return 'Enter a valid date as YYYY-MM-DD.';
  if (filters.from && filters.to && filters.to < filters.from) return 'End date must be on or after start date.';
  return null;
}
/** Explicit store timezone, independent of device locale/timezone. */
export function transactionDateKey(timestamp: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(timestamp));
  const part = (key: string) => parts.find(value => value.type === key)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function transactionMetadata(record: TransactionRecord) {
  const date = new Date(record.occurredAt);
  const day = date.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'short', day: '2-digit' });
  const time = date.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  const method = record.paymentMethod === 'gcash' ? 'GCash' : record.paymentMethod === 'cash' ? 'Cash' : record.paymentMethod === 'split' ? 'Split' : 'Method not recorded';
  return `${day}, ${time} • ${method}`;
}
/** Format integer parts directly: no floating-point money arithmetic. */
export function transactionAmount(record: Pick<TransactionRecord, 'amountCentavos' | 'direction'>) {
  const whole = Math.floor(record.amountCentavos / 100).toLocaleString('en-PH');
  const fraction = String(record.amountCentavos % 100).padStart(2, '0');
  return `${record.direction === 'neutral' || record.amountCentavos === 0 ? '' : record.direction === 'in' ? '+' : '−'}₱${whole}.${fraction}`;
}
export function filterTransactions(records: readonly TransactionRecord[], query: string, category: TransactionCategory, filters: TransactionFilters) {
  const search = query.trim().toLowerCase();
  return records.filter(record => {
    const day = transactionDateKey(record.occurredAt);
    return (category === 'all' || record.type === category)
      && (filters.paymentMethod === 'all' || record.paymentMethod === filters.paymentMethod)
      && (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to)
      && (!search || [record.transactionNumber, record.partyName, record.description].some(value => value?.toLowerCase().includes(search)));
  }).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export type TransactionSources = {
  sales: readonly MockSale[]; customers: readonly Customer[];
  records: readonly QuickAddRecord[]; payments: readonly ReceivablePayment[];
};
/** POS mirrors its initial partial receipt into AR to calculate debt balances.
 * That mirror is the sale's receipt, not a later customer payment. */
export function isInitialSaleReceipt(payment: ReceivablePayment, debts: readonly QuickAddRecord[], sales: readonly MockSale[]) {
  const debt = debts.find(row => row.ownerId === payment.ownerId && row.id === payment.debtId);
  return !!debt?.saleId && payment.id === `initial-payment-${debt.saleId}`
    && sales.some(sale => sale.ownerId === payment.ownerId && sale.id === debt.saleId);
}
/** Each source event has one namespaced identity. Debt creation and supplier
 * payments are not sales, collections, or expenses; never relabel them as such. */
export function projectTransactions(ownerId: string, sources: TransactionSources, seed: readonly TransactionRecord[] = []) {
  const rows: TransactionRecord[] = [...seed.filter(row => row.ownerId === ownerId)];
  for (const sale of sources.sales.filter(row => row.ownerId === ownerId)) {
    const debt = sources.records.find(row => row.ownerId === ownerId && row.saleId === sale.id);
    // Applied money is net of cash change. Partial sales display only money received.
    const received = sale.payment.appliedCentavos;
    const methods = [...new Set(sale.payment.tenders.filter(tender => tender.receivedCentavos > 0).map(tender => tender.method))];
    rows.push({ id: `sale:${sale.id}`, sourceId: sale.id, ownerId, transactionNumber: sale.id,
      type: 'sale', occurredAt: sale.occurredAt, description: `POS Sale #${sale.id}`,
      partyName: sources.customers.find(row => row.id === sale.customerId)?.name ?? debt?.name ?? null,
      paymentMethod: methods.length > 1 ? 'split' : methods[0] ?? null,
      amountCentavos: received, direction: received > 0 ? 'in' : 'neutral', saleId: sale.id, debtId: debt?.id,
      saleTotalCentavos: sale.totalCentavos, amountReceivedCentavos: received, outstandingCentavos: sale.remainingCentavos });
  }
  for (const payment of sources.payments.filter(row => row.ownerId === ownerId)) {
    if (isInitialSaleReceipt(payment, sources.records, sources.sales)) continue;
    const debt = sources.records.find(row => row.ownerId === ownerId && row.kind === 'customerDebt' && row.id === payment.debtId);
    rows.push({ id: `collection:${payment.id}`, sourceId: payment.id, ownerId, transactionNumber: payment.id,
      type: 'customerPayment', occurredAt: payment.occurredAt, description: 'Customer Payment',
      partyName: debt?.name ?? null, paymentMethod: null, amountCentavos: payment.amountCentavos,
      direction: 'in', debtId: payment.debtId, saleId: debt?.saleId });
  }
  for (const expense of sources.records.filter(row => row.ownerId === ownerId && row.kind === 'expense')) {
    rows.push({ id: `expense:${expense.id}`, sourceId: expense.id, ownerId, transactionNumber: expense.id,
      type: 'expense', occurredAt: expense.occurredAt, description: `Store Expense — ${expense.details || expense.name}`,
      partyName: expense.name || null, paymentMethod: null, amountCentavos: expense.amountCentavos, direction: 'out' });
  }
  return [...new Map(rows.map(row => [row.id, row])).values()];
}
