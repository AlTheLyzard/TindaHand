import { router, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, type ScrollViewInstance } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { Button } from '@/components/ui/button';
import { EmptyState as ContentState } from '@/components/ui/content-state';
import { MotionContent, MotionRegion, MotionText } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { SegmentedSelector } from '@/components/ui/segmented-selector';
import { useApiReceivables } from '@/hooks/use-receivables';
import { useQuickAdd } from '@/state/quick-add';
import { useAuthFlow } from '@/state/auth-flow';
import { useReceivableDraft } from '@/state/receivable-draft';
import { usePushOnce } from '@/hooks/use-push-once';
import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';
import { localCalendarDate, receivableLists } from '@/utils/receivables';
import tokens from '@/constants/design-tokens.json';
import type { ReceivableStatus } from '@/types/receivables';
import { CustomerSearch, receivableStatusStyles, useReceivablesRoot, ReceivableCountBadge, ReceivableSummaryCard } from './receivables-ui';
import { ReceivableCard } from './receivable-card';
import { useStoreOwner } from '@/hooks/use-store-owner';

function ReceivableTabs({ paid, onChange }: { paid: boolean; onChange: (paid: boolean) => void }) {
  const reduced = useMotionReduced();
  const frames = useRef<Record<string, { x: number; width: number }>>({});
  const initialized = useRef(false);
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const selected = paid ? 'paid' : 'unpaid';
  const moveTo = useCallback((frame: { x: number; width: number }) => {
    if (reduced || !initialized.current) {
      x.set(frame.x);
      width.set(frame.width);
      initialized.current = true;
    } else {
      x.set(withTiming(frame.x, { duration: motion.state, easing: motion.ease, reduceMotion: ReduceMotion.System }));
      width.set(withTiming(frame.width, { duration: motion.state, easing: motion.ease, reduceMotion: ReduceMotion.System }));
    }
  }, [reduced, width, x]);
  useEffect(() => {
    const frame = frames.current[selected];
    if (frame) moveTo(frame);
  }, [moveTo, selected]);
  const indicator = useAnimatedStyle(() => ({ left: x.value, width: width.value }));
  return <View accessibilityRole="tablist" className="px-4">
    <View className="relative flex-row">
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0 h-px bg-text-primary" />
      <Animated.View pointerEvents="none" className="absolute bottom-0 h-1 bg-accent" style={indicator} />
      {(['Unpaid', 'Paid'] as const).map(label => {
        const key = label.toLowerCase();
        const isSelected = selected === key;
        return <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: isSelected }} onPress={() => onChange(key === 'paid')}
          onLayout={event => {
            const frame = { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width };
            frames.current[key] = frame;
            if (isSelected) moveTo(frame);
          }} className="min-h-12 flex-1 items-center justify-center px-3 py-3">
          <MotionText className="type-button-cta" style={{ color: isSelected ? tokens.color.accentBase : tokens.color.textPrimary }}>{label}</MotionText>
        </Pressable>;
      })}
    </View>
  </View>;
}

