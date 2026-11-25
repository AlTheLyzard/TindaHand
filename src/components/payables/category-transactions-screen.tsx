import { router, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { EmptyState } from '@/components/ui/content-state';
import { MotionContent } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { useQuickAdd } from '@/state/quick-add';
import { useAuthFlow } from '@/state/auth-flow';
import { useApiReceivables } from '@/hooks/use-receivables';
import { useApiPayables } from '@/hooks/use-payables';
import { usePayableDraft } from '@/state/payable-draft';
import { useReceivableDraft } from '@/state/receivable-draft';
import { localCalendarDate, receivableLists } from '@/utils/receivables';
import { payableLists } from '@/utils/payables';
import { todayInManila } from '@/utils/inventory-stock';
import { CustomerSearch, receivableColors, useReceivablesRoot } from '@/components/receivables/receivables-ui';
import { ReceivableCard } from '@/components/receivables/receivable-card';
import { useStoreOwner } from '@/hooks/use-store-owner';
import { CreditorSearch, balancesRoot, payableColors } from './payables-ui';
import { PayableCard } from './payable-card';

type Category = 'overdue' | 'pending' | 'remaining';

const categoryTitle: Record<Category, string> = {
  overdue: 'Overdue',
  pending: 'Pending',
  remaining: 'Remaining Balance',
};

function parseCategory(value?: string): Category | null {
  return value === 'overdue' || value === 'pending' || value === 'remaining' ? value : null;
}

export function CategoryTransactionsScreen() {
  const { section, category: rawCategory } = useLocalSearchParams<{ section?: string; category?: string }>();
  const { deviceSession } = useAuthFlow();
  const receivableRoot = useReceivablesRoot();
  const payable = deviceSession?.role === 'owner' && section === 'payable';
  const category = parseCategory(rawCategory);
  if (!category) {
    const root = payable ? balancesRoot : receivableRoot;
    return <InventoryFrame title="Transactions" back inlineTitle onBack={() => router.dismissTo({ pathname: root, params: { section: payable ? 'payable' : 'receivable', status: 'unpaid' } } as Href)}>
      <EmptyState title="Category not available" description="Return to Account Balances and choose a transaction category." />
    </InventoryFrame>;
  }
  return payable ? <PayableCategoryTransactions category={category} /> : <ReceivableCategoryTransactions category={category} />;
}

function ReceivableCategoryTransactions({ category }: { category: Category }) {
  const { records, receivablePayments: localPayments } = useQuickAdd();
  const storeOwner = useStoreOwner();
  const receivableRoot = useReceivablesRoot();
  const confirmedMode = storeOwner?.mode === 'confirmed';
  const { debts: apiDebts, payments: apiPayments, refresh } = useApiReceivables(confirmedMode ? storeOwner?.id : undefined);
  const receivableRecords = confirmedMode ? apiDebts : records;
  const receivablePayments = confirmedMode ? apiPayments : localPayments;
  const { query, setQuery } = useReceivableDraft();
  const [today, setToday] = useState(localCalendarDate);
  const push = usePushOnce();
  useFocusEffect(useCallback(() => { if (confirmedMode) refresh(); }, [confirmedMode, refresh]));
  useEffect(() => {
    const timer = setInterval(() => setToday(localCalendarDate()), 30000);
    return () => clearInterval(timer);
  }, []);

  const lists = receivableLists(receivableRecords, receivablePayments, query, today);
  const rows = category === 'remaining' ? lists.partial : lists[category];
  const color = category === 'overdue' ? receivableColors.red : category === 'pending' ? receivableColors.blue : receivableColors.orange;
  const back = () => router.dismissTo({ pathname: receivableRoot, params: { section: 'receivable', status: 'unpaid' } } as Href);

  return <InventoryFrame title={`${categoryTitle[category]} Debts`} back inlineTitle onBack={back}>
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <Text accessibilityRole="header" className=" type-body-primary" style={{ color }}>{categoryTitle[category]}</Text>
      <View className="min-h-6 min-w-6 items-center justify-center rounded-pill px-2" style={{ backgroundColor: color }}>
        <Text className=" type-micro-caption text-white">{rows.length}</Text>
      </View>
    </View>
    <View className="py-3"><CustomerSearch value={query} onChange={setQuery} /></View>
    <MotionContent changeKey={`receivable:${category}`}>
      {!rows.length ? <EmptyState title={query.trim() ? 'No matching debts' : `No ${categoryTitle[category].toLowerCase()} debts`} description={query.trim() ? 'Try another customer name or clear your search.' : 'Transactions in this category will appear here.'} />
        : <View className="gap-3">{rows.map(row => <ReceivableCard key={row.debt.id} row={row} today={today}
          onDetails={() => push({ pathname: `${receivableRoot}/details`, params: { debtId: row.debt.id } } as unknown as Href)} />)}</View>}
    </MotionContent>
  </InventoryFrame>;
}

function PayableCategoryTransactions({ category }: { category: Category }) {
  const { payables: localPayables } = useQuickAdd();
  const { owner } = useAuthFlow();
  const confirmedMode = owner?.mode === 'confirmed';
  const { ledger: apiPayables } = useApiPayables(confirmedMode ? owner?.id : undefined);
  const payables = confirmedMode ? apiPayables : localPayables;
  const { searchQuery: query, setSearchQuery: setQuery } = usePayableDraft();
  const [today, setToday] = useState(todayInManila);
  const push = usePushOnce();
  useEffect(() => {
    const timer = setInterval(() => setToday(todayInManila()), 30000);
    return () => clearInterval(timer);
  }, []);

  const lists = payableLists(payables, query, today);
  const rows = category === 'remaining' ? lists.partial : lists[category];
  const color = category === 'overdue' ? payableColors.red : category === 'pending' ? payableColors.blue : payableColors.orange;
  const back = () => router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: 'unpaid' } });

  return <InventoryFrame title={`${categoryTitle[category]} Debts`} back inlineTitle onBack={back}>
    <View className="flex-row flex-wrap items-center justify-between gap-2">
      <Text accessibilityRole="header" className=" type-body-primary" style={{ color }}>{categoryTitle[category]}</Text>
      <View className="min-h-6 min-w-6 items-center justify-center rounded-pill px-2" style={{ backgroundColor: color }}>
        <Text className=" type-micro-caption text-white">{rows.length}</Text>
      </View>
    </View>
    <View className="py-3"><CreditorSearch value={query} onChange={setQuery} /></View>
    <MotionContent changeKey={`payable:${category}`}>
      {!rows.length ? <EmptyState title={query.trim() ? 'No matching debts' : `No ${categoryTitle[category].toLowerCase()} debts`} description={query.trim() ? 'Try another creditor name or clear your search.' : 'Transactions in this category will appear here.'} />
        : <View className="gap-3">{rows.map(row => <PayableCard key={row.debt.id} row={row} today={today}
          onDetails={() => push({ pathname: `${balancesRoot}/payable-details`, params: { debtId: row.debt.id } } as unknown as Href)} />)}</View>}
    </MotionContent>
  </InventoryFrame>;
}
