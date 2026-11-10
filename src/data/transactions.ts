import { dashboardDemo } from './dashboard';
import { demoOwner } from './mock-auth';
import type { TransactionRecord } from '@/types/transactions';

/** Reuse the Dashboard's historical events. Its aggregate sale lines are not
 * additional checkout events and carry no reliable payment/customer metadata. */
export const transactionSeed: readonly TransactionRecord[] = dashboardDemo.activity.map(event => ({
  id: `activity:${event.id}`, sourceId: event.id, ownerId: demoOwner.id,
  transactionNumber: event.id, type: event.kind === 'sale' ? 'sale' : 'customerPayment',
  occurredAt: event.occurredAt, description: event.kind === 'sale' ? `POS Sale #${event.id.replace('demo-activity-', '')}` : 'Customer Payment',
  partyName: null, paymentMethod: null, amountCentavos: event.amountCentavos, direction: event.direction,
}));

export const transactionCategories = [
  { value: 'all', label: 'All' }, { value: 'sale', label: 'Sales' },
  { value: 'customerPayment', label: 'Customer Payments' }, { value: 'expense', label: 'Expenses' },
] as const;
export const transactionMethods = [
  { value: 'all', label: 'All' }, { value: 'cash', label: 'Cash' },
  { value: 'gcash', label: 'GCash' }, { value: 'split', label: 'Split' },
] as const;
