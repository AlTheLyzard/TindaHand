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
import { useApiExpenses } from '@/hooks/use-expenses';
import { useQuickAdd } from '@/state/quick-add';
import { useAuthFlow } from '@/state/auth-flow';
import type { ExpenseFilter } from '@/types/expenses';
import { expenseCategoryLabel, expenseRecords, filterExpenses, formatExpenseDate, monthlyExpenses } from '@/utils/expenses';
import { formatPesos } from '@/utils/dashboard';
import { todayInManila } from '@/utils/inventory';
import tokens from '@/constants/design-tokens.json';

export function ExpenseListScreen() {
  const { owner } = useAuthFlow();
  const { records, expenseFeedback, dismissExpenseFeedback } = useQuickAdd();
  const { expenses: apiExpenses, refresh: refreshApiExpenses } = useApiExpenses();
  const confirmedMode = owner?.mode === 'confirmed';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ExpenseFilter>('all');
  const [today, setToday] = useState(todayInManila);
  const scroll = useRef<ScrollViewInstance>(null);
  const push = usePushOnce();
  // Use real API data for confirmed sessions; fall back to local seed for mock/preview.
  const allExpenses = confirmedMode ? apiExpenses : expenseRecords(records);
  const expenses = filterExpenses(allExpenses, query, category);
  const newRecord = () => push('/owner-menu/store-expenses/new');
  const feedbackId = expenseFeedback?.recordId;
  useFocusEffect(useCallback(() => {
    setToday(todayInManila());
    // A saved record is immediately visible even when the retained list had active filters.
    if (feedbackId) { setQuery(''); setCategory('all'); scroll.current?.scrollTo({ y: 0, animated: false }); }
    // Refresh real API data each time screen gains focus (e.g. after recording a new expense).
    if (confirmedMode) refreshApiExpenses();
    const refresh = setInterval(() => setToday(todayInManila()), 60000);
    return () => clearInterval(refresh);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId, confirmedMode]));
  return <InventoryFrame title="Store expenses" back inlineTitle scrollRef={scroll} hideNavigationWithKeyboard background
    onBack={() => router.canGoBack() ? router.back() : router.replace('/owner-dashboard')}>
    <View style={{ position: 'relative' }}>
      <InvField hideLabel label="Search expenses" accessibilityLabel="Search expenses" value={query} onChangeText={setQuery} placeholder="Search expenses…" returnKeyType="search" style={{ paddingLeft: 52, paddingRight: 16 }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' }}><PosIcon name="search" size={20} /></View>
    </View>
    <View testID="expense-month-summary" className="gap-1 rounded-control border border-outline bg-accent-soft p-4">
      <Text className=" type-label-nav leading-[18px] text-brand">Total expenses this month</Text>
      <Text accessibilityLiveRegion="polite" className=" type-large-metric leading-[36px] text-brand">{formatPesos(monthlyExpenses(allExpenses, today))}</Text>
    </View>
    {expenseFeedback && <RegistrationToast expiresAt={expenseFeedback.expiresAt} onDismiss={dismissExpenseFeedback} title="Expense recorded" message="Your expense has been saved successfully." />}
    <Button onPress={newRecord}>New Record</Button>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      <PosChip label="All" selected={category === 'all'} onPress={() => setCategory('all')} />
      {expenseCategories.map(value => <PosChip key={value} label={expenseCategoryLabel(value)} selected={category === value} onPress={() => setCategory(value)} />)}
    </ScrollView>
    {allExpenses.length === 0 ? <EmptyState icon="expense" title="No expenses yet" description="Record your first store expense to start tracking your spending." action="New Record" onAction={newRecord} /> : expenses.length === 0 ?
      <EmptyState icon="search" title={query.trim() ? 'No expenses found' : 'No expenses in this category'} description="Try a different search or category to find your expenses." action="Clear search and filters" onAction={() => { setQuery(''); setCategory('all'); }} /> :
      expenses.map(record => <View key={record.id} testID="expense-card" style={{ gap: 10, borderRadius: tokens.radius.surface, borderWidth: 1, borderColor: tokens.color.borderOutline, backgroundColor: tokens.color.surfaceCard, padding: 16 }}>
        <Text accessibilityRole="header" style={{ fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.h3Heading.fontSize, lineHeight: 27, color: tokens.color.textPrimary }}>{expenseCategoryLabel(record.category)}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8, rowGap: 4 }}>
          <Text style={{ fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.listFinancial.fontSize, lineHeight: 24, color: tokens.button.primary.default }}>{formatPesos(record.amountCentavos)}</Text>
          <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, lineHeight: 18, color: tokens.color.textSecondary }}>{formatExpenseDate(record.expenseDate)}</Text>
        </View>
        {!!record.details && <View style={{ alignSelf: 'flex-start', maxWidth: '100%', borderRadius: tokens.radius.pill, backgroundColor: tokens.color.surfaceSubtle, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: 18, color: tokens.color.textPrimary }}>{record.details}</Text>
        </View>}
      </View>)}
  </InventoryFrame>;
}
