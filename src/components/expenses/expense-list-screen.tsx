import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { InventoryFrame, InvField } from '@/components/inventory/inventory-ui';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { PosChip } from '@/components/pos/pos-chip';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/content-state';
import { expenseCategories } from '@/data/quick-add';
import { usePushOnce } from '@/hooks/use-push-once';
import { useQuickAdd } from '@/state/quick-add';
import type { ExpenseFilter } from '@/types/expenses';
import { expenseCategoryLabel, expenseRecords, filterExpenses, formatExpenseDate, monthlyExpenses } from '@/utils/expenses';
import { formatPesos } from '@/utils/dashboard';
import { todayInManila } from '@/utils/inventory';

export function ExpenseListScreen() {
  const { records, expenseFeedback, dismissExpenseFeedback } = useQuickAdd();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExpenseFilter>('all');
  const [today, setToday] = useState(todayInManila);
  const scroll = useRef<ScrollViewInstance>(null);
  const push = usePushOnce();
  const allExpenses = expenseRecords(records);
  const expenses = filterExpenses(allExpenses, query, category);
  const newRecord = () => push('/owner-menu/store-expenses/new');
  const feedbackId = expenseFeedback?.recordId;
  useFocusEffect(useCallback(() => {
    setToday(todayInManila());
    // A saved record is immediately visible even when the retained list had active filters.
    if (feedbackId) { setQuery(''); setCategory('all'); scroll.current?.scrollTo({ y: 0, animated: false }); }
    const refresh = setInterval(() => setToday(todayInManila()), 60000);
    return () => clearInterval(refresh);
  }, [feedbackId]));
  return <InventoryFrame title="Store Expenses" back inlineTitle scrollRef={scroll} hideNavigationWithKeyboard
    onBack={() => router.canGoBack() ? router.back() : router.replace('/owner-dashboard')}>
    <View className="relative">
      <InvField label="Search expenses" accessibilityLabel="Search expenses" value={query} onChangeText={setQuery} placeholder="Search expenses…" returnKeyType="search" />
      <View pointerEvents="none" className="absolute right-3 top-8"><PosIcon name="search" size={20} /></View>
    </View>
    <View testID="expense-month-summary" className="gap-2 rounded-control border border-[#B0C8E3] bg-[#D1E1F5] p-4">
      <Text className="font-poppins-bold text-[12px] leading-[18px] text-brand">Total expenses this month</Text>
      <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[30px] leading-[45px] text-brand">{formatPesos(monthlyExpenses(allExpenses, today))}</Text>
    </View>
    {expenseFeedback && <RegistrationToast expiresAt={expenseFeedback.expiresAt} onDismiss={dismissExpenseFeedback} title="Expense recorded" message="Your expense has been saved successfully." />}
    <Button onPress={newRecord}>+ New Record</Button>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      <PosChip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
      {expenseCategories.map(value => <PosChip key={value} label={expenseCategoryLabel(value)} selected={category === value} onPress={() => setCategory(value)} />)}
    </ScrollView>
    {allExpenses.length === 0 ? <EmptyState icon="expense" title="No expenses yet" description="Record your first store expense to start tracking your spending." action="+ New Record" onAction={newRecord} /> : expenses.length === 0 ?
      <EmptyState icon="search" title={query.trim() ? 'No expenses found' : 'No expenses in this category'} description="Try a different search or category to find your expenses." action="Clear search and filters" onAction={() => { setQuery(''); setCategory('all'); }} /> :
      expenses.map(record => <View key={record.id} testID="expense-card" className="gap-2 rounded-control border border-[#B0C8E3] bg-white p-4">
        <Text accessibilityRole="header" className="font-poppins-bold text-[18px] leading-[27px] text-[#102342]">{expenseCategoryLabel(record.category)}</Text>
        <View className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="font-poppins-bold text-[16px] leading-6 text-action">{formatPesos(record.amountCentavos)}</Text>
          <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{formatExpenseDate(record.expenseDate)}</Text>
        </View>
        {!!record.details && <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{record.details}</Text>}
      </View>)}
  </InventoryFrame>;
}
