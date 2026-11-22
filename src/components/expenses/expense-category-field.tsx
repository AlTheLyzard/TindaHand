import type { Ref } from 'react';
import type { ViewInstance } from 'react-native';
import { DropdownField } from '@/components/ui/dropdown-field';
import { expenseCategories } from '@/data/quick-add';
import { expenseCategoryLabel } from '@/utils/expenses';

export function ExpenseCategoryField({ value, onChange, error, open, onOpenChange, triggerRef }: {
  value: string; onChange: (value: string) => void; error?: string;
  open: boolean; onOpenChange: (open: boolean) => void; triggerRef?: Ref<ViewInstance>;
}) {
  return <DropdownField
    label="Select expense category"
    value={value}
    options={expenseCategories.map(category => ({ value: category, label: expenseCategoryLabel(category) }))}
    onChange={onChange}
    placeholder="e.g. Electricity"
    required={false}
    error={error}
    open={open}
    onOpenChange={onOpenChange}
    triggerRef={triggerRef}
    menuTestID="expense-category-dropdown"
  />;
}
