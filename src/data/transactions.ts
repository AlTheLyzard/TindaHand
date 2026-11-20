import { dashboardDemo } from './dashboard';
import { demoOwner } from './mock-auth';
import type { TransactionRecord } from '@/types/transactions';

/** Keep every Dashboard Recent Activity fixture visible in transaction history. */
const recentActivityTransactions: readonly TransactionRecord[] = dashboardDemo.activity.map(event => ({
  id: `activity:${event.id}`, sourceId: event.id, ownerId: demoOwner.id,
  transactionNumber: event.id, type: event.kind === 'sale' ? 'sale' : 'customerPayment',
  occurredAt: event.occurredAt, description: event.kind === 'sale' ? `POS Sale #${event.id.replace('demo-activity-', '')}` : 'Customer Payment',
  partyName: null, paymentMethod: null, amountCentavos: event.amountCentavos, direction: event.direction,
}));

/** Extra fictional Demo Owner rows make pagination and every history filter easy to inspect. */
const paginationDemoTransactions: readonly TransactionRecord[] = [
  { id: 'fixture:expense-electricity', sourceId: 'fixture-expense-electricity', ownerId: demoOwner.id, transactionNumber: 'DEMO-004', type: 'expense', occurredAt: '2026-10-09T15:42:00+08:00', description: 'Store Expense — Electricity', partyName: 'Electricity Provider', paymentMethod: null, amountCentavos: 84500, direction: 'out' },
  { id: 'fixture:sale-004', sourceId: 'fixture-sale-004', ownerId: demoOwner.id, transactionNumber: 'DEMO-005', type: 'sale', occurredAt: '2026-10-09T13:18:00+08:00', description: 'POS Sale #DEMO-005', partyName: null, paymentMethod: 'cash', amountCentavos: 12750, direction: 'in' },
  { id: 'fixture:payment-001', sourceId: 'fixture-payment-001', ownerId: demoOwner.id, transactionNumber: 'DEMO-006', type: 'customerPayment', occurredAt: '2026-10-09T10:05:00+08:00', description: 'Customer Payment', partyName: 'Lina Santos', paymentMethod: 'gcash', amountCentavos: 18000, direction: 'in' },
  { id: 'fixture:sale-005', sourceId: 'fixture-sale-005', ownerId: demoOwner.id, transactionNumber: 'DEMO-007', type: 'sale', occurredAt: '2026-10-08T17:30:00+08:00', description: 'POS Sale #DEMO-007', partyName: null, paymentMethod: 'split', amountCentavos: 23600, direction: 'in' },
  { id: 'fixture:expense-water', sourceId: 'fixture-expense-water', ownerId: demoOwner.id, transactionNumber: 'DEMO-008', type: 'expense', occurredAt: '2026-10-08T14:10:00+08:00', description: 'Store Expense — Water', partyName: 'Water Utility', paymentMethod: null, amountCentavos: 32200, direction: 'out' },
  { id: 'fixture:payment-002', sourceId: 'fixture-payment-002', ownerId: demoOwner.id, transactionNumber: 'DEMO-009', type: 'customerPayment', occurredAt: '2026-10-08T09:25:00+08:00', description: 'Customer Payment', partyName: 'Marco Reyes', paymentMethod: 'cash', amountCentavos: 9500, direction: 'in' },
  { id: 'fixture:sale-006', sourceId: 'fixture-sale-006', ownerId: demoOwner.id, transactionNumber: 'DEMO-010', type: 'sale', occurredAt: '2026-10-07T16:45:00+08:00', description: 'POS Sale #DEMO-010', partyName: null, paymentMethod: 'gcash', amountCentavos: 32400, direction: 'in' },
  { id: 'fixture:payment-003', sourceId: 'fixture-payment-003', ownerId: demoOwner.id, transactionNumber: 'DEMO-011', type: 'customerPayment', occurredAt: '2026-10-07T11:12:00+08:00', description: 'Customer Payment', partyName: 'Ana Dela Cruz', paymentMethod: 'gcash', amountCentavos: 4200, direction: 'in' },
  { id: 'fixture:expense-supplies', sourceId: 'fixture-expense-supplies', ownerId: demoOwner.id, transactionNumber: 'DEMO-012', type: 'expense', occurredAt: '2026-10-06T08:50:00+08:00', description: 'Store Expense — Store Supplies', partyName: 'Local Supplier', paymentMethod: null, amountCentavos: 15600, direction: 'out' },
  { id: 'fixture:sale-007', sourceId: 'fixture-sale-007', ownerId: demoOwner.id, transactionNumber: 'DEMO-013', type: 'sale', occurredAt: '2026-10-05T18:35:00+08:00', description: 'POS Sale #DEMO-013', partyName: null, paymentMethod: 'cash', amountCentavos: 18900, direction: 'in' },
  { id: 'fixture:payment-004', sourceId: 'fixture-payment-004', ownerId: demoOwner.id, transactionNumber: 'DEMO-014', type: 'customerPayment', occurredAt: '2026-10-05T14:20:00+08:00', description: 'Customer Payment', partyName: 'Ramon Cruz', paymentMethod: 'gcash', amountCentavos: 12500, direction: 'in' },
  { id: 'fixture:expense-rent', sourceId: 'fixture-expense-rent', ownerId: demoOwner.id, transactionNumber: 'DEMO-015', type: 'expense', occurredAt: '2026-10-04T12:10:00+08:00', description: 'Store Expense — Stall Rent', partyName: 'Market Admin', paymentMethod: null, amountCentavos: 250000, direction: 'out' },
  { id: 'fixture:customer-debt-001', sourceId: 'fixture-customer-debt-001', ownerId: demoOwner.id, transactionNumber: 'DEMO-016', type: 'customerDebt', occurredAt: '2026-10-04T09:45:00+08:00', description: 'Customer Debt', partyName: 'Mila Reyes', paymentMethod: null, amountCentavos: 6400, direction: 'out', debtId: 'fixture:customer-debt-001' },
  { id: 'fixture:store-debt-001', sourceId: 'fixture-store-debt-001', ownerId: demoOwner.id, transactionNumber: 'DEMO-017', type: 'storeDebt', occurredAt: '2026-10-03T16:00:00+08:00', description: 'Store Debt', partyName: 'Northside Wholesale', paymentMethod: null, amountCentavos: 87500, direction: 'neutral', debtId: 'fixture:store-debt-001' },
  { id: 'fixture:supplier-payment-001', sourceId: 'fixture-supplier-payment-001', ownerId: demoOwner.id, transactionNumber: 'DEMO-018', type: 'supplierPayment', occurredAt: '2026-10-03T10:30:00+08:00', description: 'Supplier Payment', partyName: 'Northside Wholesale', paymentMethod: null, amountCentavos: 30000, direction: 'out', debtId: 'fixture:store-debt-001' },
  { id: 'fixture:sale-008', sourceId: 'fixture-sale-008', ownerId: demoOwner.id, transactionNumber: 'DEMO-019', type: 'sale', occurredAt: '2026-10-02T17:25:00+08:00', description: 'POS Sale #DEMO-019', partyName: null, paymentMethod: 'split', amountCentavos: 41200, direction: 'in' },
  { id: 'fixture:payment-005', sourceId: 'fixture-payment-005', ownerId: demoOwner.id, transactionNumber: 'DEMO-020', type: 'customerPayment', occurredAt: '2026-10-02T11:40:00+08:00', description: 'Customer Payment', partyName: 'Nora Bautista', paymentMethod: 'cash', amountCentavos: 7200, direction: 'in' },
  { id: 'fixture:expense-delivery', sourceId: 'fixture-expense-delivery', ownerId: demoOwner.id, transactionNumber: 'DEMO-021', type: 'expense', occurredAt: '2026-10-01T15:05:00+08:00', description: 'Store Expense — Delivery', partyName: 'Delivery Service', paymentMethod: null, amountCentavos: 4600, direction: 'out' },
  { id: 'fixture:customer-debt-002', sourceId: 'fixture-customer-debt-002', ownerId: demoOwner.id, transactionNumber: 'DEMO-022', type: 'customerDebt', occurredAt: '2026-09-30T13:50:00+08:00', description: 'Customer Debt', partyName: 'Joel Mendoza', paymentMethod: null, amountCentavos: 15300, direction: 'neutral', debtId: 'fixture:customer-debt-002' },
  { id: 'fixture:store-debt-002', sourceId: 'fixture-store-debt-002', ownerId: demoOwner.id, transactionNumber: 'DEMO-023', type: 'storeDebt', occurredAt: '2026-09-29T09:15:00+08:00', description: 'Store Debt', partyName: 'Valley Grocer Supply', paymentMethod: null, amountCentavos: 104000, direction: 'neutral', debtId: 'fixture:store-debt-002' },
  { id: 'fixture:supplier-payment-002', sourceId: 'fixture-supplier-payment-002', ownerId: demoOwner.id, transactionNumber: 'DEMO-024', type: 'supplierPayment', occurredAt: '2026-09-28T16:40:00+08:00', description: 'Supplier Payment', partyName: 'Valley Grocer Supply', paymentMethod: null, amountCentavos: 25000, direction: 'out', debtId: 'fixture:store-debt-002' },
];

// TODO(backend): Replace demo transaction rows with canonical store transaction events.
// - Method/Action: GET / Fetch transaction history
// - Expected Input/Payload: Authenticated session, page, limit, search, category, date range, and payment method
// - Expected Response: { items: TransactionRecord[]; total: number }
// - UI State to Wire: Replace local projection and drive pagination, filters, loading, and errors from the response
export const transactionSeed: readonly TransactionRecord[] = [...recentActivityTransactions, ...paginationDemoTransactions];

export const transactionCategories = [
  { value: 'all', label: 'All' }, { value: 'sale', label: 'Sales' },
  { value: 'customerPayment', label: 'Customer Payments' }, { value: 'expense', label: 'Expenses' },
  { value: 'customerDebt', label: 'Customer Debts' }, { value: 'storeDebt', label: 'Store Debts' },
  { value: 'supplierPayment', label: 'Supplier Payments' },
] as const;
export const operatorTransactionCategories = transactionCategories.filter(item =>
  item.value === 'all' || item.value === 'sale' || item.value === 'customerPayment' || item.value === 'customerDebt');
export const transactionMethods = [
  { value: 'all', label: 'All' }, { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' }, { value: 'split', label: 'Split' },
] as const;
