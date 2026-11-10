import { demoOwner } from './mock-auth';
import type { Customer } from '@/types/pos';
import type { QuickAddRecord } from '@/types/quick-add';
import type { ReceivablePayment } from '@/types/receivables';

const ownerId = demoOwner.id;
const names = ['Mang Ben', 'Aling Bebang', 'Jeremy', 'Mang Arthuro', 'Maya', 'Manang Fe'];
const customers: Customer[] = names.map((name, index) => ({ id: `ar-demo-customer-${index}`, name }));
const specs = [
  { customer: 0, amount: 120000, paid: 50000, due: '2026-10-25' },
  { customer: 1, amount: 85000, paid: 0, due: '2026-11-15' },
  { customer: 2, amount: 250000, paid: 0, due: '2026-11-26' },
  { customer: 0, amount: 100000, paid: 0, due: '2026-11-20' },
  { customer: 3, amount: 120000, paid: 50000, due: '2026-11-12' },
  { customer: 4, amount: 120000, paid: 120000, due: '2026-10-20' },
  { customer: 5, amount: 120000, paid: 120000, due: '2026-10-21' },
  { customer: 5, amount: 120000, paid: 120000, due: '2026-10-22' },
];
/** Fictional independent borrowings; totals and relative dates are derived by selectors. */
export const receivablesSeed: { customers: Customer[]; debts: QuickAddRecord[]; payments: ReceivablePayment[] } = {
  customers,
  debts: specs.map((spec, index) => ({ id: `ar-demo-debt-${index}`, ownerId, kind: 'customerDebt', customerId: customers[spec.customer].id, name: customers[spec.customer].name,
    originalAmountCentavos: spec.amount, amountCentavos: spec.amount - spec.paid, paidCentavos: spec.paid, dueDate: spec.due,
    occurredAt: `2026-10-${String(2 + index).padStart(2, '0')}T02:00:00Z`, borrowing: 'cash', paymentStatus: spec.paid === spec.amount ? 'paid' : spec.paid ? 'partial' : 'unpaid',
    category: null, expenseDate: null, details: '', items: {} })),
  payments: specs.flatMap((spec, index) => spec.paid ? [{ id: `ar-demo-payment-${index}`, ownerId, debtId: `ar-demo-debt-${index}`, amountCentavos: spec.paid, occurredAt: '2026-10-24T02:00:00Z' }] : []),
};
