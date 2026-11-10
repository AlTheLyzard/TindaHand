import { deductProductStock } from './inventory-stock';
import { customerSeed } from '../data/customers';
import type { CheckoutCommand, Customer, MockSale, PosLedger } from '@/types/pos';
import type { QuickAddRecord } from '@/types/quick-add';
import type { InventoryStore } from '@/utils/inventory';
import { selectionSummary, stockConflicts } from './pos';
import { paymentAmounts, paymentErrors } from './pos-payment';

export const customerNameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
export function emptyPosLedger(): PosLedger {
  return { customers: customerSeed.map(customer => ({ ...customer })), sales: [], debts: [] };
}

/** One immutable commit: rejection changes nothing, including customer creation. */
export function commitMockSale(state: InventoryStore, command: CheckoutCommand): InventoryStore {
  const { id, ownerId, occurredAt, selection, draft } = command;
  const ledger = state.pos ?? emptyPosLedger();
  if (!id || !ownerId || !Number.isFinite(Date.parse(occurredAt)) || ledger.sales.some(sale => sale.id === id)) return state;
  const entries = Object.entries(selection);
  if (!entries.length || entries.some(([key, line]) => key !== line.productId || !line.itemName.trim()
    || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || !Number.isSafeInteger(line.unitPriceCentavos) || line.unitPriceCentavos < 0)) return state;
  const { totalCentavos } = selectionSummary(selection);
  const errors = paymentErrors(totalCentavos, draft);
  if (Object.values(errors).some(Boolean) || stockConflicts(selection, state.products).length) return state;
  if (!['cash', 'gcash', 'split', 'partial'].includes(draft.method) || (draft.method === 'partial' && !['cash', 'gcash'].includes(draft.partialMethod ?? ''))) return state;
  const a = paymentAmounts(totalCentavos, draft);
  let customer: Customer | undefined;
  if (draft.method === 'partial') {
    customer = draft.customerId ? ledger.customers.find(item => item.id === draft.customerId)
      : ledger.customers.find(item => customerNameKey(item.name) === customerNameKey(draft.customerName));
    if (draft.customerId && !customer) return state;
    customer ??= { id: `customer-${id}`, name: draft.customerName.trim().replace(/\s+/g, ' ') };
  }
  const items = Object.fromEntries(entries.map(([key, line]) => [key, { ...line }]));
  const payment: MockSale['payment'] = {
    id: `payment-${id}`, saleId: id, method: draft.method, recording: 'manual',
    tenders: [
      ...(a.cashRaw === null ? [] : [{ method: 'cash' as const, receivedCentavos: a.cash!, reference: null }]),
      ...(a.gcashRaw === null ? [] : [{ method: 'gcash' as const, receivedCentavos: a.gcash!, reference: a.reference.trim() || null }]),
    ],
    receivedCentavos: a.paidCentavos, appliedCentavos: Math.min(totalCentavos, a.paidCentavos),
    cashChangeCentavos: a.changeCentavos,
  };
  const sale: MockSale = { id, ownerId, occurredAt, customerId: customer?.id ?? null, items,
    totalCentavos, remainingCentavos: a.remainingCentavos,
    paymentStatus: a.remainingCentavos === 0 ? 'paid' : a.paidCentavos === 0 ? 'unpaid' : 'partial', payment };
  const debt: QuickAddRecord | null = customer && a.remainingCentavos > 0 ? {
    id: `debt-${id}`, ownerId, kind: 'customerDebt', name: customer.name, customerId: customer.id, saleId: id,
    amountCentavos: a.remainingCentavos, originalAmountCentavos: totalCentavos, paidCentavos: a.paidCentavos,
    category: null, details: `POS sale ${id}`, expenseDate: null, dueDate: null, borrowing: 'product',
    items: Object.fromEntries(entries.map(([key, line]) => [key, { ...line }])),
    paymentStatus: a.paidCentavos ? 'partial' : 'unpaid', occurredAt,
  } : null;
  return { ...state,
    receivablePayments: debt && a.paidCentavos > 0 ? [...(state.receivablePayments ?? []), {
      id: `initial-payment-${id}`, ownerId, debtId: debt.id, amountCentavos: a.paidCentavos, occurredAt,
      ...(a.gcashRaw !== null && a.reference.trim() ? { reference: a.reference.trim() } : {}),
    }] : state.receivablePayments,
    products: state.products.map(product => selection[product.id] ? deductProductStock(product, selection[product.id].quantity) : product),
    pos: { customers: customer && !ledger.customers.some(item => item.id === customer.id) ? [...ledger.customers, customer] : ledger.customers,
      sales: [sale, ...ledger.sales], debts: debt ? [debt, ...ledger.debts] : ledger.debts },
  };
}
