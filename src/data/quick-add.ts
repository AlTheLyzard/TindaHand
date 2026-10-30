import type { QuickAddRecord } from '@/types/quick-add';
import { expenseSeed } from './expenses';

/** Categories visible in Quick Add 5. Custom categories await requirements approval. */
export const expenseCategories = ['Electricity Expense', 'Water Expense', 'Others Expense'] as const;
export const quickAddSeed: readonly QuickAddRecord[] = expenseSeed;
