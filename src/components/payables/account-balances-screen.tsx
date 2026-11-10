import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { ReceivableOverviewScreen } from '@/components/receivables/receivable-overview-screen';
import { Button } from '@/components/ui/button';
import { MotionContent, MotionRegion } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { SegmentedSelector } from '@/components/ui/segmented-selector';
import { useQuickAdd } from '@/state/quick-add';
import { usePayableDraft } from '@/state/payable-draft';
import { usePushOnce } from '@/hooks/use-push-once';
import { payableLists } from '@/utils/payables';
import { formatPesos } from '@/utils/dashboard';
import { BalancePanel, balancesRoot, CreditorSearch, payableColors } from './payables-ui';
import { PayableCard } from './payable-card';

export function AccountBalancesScreen() {
  const { section, status } = useLocalSearchParams<{ section?: string; status?: string }>();
  return section === 'payable' ? <PayableBalancesScreen /> : <ReceivableOverviewScreen key={status ?? 'unpaid'} />;
}
function PayableBalancesScreen() {
  const { section, status } = useLocalSearchParams<{ section?: string; status?: string }>();
  const payable = section === 'payable';
  const paid = status === 'paid';
  const { payables, payableFeedback, dismissPayableFeedback } = useQuickAdd();
  const { searchQuery: query, setSearchQuery: setQuery } = usePayableDraft();
  const [expanded, setExpanded] = useState<string | null>(null);
  const push = usePushOnce();
  const lists = payableLists(payables, query);
  useEffect(() => {
    if (!payableFeedback) return;
    const timer = setTimeout(dismissPayableFeedback, 5000);
    return () => clearTimeout(timer);
  }, [payableFeedback, dismissPayableFeedback]);
  const rows = paid ? lists.paid : [...lists.pending, ...lists.partial];
  const groups = paid ? [{ title: '', rows: lists.paid, partial: false }] : [
    { title: 'Pending', rows: lists.pending, partial: false },
    { title: 'Remaining Balance', rows: lists.partial, partial: true },
  ];
  return <InventoryFrame title="Account Balances">
    <SegmentedSelector options={[{ label: 'Receivable', value: 'receivable' }, { label: 'Payable', value: 'payable' }]}
      value={payable ? 'payable' : 'receivable'} onChange={section => { router.setParams({ section, status: 'unpaid' }); setExpanded(null); }} />
    <>
      {!!payableFeedback && <MotionRegion><Pressable accessibilityRole="button" accessibilityLabel={`${payableFeedback} Dismiss`} onPress={dismissPayableFeedback} className="rounded-control bg-[#E8F5E9] p-3"><Text accessibilityRole="status" className="font-poppins text-[12px] text-[#1D5D21]">{payableFeedback}</Text></Pressable></MotionRegion>}
      {!paid && <>
        <BalancePanel title="Total Amount to Pay" amount={formatPesos(lists.outstandingCentavos)} caption={`${lists.creditorCount} ${lists.creditorCount === 1 ? 'Creditor' : 'Creditors'}`} />
        <View className="py-3"><Button onPress={() => push(`${balancesRoot}/new`)}>Record Debt</Button></View>
      </>}
      <View accessibilityRole="tablist" className="flex-row px-4">
        {['Unpaid', 'Paid'].map(label => {
          const selected = paid === (label === 'Paid');
          return <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { router.setParams({ status: label.toLowerCase() }); setExpanded(null); }} className="min-h-12 flex-1 items-center justify-center border-b px-3 py-3" style={{ borderColor: selected ? '#2F6CC9' : '#102342', borderBottomWidth: selected ? 3 : 1 }}>
            <Text className="font-poppins-bold text-[14px]" style={{ color: selected ? '#2F6CC9' : '#102342' }}>{label}</Text>
          </Pressable>;
        })}
      </View>
      <View className="py-3"><CreditorSearch value={query} onChange={setQuery} /></View>
      {paid && <BalancePanel title="Total Amount Paid" amount={formatPesos(lists.paidCentavos)} paid />}
      <MotionContent changeKey={paid ? 'paid' : 'unpaid'}>
        {!rows.length ? <View className="rounded-card border border-[#B0C8E3] bg-white p-5">
          <Text accessibilityRole="status" className="font-poppins-semibold text-[16px] text-brand">{query.trim() ? 'No matching debts' : paid ? 'No paid debts yet' : 'No unpaid debts'}</Text>
          <Text className="mt-2 font-poppins text-[12px] leading-[18px] text-text-secondary">{query.trim() ? 'Try another creditor name or clear your search.' : paid ? 'Fully settled debts will appear here.' : 'Record a business debt to track what your store owes.'}</Text>
        </View> : <View className="gap-5">{groups.filter(group => group.rows.length).map(group => <View key={group.title} className={paid ? 'gap-3' : 'gap-3 rounded-surface p-4'} style={{ backgroundColor: paid ? undefined : group.partial ? payableColors.partialGroup : payableColors.pendingGroup }}>
          {!!group.title && <View className="flex-row flex-wrap items-center gap-2">
            <Text accessibilityRole="header" className="font-poppins-semibold text-[14px]" style={{ color: group.partial ? payableColors.orange : payableColors.blue }}>{group.title}</Text>
            <View className="min-h-5 min-w-5 items-center justify-center rounded-pill px-1" style={{ backgroundColor: group.partial ? payableColors.orange : payableColors.blue }}><Text className="font-poppins text-[10px] text-white">{group.rows.length}</Text></View>
          </View>}
          {group.rows.map(row => <PayableCard key={row.debt.id} row={row} expanded={expanded === row.debt.id} onExpand={() => setExpanded(previous => previous === row.debt.id ? null : row.debt.id)} onPayment={() => push({ pathname: `${balancesRoot}/payment`, params: { debtId: row.debt.id } })} />)}
        </View>)}</View>}
      </MotionContent>
    </>
  </InventoryFrame>;
}
