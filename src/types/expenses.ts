import type { expenseCategories } from '@/data/quick-add';
import type { QuickAddRecord } from './quick-add';

export type ExpenseCategory = typeof expenseCategories[number];
export type ExpenseFilter = 'all' | ExpenseCategory;
export type ExpenseRecord = QuickAddRecord & { kind: 'expense'; expenseDate: string };
