import type { expenseCategories } from '@/data/quick-add';
import type { QuickAddRecord } from './quick-add';

export type ExpenseCategory = typeof expenseCategories[number];
export type ExpenseFilter = 'all' | ExpenseCategory;
// TODO(backend): Verify the expense record shape against the approved expense API schema.
// - Method/Action: GET / Read expenses; POST / Create expense
// - Expected Input/Payload: QuickAddDraft with expense kind, category, amount, details, and expenseDate
// - Expected Response: ExpenseRecord with stable ID, integer-centavo amount, and canonical timestamps
// - UI State to Wire: Map returned records and field errors into expense list/form state
export type ExpenseRecord = QuickAddRecord & { kind: 'expense'; expenseDate: string };
