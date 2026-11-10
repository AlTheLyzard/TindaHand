import { deductProductStock } from './inventory-stock';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import type { CustomerDebtCommand, ReceivablePayment, ReceivablePaymentCommand, ReceivableStatus } from '@/types/receivables';
import type { InventoryStore } from './inventory';
import type { PosProduct } from '@/types/pos';
import { quickAddErrors, quickAddTotal } from './quick-add';
import { stockConflicts } from './pos';
import { emptyPosLedger } from './pos-checkout';
import { parsePaymentAmount } from './pos-payment';

export function localCalendarDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function receivableBalance(debt: QuickAddRecord, payments: readonly ReceivablePayment[], today = localCalendarDate()) {
  const history = payments.filter(payment => payment.debtId === debt.id && payment.ownerId === debt.ownerId);
  const originalCentavos = debt.originalAmountCentavos ?? debt.amountCentavos;
  const paidCentavos = history.reduce((sum, payment) => sum + payment.amountCentavos, 0);
  const remainingCentavos = originalCentavos - paidCentavos;
  const status: ReceivableStatus = remainingCentavos === 0 ? 'paid' : debt.dueDate && debt.dueDate < today ? 'overdue' : paidCentavos > 0 ? 'partial' : 'pending';
  return { debt, originalCentavos, paidCentavos, remainingCentavos, status, history, progress: paidCentavos / originalCentavos * 100 };
}
export function receivableLists(debts: readonly QuickAddRecord[], payments: readonly ReceivablePayment[], query: string, today = localCalendarDate()) {
  const rows = debts.filter(debt => debt.kind === 'customerDebt').map(debt => receivableBalance(debt, payments, today));
  const open = rows.filter(row => row.remainingCentavos > 0);
  const matching = rows.filter(row => row.debt.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const paid = matching.filter(row => row.status === 'paid');
  return { overdue: matching.filter(row => row.status === 'overdue'), pending: matching.filter(row => row.status === 'pending'), partial: matching.filter(row => row.status === 'partial'), paid,
    outstandingCentavos: open.reduce((sum, row) => sum + row.remainingCentavos, 0), transactionCount: open.length,
    customerCount: new Set(open.map(row => row.debt.customerId)).size,
    paidCentavos: paid.reduce((sum, row) => sum + row.originalCentavos, 0) };
}
export function customerDebtErrors(draft: QuickAddDraft, products: readonly PosProduct[]) {
  const errors = quickAddErrors(draft);
  if (draft.borrowing === 'product' && (stockConflicts(draft.items, products).length || Object.entries(draft.items).some(([id, line]) => id !== line.productId || !line.itemName.trim()))) errors.items = 'Some products are unavailable or exceed current stock. Update your selection.';
  return errors;
}
export function receivablePaymentError(amount: string, balance: number) {
  const entered = parsePaymentAmount(amount);
  if (entered === null || entered <= 0) return 'Enter a positive amount with up to two decimal places.';
  if (entered > balance) return 'Payment cannot exceed the current outstanding balance.';
  return undefined;
}
/** Atomic inventory operation: no mutations until all validation succeeds. Typed names
 * create a new identity; only a selected customer ID links to an existing person. */
export function commitCustomerDebt(store: InventoryStore, command: CustomerDebtCommand): InventoryStore {
  const { id, ownerId, occurredAt, draft } = command;
  const ledger = store.pos ?? emptyPosLedger();
  if (!id || !ownerId || !Number.isFinite(Date.parse(occurredAt)) || ledger.debts.some(debt => debt.id === id && debt.ownerId === ownerId) || draft.kind !== 'customerDebt' || Object.keys(customerDebtErrors(draft, store.products)).length) return store;
  const selected = draft.customerId ? ledger.customers.find(customer => customer.id === draft.customerId) : undefined;
  if (draft.customerId && !selected) return store;
  const customer = selected ?? { id: `customer-${id}`, name: draft.name.trim().replace(/\s+/g, ' ') };
  const items = draft.borrowing === 'product' ? Object.fromEntries(Object.entries(draft.items).map(([key, line]) => [key, { ...line }])) : {};
  const originalAmountCentavos = quickAddTotal(draft);
  const debt: QuickAddRecord = { id, ownerId, kind: 'customerDebt', customerId: customer.id, name: customer.name, originalAmountCentavos, amountCentavos: originalAmountCentavos, paidCentavos: 0,
    dueDate: draft.dueDate, occurredAt, borrowing: draft.borrowing, items, details: draft.details.trim(), category: null, expenseDate: null, paymentStatus: 'unpaid' };
  return { ...store, products: store.products.map(product => items[product.id] ? deductProductStock(product, items[product.id].quantity) : product),
    pos: { ...ledger, customers: selected ? ledger.customers : [...ledger.customers, customer], debts: [debt, ...ledger.debts] } };
}
export function commitReceivablePayment(store: InventoryStore, command: ReceivablePaymentCommand): InventoryStore {
  const payments = store.receivablePayments ?? [];
  if (!command.id || !command.ownerId || !Number.isFinite(Date.parse(command.occurredAt)) || payments.some(payment => payment.id === command.id && payment.ownerId === command.ownerId)) return store;
  const debt = store.pos?.debts.find(row => row.id === command.debtId && row.ownerId === command.ownerId);
  if (!debt) return store;
  const balance = receivableBalance(debt, payments);
  if (receivablePaymentError(command.amount, balance.remainingCentavos)) return store;
  const amountCentavos = parsePaymentAmount(command.amount)!;
  const payment: ReceivablePayment = { id: command.id, ownerId: command.ownerId, debtId: debt.id, amountCentavos, occurredAt: command.occurredAt };
  const remainingCentavos = balance.remainingCentavos - amountCentavos;
  return { ...store, receivablePayments: [...payments, payment], pos: { ...store.pos!, debts: store.pos!.debts.map(row => row.id === debt.id && row.ownerId === debt.ownerId
    ? { ...row, originalAmountCentavos: balance.originalCentavos, amountCentavos: remainingCentavos, paidCentavos: balance.paidCentavos + amountCentavos, paymentStatus: remainingCentavos === 0 ? 'paid' : 'partial' } : row) } };
}