export function ReceivableOverviewScreen({ pendingOnly = false }: { pendingOnly?: boolean }) {
  const { status, debtId } = useLocalSearchParams<{ status?: string; debtId?: string }>();
  const paid = !pendingOnly && status === 'paid';
  const { deviceSession } = useAuthFlow();
  const storeOwner = useStoreOwner();
  const root = useReceivablesRoot();
  const confirmedMode = storeOwner?.mode === 'confirmed';
  const { records, receivablePayments: localPayments } = useQuickAdd();
  const { debts: apiDebts, payments: apiPayments, refresh: refreshReceivables } = useApiReceivables(confirmedMode ? storeOwner?.id : undefined);
  const receivableRecords = confirmedMode ? apiDebts : records;
  const receivablePayments = confirmedMode ? apiPayments : localPayments;
  const { query, setQuery } = useReceivableDraft();
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => {
    if (!debtId) return;
    setQuery('');
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [debtId, setQuery]);
  const [today, setToday] = useState(localCalendarDate);
  const push = usePushOnce();
  useEffect(() => { const timer = setInterval(() => setToday(localCalendarDate()), 30000); return () => clearInterval(timer); }, []);
  useFocusEffect(useCallback(() => { if (confirmedMode) refreshReceivables(); }, [confirmedMode, refreshReceivables]));
  const lists = receivableLists(receivableRecords, receivablePayments, query, today);
  const groups: { title: string; status: ReceivableStatus; rows: typeof lists.pending }[] = paid
    ? [{ title: '', status: 'paid', rows: lists.paid }]
    : pendingOnly
      ? [{ title: 'Pending', status: 'pending', rows: lists.pending }]
      : [
          { title: 'Overdue', status: 'overdue', rows: lists.overdue },
          { title: 'Pending', status: 'pending', rows: lists.pending },
          { title: 'Remaining Balance', status: 'partial', rows: lists.partial },
        ];
  const noRows = groups.every(group => !group.rows.length);
  const arrivalGroups = debtId
    ? groups.slice().sort((a, b) => Number(b.rows.some(row => row.debt.id === debtId)) - Number(a.rows.some(row => row.debt.id === debtId)))
    : groups;
  function back() { router.dismissTo({ pathname: root, params: { section: 'receivable', status: 'unpaid' } } as Href); }

  return <InventoryFrame scrollRef={scroll} title={pendingOnly ? 'Pending Debt' : 'Account Balances'} back inlineTitle background onBack={pendingOnly ? back : undefined}>
    {pendingOnly ? <Text className="type-micro-financial-rate text-text-secondary">Keep track of customers with pending debt.</Text> : deviceSession?.role === 'operator' ? null : <SegmentedSelector tone="subtle"
      options={[{ label: 'Receivable', value: 'receivable' }, { label: 'Payable', value: 'payable' }]}
      value="receivable" onChange={section => { router.setParams({ section, status: 'unpaid' }); }} />}
    {!pendingOnly && !paid && <>
      <ReceivableSummaryCard title="Total Amount to Collect" amountCentavos={lists.outstandingCentavos}
        caption={`${lists.transactionCount} ${lists.transactionCount === 1 ? 'transaction' : 'transactions'} · ${lists.customerCount} ${lists.customerCount === 1 ? 'customer' : 'customers'}`} />
      <View className="py-1"><Button onPress={() => push(`${root}/customer-new`)}>Record Debt</Button></View>
    </>}
    {paid && <ReceivableSummaryCard title="Total Amount Paid" amountCentavos={lists.paidCentavos} paid />}
    {!pendingOnly && <ReceivableTabs paid={paid} onChange={nextPaid => { router.setParams({ status: nextPaid ? 'paid' : 'unpaid' }); }} />}
    <View className="py-3"><CustomerSearch value={query} onChange={setQuery} placeholder="Search Product" /></View>
    <MotionContent changeKey={paid ? 'paid' : pendingOnly ? 'pending' : 'unpaid'}>
      {noRows ? <ContentState title={query.trim() ? 'No matching debts' : paid ? 'No paid debts yet' : pendingOnly ? 'No pending debts' : 'No unpaid debts'} description={query.trim() ? 'Try another customer name or clear your search.' : paid ? 'Fully settled debts will appear here.' : 'Record a customer debt to track what is owed to your store.'} /> : <View className="gap-4">
        {arrivalGroups.filter(group => group.rows.length).map(group => {
          const showAll = paid || pendingOnly || group.status !== 'pending';
          const visibleRows = showAll ? group.rows : group.rows.slice(0, 2);
          const panelClassName = paid ? 'gap-2' : `gap-2 rounded-surface p-3 ${receivableStatusStyles[group.status].panel}`;
          return <MotionRegion key={group.status} className={panelClassName} style={!paid ? undefined : { backgroundColor: tokens.color.surfaceCard }}>
            {!!group.title && <View className="flex-row flex-wrap items-center gap-2">
              <Text accessibilityRole="header" className={`type-micro-financial-rate font-poppins-semibold ${receivableStatusStyles[group.status].ink}`}>{group.title}</Text>
              <ReceivableCountBadge count={group.rows.length} backgroundColor={receivableStatusStyles[group.status].badgeBackground} textColor={receivableStatusStyles[group.status].badgeInk} />
              {!pendingOnly && !paid && group.status === 'pending' && group.rows.length >= 3 && <Button variant="text" compact fullWidth={false}
                accessibilityLabel="View all pending debts" onPress={() => push(`${root}/pending`)} style={{ marginLeft: 'auto' }}>View all</Button>}
            </View>}
            <View className="gap-2">
              {visibleRows.map(row => <ReceivableCard key={row.debt.id} row={row} today={today}
                onDetails={() => push({ pathname: `${root}/details`, params: { debtId: row.debt.id } })} />)}
            </View>
          </MotionRegion>;
        })}
      </View>}
    </MotionContent>
  </InventoryFrame>;
}
