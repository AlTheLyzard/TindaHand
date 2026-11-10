import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View, type ScrollViewInstance } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { Button } from '@/components/ui/button';
import { EmptyState as ContentState } from '@/components/ui/content-state';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { SegmentedSelector } from '@/components/ui/segmented-selector';
import { BalancePanel } from '@/components/payables/payables-ui';
import { useQuickAdd } from '@/state/quick-add';
import { useReceivableDraft } from '@/state/receivable-draft';
import { usePushOnce } from '@/hooks/use-push-once';
import { localCalendarDate, receivableLists } from '@/utils/receivables';
import { formatPesos } from '@/utils/dashboard';
import tokens from '@/constants/design-tokens.json';
import { CustomerSearch, receivableColors as colors, receivablesRoot } from './receivables-ui';
import { ReceivableCard } from './receivable-card';

export function ReceivableOverviewScreen({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { status, debtId } = useLocalSearchParams<{ status?: string; debtId?: string }>();
  const paid = !pendingOnly && status === 'paid';
  const { records, receivablePayments, receivableFeedback, dismissReceivableFeedback } = useQuickAdd();
  const { query, setQuery } = useReceivableDraft();
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (!debtId) return;
    setQuery('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [debtId, setQuery]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [today, setToday] = useState(localCalendarDate);
  const push = usePushOnce();
  useEffect(() => { const timer = setInterval(() => setToday(localCalendarDate()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!receivableFeedback) return;
    const timer = setTimeout(dismissReceivableFeedback, 5000);
    return () => clearTimeout(timer);
  }, [receivableFeedback, dismissReceivableFeedback]);
  const lists = receivableLists(records, receivablePayments, query, today);
  const groups = paid ? [{ title: '', rows: lists.paid, color: colors.green, surface: '#FFFFFF' }] : pendingOnly ? [{ title: 'Pending', rows: lists.pending, color: colors.blue, surface: colors.pendingGroup }] : [
    { title: 'Overdue', rows: lists.overdue, color: colors.red, surface: colors.overdueGroup },
    { title: 'Pending', rows: lists.pending, color: colors.blue, surface: colors.pendingGroup },
    { title: 'Remaining Balance', rows: lists.partial, color: colors.orange, surface: colors.partialGroup },
  ];
  const noRows = groups.every(group => !group.rows.length);
  // A POS arrival surfaces this sale separately, even for a returning customer.
  const arrivalGroups = debtId ? groups.slice().sort((a, b) => Number(b.rows.some(row => row.debt.id === debtId)) - Number(a.rows.some(row => row.debt.id === debtId))) : groups;
  function back() { router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: 'unpaid' } }); }
  return <InventoryFrame scrollRef={scroll} title={pendingOnly ? 'Pending debt' : 'Account Balances'} back={pendingOnly} inlineTitle={pendingOnly} onBack={pendingOnly ? back : undefined}>
    {pendingOnly ? <Text className="font-poppins text-[14px] text-text-secondary">Keep track of customers with pending debt.</Text> : <SegmentedSelector
      options={[{ label: 'Receivable', value: 'receivable' }, { label: 'Payable', value: 'payable' }]}
      value="receivable" onChange={section => { router.setParams({ section, status: 'unpaid' }); setExpanded(null); }} />}
    {!!receivableFeedback && <Pressable accessibilityRole="button" accessibilityLabel={`${receivableFeedback} Dismiss`} onPress={dismissReceivableFeedback} className="rounded-control bg-[#E8F5E9] p-3"><Text accessibilityRole="status" className="font-poppins text-[12px] text-[#1D5D21]">{receivableFeedback}</Text></Pressable>}
    {!pendingOnly && !paid && <>
      <BalancePanel title="Total Amount to Collect" amount={formatPesos(lists.outstandingCentavos)} caption={`${lists.transactionCount} ${lists.transactionCount === 1 ? 'transaction' : 'transactions'} · ${lists.customerCount} ${lists.customerCount === 1 ? 'customer' : 'customers'}`} />
      <View className="py-1"><Button onPress={() => push(`${receivablesRoot}/customer-new`)}>Record Debt</Button></View>
    </>}
    {paid && <CustomerSearch value={query} onChange={setQuery} />}
    {!pendingOnly && <View accessibilityRole="tablist" className="flex-row px-4">
      {['Unpaid', 'Paid'].map(label => {
        const selected = paid === (label === 'Paid');
        return <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { router.setParams({ status: label.toLowerCase() }); setExpanded(null); }} className="min-h-12 flex-1 items-center justify-center border-b px-3 py-3" style={{ borderColor: selected ? tokens.color.accentBase : '#102342', borderBottomWidth: selected ? 3 : 1 }}><Text className="font-poppins-bold text-[14px]" style={{ color: selected ? tokens.color.accentBase : '#102342' }}>{label}</Text></Pressable>;
      })}
    </View>}
    {!paid && <View className="py-3"><CustomerSearch value={query} onChange={setQuery} /></View>}
    {paid && <BalancePanel title="Total Amount Paid" amount={formatPesos(lists.paidCentavos)} paid />}
    <MotionContent changeKey={paid ? 'paid' : 'unpaid'}>
      {noRows ? <ContentState title={query.trim() ? 'No matching debts' : paid ? 'No paid debts yet' : pendingOnly ? 'No pending debts' : 'No unpaid debts'} description={query.trim() ? 'Try another customer name or clear your search.' : paid ? 'Fully settled debts will appear here.' : 'Record a customer debt to track what is owed to your store.'} /> : <View className="gap-5">
        {arrivalGroups.filter(group => group.rows.length).map(group => <View key={group.title} className={paid ? 'gap-3' : 'gap-3 rounded-surface p-3'} style={{ backgroundColor: paid ? undefined : group.surface }}>
          {!!group.title && <View className="flex-row flex-wrap items-center gap-2">
            <Text accessibilityRole="header" className="font-poppins-semibold text-[14px]" style={{ color: group.color }}>{group.title}</Text>
            <View className="min-h-5 min-w-5 items-center justify-center rounded-pill px-1" style={{ backgroundColor: group.color }}><Text className="font-poppins text-[10px] text-white">{group.rows.length}</Text></View>
            {group.title === 'Pending' && !pendingOnly && <Button variant="text" compact fullWidth={false} accessibilityLabel="View all pending debts" onPress={() => push(`${receivablesRoot}/pending`)} style={{ marginLeft: 'auto' }}>View all</Button>}
          </View>}
          {(group.title === 'Pending' && !pendingOnly ? group.rows.slice(0, 2) : group.rows).slice().sort((a, b) => Number(b.debt.id === debtId) - Number(a.debt.id === debtId)).map(row => <ReceivableCard key={row.debt.id} row={row} today={today} expanded={expanded === row.debt.id} onExpand={() => setExpanded(previous => previous === row.debt.id ? null : row.debt.id)} onPayment={() => push({ pathname: `${receivablesRoot}/customer-payment`, params: { debtId: row.debt.id } })} />)}
        </View>)}
      </View>}
    </MotionContent>
  </InventoryFrame>;
}
