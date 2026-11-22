import tokens from '@/constants/design-tokens.json';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { ReceivableOverviewScreen } from '@/components/receivables/receivable-overview-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/content-state';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { SegmentedSelector } from '@/components/ui/segmented-selector';
import { useApiPayables } from '@/hooks/use-payables';
import { useQuickAdd } from '@/state/quick-add';
import { useAuthFlow } from '@/state/auth-flow';
import { usePayableDraft } from '@/state/payable-draft';
import { usePushOnce } from '@/hooks/use-push-once';
import { payableLists } from '@/utils/payables';
import { formatPesos } from '@/utils/dashboard';
import { todayInManila } from '@/utils/inventory-stock';
import { BalancePanel, balancesRoot, CreditorSearch, payableColors } from './payables-ui';
import { PayableCard } from './payable-card';

export function AccountBalancesScreen() {
  const { section, status } = useLocalSearchParams<{ section?: string; status?: string }>();
  return section === 'payable' ? <PayableBalancesScreen /> : <ReceivableOverviewScreen key={status ?? 'unpaid'} />;
}

export function PayablePendingScreen() {
  return <PayableBalancesScreen pendingOnly />;
}

function PayableBalancesScreen({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { section, status } = useLocalSearchParams<{ section?: string; status?: string }>();
  const payable = section === 'payable' || pendingOnly;
  const paid = !pendingOnly && status === 'paid';
  const { owner } = useAuthFlow();
  const confirmedMode = owner?.mode === 'confirmed';
  const { payables: localPayables } = useQuickAdd();
  const { ledger: apiPayables, refresh: refreshPayables } = useApiPayables(confirmedMode ? owner?.id : undefined);
  // Use real API data for confirmed sessions; fall back to local seed for mock/preview.
  const payables = confirmedMode ? apiPayables : localPayables;
  const { searchQuery: query, setSearchQuery: setQuery } = usePayableDraft();
  const [today, setToday] = useState(todayInManila);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const push = usePushOnce();
  const lists = payableLists(payables, query, today);
  useEffect(() => { const timer = setInterval(() => setToday(todayInManila()), 30000); return () => clearInterval(timer); }, []);
  const refresh = useCallback(() => {
    setRefreshing(true);
    setToday(todayInManila());
    if (confirmedMode) refreshPayables();
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { refreshTimer.current = null; setRefreshing(false); }, 300);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedMode]);
  useEffect(() => () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); }, []);
  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[payableColors.blue]} tintColor={payableColors.blue} />;
  const groups = paid ? [{ title: '', category: null, rows: lists.paid, color: payableColors.green, surface: tokens.color.surfaceCard }] : pendingOnly ? [
    { title: 'Pending', category: 'pending', rows: lists.pending, color: payableColors.blue, surface: payableColors.pendingGroup },
  ] : [
    { title: 'Overdue', category: 'overdue', rows: lists.overdue, color: payableColors.red, surface: payableColors.overdueGroup },
    { title: 'Pending', category: 'pending', rows: lists.pending, color: payableColors.blue, surface: payableColors.pendingGroup },
    { title: 'Remaining Balance', category: 'remaining', rows: lists.partial, color: payableColors.orange, surface: payableColors.partialGroup },
  ];
  const noRows = groups.every(group => !group.rows.length);
  function backToBalances() {
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: 'unpaid' } });
  }

  return <InventoryFrame title={pendingOnly ? 'Pending debt' : 'Account Balances'} back inlineTitle onBack={pendingOnly ? backToBalances : undefined} refreshControl={refreshControl}>
    {pendingOnly ? <Text className=" type-micro-financial-rate text-text-secondary">Keep track of suppliers with pending debt.</Text> : <SegmentedSelector tone="subtle" options={[{ label: 'Receivable', value: 'receivable' }, { label: 'Payable', value: 'payable' }]}
      value={payable ? 'payable' : 'receivable'} onChange={section => { router.setParams({ section, status: 'unpaid' }); }} />}
    <>
      {!pendingOnly && !paid && <>
        <BalancePanel title="Total Amount to Pay" amount={formatPesos(lists.outstandingCentavos)} caption={`${lists.transactionCount} ${lists.transactionCount === 1 ? 'transaction' : 'transactions'} · ${lists.creditorCount} ${lists.creditorCount === 1 ? 'creditor' : 'creditors'}`} />
        <View className="py-1"><Button onPress={() => push(`${balancesRoot}/new`)}>Record Debt</Button></View>
      </>}
      {paid && <BalancePanel title="Total Amount Paid" amount={formatPesos(lists.paidCentavos)} paid />}
      {!pendingOnly && <View accessibilityRole="tablist" className="flex-row px-4">
        {['Unpaid', 'Paid'].map(label => {
          const selected = paid === (label === 'Paid');
          return <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { router.setParams({ status: label.toLowerCase() }); }} className="min-h-12 flex-1 items-center justify-center border-b px-3 py-3" style={{ borderColor: selected ? tokens.color.brightBlue : tokens.color.textPrimary, borderBottomWidth: selected ? 3 : 1 }}>
            <Text className=" type-button-cta" style={{ color: selected ? tokens.color.brightBlue : tokens.color.textPrimary }}>{label}</Text>
          </Pressable>;
        })}
      </View>}
      <View className="py-3"><CreditorSearch value={query} onChange={setQuery} /></View>
      <MotionContent changeKey={paid ? 'paid' : pendingOnly ? 'pending' : 'unpaid'}>
        {noRows ? <EmptyState title={query.trim() ? 'No matching debts' : paid ? 'No paid debts yet' : pendingOnly ? 'No pending debts' : 'No unpaid debts'} description={query.trim() ? 'Try another creditor name or clear your search.' : paid ? 'Fully settled debts will appear here.' : pendingOnly ? 'Pending debts will appear here.' : 'Record a business debt to track what your store owes.'} /> : <View className="gap-5">
          {groups.filter(group => group.rows.length).map(group => <View key={group.title} className={paid ? 'gap-3' : 'gap-3 rounded-surface p-3'} style={{ backgroundColor: paid ? undefined : group.surface }}>
            {!!group.title && <View className="flex-row flex-wrap items-center gap-2">
              <Text accessibilityRole="header" className=" type-micro-financial-rate" style={{ color: group.color }}>{group.title}</Text>
              <View className="min-h-5 min-w-5 items-center justify-center rounded-pill px-1" style={{ backgroundColor: group.color }}><Text className=" type-helper text-white">{group.rows.length}</Text></View>
              {!pendingOnly && !paid && group.category && <Button variant="text" compact fullWidth={false} accessibilityLabel={`View all ${group.title.toLowerCase()} debts`} onPress={() => push({ pathname: `${balancesRoot}/category-transactions`, params: { section: 'payable', category: group.category } } as unknown as Href)} style={{ marginLeft: 'auto' }}>View all</Button>}
            </View>}
            {(!paid && !pendingOnly ? group.rows.slice(0, 2) : group.rows).map(row => <PayableCard key={row.debt.id} row={row} today={today}
              onDetails={() => push({ pathname: `${balancesRoot}/payable-details`, params: { debtId: row.debt.id } } as unknown as Href)} />)}
          </View>)}
        </View>}
      </MotionContent>
    </>
  </InventoryFrame>;
}
