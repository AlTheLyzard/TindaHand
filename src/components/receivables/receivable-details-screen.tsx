import { router, useLocalSearchParams, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/content-state';
import { MotionDisclosure } from '@/components/ui/motion-content';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { AppIcon } from '@/components/ui/app-icon';
import { useQuickAdd } from '@/state/quick-add';
import { useApiReceivables } from '@/hooks/use-receivables';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { localCalendarDate, receivableBalance } from '@/utils/receivables';
import tokens from '@/constants/design-tokens.json';
import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';
import { AnimatedNumber, AnimatedPesoValue, ReceivableProgressBar, ReceivableSummaryCard, receivableColors as colors, receivableStatusAppearance, ReceivableStatusPill, useReceivablesRoot } from './receivables-ui';
import { useStoreOwner } from '@/hooks/use-store-owner';

function paymentDate(value: string) {
  return `${formatCalendarDate(value.slice(0, 10))} · ${new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
}

export function ReceivableDetailsScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { records, receivablePayments: localPayments } = useQuickAdd();
  const storeOwner = useStoreOwner();
  const root = useReceivablesRoot();
  const confirmedMode = storeOwner?.mode === 'confirmed';
  const { debts: apiDebts, payments: apiPayments, loading: apiLoading, refresh } = useApiReceivables(confirmedMode ? storeOwner?.id : undefined);
  useFocusEffect(useCallback(() => { if (confirmedMode) refresh(); }, [confirmedMode, refresh]));
  const receivableRecords = confirmedMode ? apiDebts : records;
  const receivablePayments = confirmedMode ? apiPayments : localPayments;
  const debt = receivableRecords.find(record => record.kind === 'customerDebt' && record.id === debtId);
  const today = localCalendarDate();
  const selectedBalance = debt ? receivableBalance(debt, receivablePayments, today) : null;
  const paidDetails = selectedBalance?.status === 'paid';
  // The confirmed API shape has no customer identity; show only the selected debt there.
  const customerDebts = debt
    ? (confirmedMode || !debt.customerId
      ? [debt]
      : receivableRecords.filter(record => record.kind === 'customerDebt' && record.customerId === debt.customerId))
    : [];
  const allBalances = customerDebts.map(item => receivableBalance(item, receivablePayments, today));
  const stillLoading = confirmedMode && apiLoading && !debt;
  const detailBalances = paidDetails ? allBalances.filter(row => row.status === 'paid') : allBalances;
  const originalCentavos = detailBalances.reduce((sum, row) => sum + row.originalCentavos, 0);
  const paidCentavos = detailBalances.reduce((sum, row) => sum + row.paidCentavos, 0);
  const remainingCentavos = detailBalances.reduce((sum, row) => sum + row.remainingCentavos, 0);
  const progress = originalCentavos ? paidCentavos / originalCentavos * 100 : 0;
  const overdue = !paidDetails && detailBalances.some(row => row.status === 'overdue');
  const partial = !paidDetails && !overdue && detailBalances.some(row => row.status === 'partial');
  const status = paidDetails ? 'paid' : overdue ? 'overdue' : partial ? 'partial' : 'pending';
  const { color } = receivableStatusAppearance(status);
  const history = detailBalances.flatMap(row => row.history.map(payment => ({ payment, debtId: row.debt.id })))
    .sort((first, second) => second.payment.occurredAt.localeCompare(first.payment.occurredAt));
  const [historyState, setHistoryState] = useState({ debtId, expanded: false });
  const historyExpanded = historyState.debtId === debtId && historyState.expanded;
  const reduced = useMotionReduced();
  const chevron = useSharedValue(0);
  useEffect(() => {
    chevron.set(reduced ? (historyExpanded ? 180 : 0) : withTiming(historyExpanded ? 180 : 0, {
      duration: motion.state, easing: motion.ease, reduceMotion: ReduceMotion.System,
    }));
  }, [chevron, historyExpanded, reduced]);
  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${chevron.value}deg` }] }));

  function back() {
    router.dismissTo({ pathname: root, params: { section: 'receivable', status: paidDetails ? 'paid' : 'unpaid' } } as Href);
  }
  function recordPayment() {
    if (!debt || !selectedBalance || selectedBalance.status === 'paid') return;
    router.push({ pathname: `${root}/customer-payment`, params: { debtId: debt.id } });
  }
  return <InventoryFrame title={paidDetails ? 'Paid Details' : 'Debt Details'} back inlineTitle background onBack={back}>
    {stillLoading ? <EmptyState title="Loading debt details…" description="Please wait a moment." /> :
      !debt || !selectedBalance ? <EmptyState title="Debt not available" description="Return to Account Balances and choose an existing customer debt." action="Back to Account Balances" onAction={back} /> : <View className="gap-5">
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <Text accessibilityRole="header" className="min-w-0 flex-1 type-h2-section text-text-primary">{debt.name}</Text>
          <ReceivableStatusPill status={status} />
        </View>

        <View className="flex-row rounded-card border border-outline bg-ice-container p-3">
          {[
            { title: 'Original Total Debt', value: originalCentavos, color: colors.blue },
            { title: 'Amount Paid', value: paidCentavos, color: colors.green },
            { title: 'Remaining Balance', value: remainingCentavos, color: colors.blue },
          ].map((item, index) => <View key={item.title} className="min-w-0 flex-1 items-center justify-center gap-2 px-1" style={index > 0 ? { borderLeftWidth: 1, borderLeftColor: tokens.color.borderOutline } : undefined}>
            <Text className="min-h-8 text-center type-helper text-text-secondary">{item.title}</Text>
            <AnimatedPesoValue centavos={item.value} className="type-h3-heading text-center" style={{ color: item.color }} />
          </View>)}
        </View>

        <View className="gap-3">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="type-helper font-poppins-semibold text-text-secondary">PAYMENT PROGRESS</Text>
            <AnimatedNumber value={progress * 100} format="percent" className="type-button-cta text-right text-text-primary" />
          </View>
          <ReceivableProgressBar progress={progress} color={color} label="Payment progress" height="h-3" />
          <View className="flex-row flex-wrap justify-between gap-2">
            <Text className="type-micro-caption text-text-secondary">{formatPesos(paidCentavos)} Paid</Text>
            <Text className="type-micro-caption text-text-secondary">{formatPesos(remainingCentavos)} Remaining</Text>
          </View>
        </View>

        <View className="overflow-hidden rounded-card border border-outline bg-white">
          <View className="bg-brand px-4 py-3"><Text accessibilityRole="header" className="type-list-financial text-white">Borrowing Information</Text></View>
          <View className="gap-5 p-4">
            {detailBalances.slice().sort((a, b) => b.debt.occurredAt.localeCompare(a.debt.occurredAt)).map(row => {
              const rowDebt = row.debt;
              const lines = Object.values(rowDebt.items);
              const subtotal = lines.length > 0
                ? lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCentavos, 0)
                : row.originalCentavos;
              return <View key={rowDebt.id} className="gap-4">
                <View className="flex-row flex-wrap justify-between gap-2"><Text className="type-label-nav text-text-primary">Borrowing Type</Text><Text className="type-label-nav text-accent">{rowDebt.borrowing === 'product' ? 'Product' : 'Cash'}</Text></View>
                {rowDebt.borrowing === 'product' ? <>
                  {lines.map(line => <View key={line.productId} className="flex-row flex-wrap justify-between gap-x-3 gap-y-1 pl-3">
                    <Text className="min-w-0 flex-1 type-micro-caption text-text-primary">{line.quantity} × {line.itemName}</Text>
                    <Text className="type-micro-caption text-text-primary">{formatPesos(line.quantity * line.unitPriceCentavos)}</Text>
                  </View>)}
                  <View className="flex-row flex-wrap justify-between gap-2 border-t border-outline pt-3"><Text className="type-label-nav text-text-secondary">Product Subtotal</Text><Text className="type-button-cta text-brand">{formatPesos(subtotal)}</Text></View>
                </> : <View className="flex-row flex-wrap justify-between gap-2"><Text className="type-label-nav text-text-primary">Amount Borrowed</Text><Text className="type-button-cta text-brand">{formatPesos(row.originalCentavos)}</Text></View>}
                <View className="flex-row flex-wrap justify-between gap-2"><Text className="type-label-nav text-text-primary">Borrowing Date</Text><Text className="type-micro-caption text-text-primary">{formatCalendarDate(rowDebt.occurredAt.slice(0, 10))}</Text></View>
                <View className="flex-row flex-wrap justify-between gap-2"><Text className="type-label-nav text-text-primary">Due Date</Text><Text className="type-label-nav" style={{ color: row.status === 'overdue' ? colors.red : colors.blue }}>{rowDebt.dueDate ? formatCalendarDate(rowDebt.dueDate) : 'No due date'}</Text></View>
                {!!rowDebt.details && <Text className="border-t border-outline pt-3 type-micro-caption text-text-secondary">{rowDebt.details}</Text>}
              </View>;
            })}
          </View>
        </View>

        {paidDetails && <ReceivableSummaryCard title="Total Amount" amountCentavos={remainingCentavos} paid amountPrefix="Balance: " />}

        <View className="overflow-hidden rounded-card border border-outline bg-white">
          <MotionPressable accessibilityRole="button" accessibilityLabel={history.length ? `Payment History, ${history.length} payments` : 'Payment History'}
            accessibilityState={{ expanded: history.length > 0 ? historyExpanded : true }} onPress={() => { if (history.length) setHistoryState(previous => ({ debtId, expanded: previous.debtId === debtId ? !previous.expanded : true })); }}
            className="min-h-12 flex-row items-center gap-3 px-4 py-3">
            <AppIcon name="history" size={28} color={colors.blue} />
            <Text accessibilityRole="header" className="min-w-0 flex-1 type-list-financial text-brand">Payment History</Text>
            {!!history.length && <>
              <Text className="type-helper text-text-primary">{history.length} {history.length === 1 ? 'payment' : 'payments'}</Text>
              <Animated.View style={chevronStyle}><AppIcon name="chevronDown" size={20} color={tokens.color.textPrimary} /></Animated.View>
            </>}
          </MotionPressable>
          {!history.length ? <View className="items-center gap-2 px-4 pb-5 pt-2">
            <AppIcon name="search" size={52} color={colors.blue} />
            <Text className="type-button-cta text-brand">No Payments Yet</Text>
            <Text className="text-center type-micro-caption text-brand">This debt record has no payment transactions.</Text>
          </View> : <MotionDisclosure visible={historyExpanded}>
            <View className="gap-3 px-4 pb-4">
              {history.map(({ payment, debtId: paymentDebtId }, index) => <View key={payment.id} className="flex-row flex-wrap items-start gap-3 border-b border-outline pb-3" style={{ borderBottomWidth: index < history.length - 1 ? 1 : 0 }}>
                <AppIcon name="checkCircle" size={24} color={colors.green} />
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="type-label-nav text-text-primary">Payment {history.length - index}</Text>
                  <Text className="type-micro-caption text-text-secondary">{paymentDate(payment.occurredAt)} · Ref {paymentDebtId.slice(-8)}</Text>
                  {!!payment.reference && <Text selectable className="type-micro-caption text-text-secondary">GCash reference: {payment.reference}</Text>}
                </View>
                <Text className="type-button-cta" style={{ color: colors.green }}>+{formatPesos(payment.amountCentavos)}</Text>
              </View>)}
            </View>
          </MotionDisclosure>}
        </View>
        <View className="gap-3 pt-2">
          {!paidDetails && selectedBalance.remainingCentavos > 0 && <Button onPress={recordPayment}>Record Payment</Button>}
          {!paidDetails && <Button variant="secondary" onPress={back}>Cancel</Button>}
        </View>
      </View>}
  </InventoryFrame>;
}
