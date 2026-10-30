import { demoOwner } from './mock-auth';
import type { ExpenseRecord } from '@/types/expenses';

/** Fictional records for the demo owner only; amounts and dates match the card contents. */
export const expenseSeed: readonly ExpenseRecord[] = [
  { id: 'demo-expense-electricity', ownerId: demoOwner.id, kind: 'expense', name: 'Electricity Expense', category: 'Electricity Expense', amountCentavos: 185000, details: 'Meralco electricity for September', expenseDate: '2026-10-08', occurredAt: '2026-10-08T02:00:00Z', dueDate: null, borrowing: null, items: {}, paymentStatus: null },
  { id: 'demo-expense-water', ownerId: demoOwner.id, kind: 'expense', name: 'Water Expense', category: 'Water Expense', amountCentavos: 35000, details: 'Manila Water bill', expenseDate: '2026-10-10', occurredAt: '2026-10-10T02:00:00Z', dueDate: null, borrowing: null, items: {}, paymentStatus: null },
  { id: 'demo-expense-packaging', ownerId: demoOwner.id, kind: 'expense', name: 'Others Expense', category: 'Others Expense', amountCentavos: 25000, details: 'Carry bags and plastic packaging', expenseDate: '2026-10-11', occurredAt: '2026-10-11T02:00:00Z', dueDate: null, borrowing: null, items: {}, paymentStatus: null },
];
