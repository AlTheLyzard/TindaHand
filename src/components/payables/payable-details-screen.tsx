import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { BalancePanel, balancesRoot, PayableStatusPill, payableColors } from './payables-ui';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/content-state';
import { usePushOnce } from '@/hooks/use-push-once';
import { useQuickAdd } from '@/state/quick-add';
import { useAuthFlow } from '@/state/auth-flow';
import { useApiPayables } from '@/hooks/use-payables';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { todayInManila } from '@/utils/inventory-stock';
import { payableBalance } from '@/utils/payables';
import tokens from '@/constants/design-tokens.json';
import type { PayableDisplayStatus } from './payables-ui';

function manilaDateTime(value: string) {
  const date = formatCalendarDate(value.slice(0, 10));
  const time = new Date(value).toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
  return `${date} · ${time}`;
}

export function PayableDetailsScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { payables: localPayables } = useQuickAdd();
  const { owner } = useAuthFlow();
  const confirmedMode = owner?.mode === 'confirmed';
  const { ledger: apiPayables } = useApiPayables(confirmedMode ? owner?.id : undefined);
  // Use API ledger in confirmed mode so details screen can find debts saved to backend
  const payables = confirmedMode ? apiPayables : localPayables;
  const debt = payables.debts.find(row => row.id === debtId);
  const today = todayInManila();
  const selectedBalance = debt ? payableBalance(debt, payables.payments) : null;
  const paidDetails = selectedBalance?.status === 'paid';
  const creditorDebts = debt ? payables.debts.filter(row => row.creditorId === debt.creditorId) : [];
  const allBalances = creditorDebts.map(item => ({ debt: item, ...payableBalance(item, payables.payments) }));
  const detailBalances = paidDetails ? allBalances.filter(row => row.status === 'paid') : allBalances;
  const originalCentavos = detailBalances.reduce((sum, row) => sum + row.debt.originalAmountCentavos, 0);
  const paidCentavos = detailBalances.reduce((sum, row) => sum + row.paidCentavos, 0);
  const remainingCentavos = detailBalances.reduce((sum, row) => sum + row.remainingCentavos, 0);
  const progress = originalCentavos ? paidCentavos / originalCentavos * 100 : 0;
  const overdue = !paidDetails && detailBalances.some(row => row.remainingCentavos > 0 && !!row.debt.dueDate && row.debt.dueDate < today);
  const partial = !paidDetails && !overdue && detailBalances.some(row => row.status === 'partial');
  const status: PayableDisplayStatus = paidDetails ? 'paid' : overdue ? 'overdue' : partial ? 'partial' : 'pending';
  const color = status === 'paid' ? payableColors.green : status === 'overdue' ? payableColors.red : status === 'partial' ? payableColors.orange : payableColors.blue;
  const borrowingGroups = [...detailBalances.reduce((groups, row) => {
    const date = row.debt.occurredAt.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), row]);
    return groups;
  }, new Map<string, typeof detailBalances>()).entries()].sort(([first], [second]) => second.localeCompare(first));
  const history = detailBalances.flatMap(row => row.history.map(payment => ({ payment, debtId: row.debt.id })))
    .sort((first, second) => first.payment.occurredAt.localeCompare(second.payment.occurredAt));
  const push = usePushOnce();

  function back() {
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: paidDetails ? 'paid' : 'unpaid' } });
  }
  function recordPayment() {
    if (!debt || !selectedBalance || selectedBalance.remainingCentavos <= 0) return;
    push({ pathname: `${balancesRoot}/payment`, params: { debtId: debt.id } });
  }

  return <InventoryFrame title={paidDetails ? 'Paid Details' : 'Creditor Debt Details'} back inlineTitle onBack={back}>
    {!debt || !selectedBalance ? <EmptyState title="Debt not available" description="Return to Account Balances and choose an existing business debt." action="Back to Account Balances" onAction={back} /> : <View className="gap-5">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Text accessibilityRole="header" className="min-w-0 flex-1 type-title-accent leading-[30px] text-text-primary">{debt.name}</Text>
        <PayableStatusPill status={status} />
      </View>
      <Text className=" type-micro-caption leading-[18px] text-text-secondary">{detailBalances.length} {detailBalances.length === 1 ? 'borrowing record' : 'borrowing records'} · Ref {debt.id.slice(-10)}</Text>

      <View className="flex-row rounded-control border p-3" style={{ borderColor: tokens.color.borderOutline, backgroundColor: tokens.color.surfaceSubtle }}>
        {[
          { title: 'Original Total Debt', value: originalCentavos, color: payableColors.blue },
          { title: 'Amount Paid', value: paidCentavos, color: payableColors.green },
          { title: 'Remaining Balance', value: remainingCentavos, color: payableColors.blue },
        ].map((item, index) => <View key={item.title} className="min-w-0 flex-1 items-center justify-center gap-2 px-1" style={index > 0 ? { borderLeftWidth: 1, borderLeftColor: tokens.color.borderOutline } : undefined}>
          <Text className="min-h-8 text-center type-helper leading-[14px] text-text-secondary">{item.title}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7} className=" type-label-nav" style={{ color: item.color }}>{formatPesos(item.value)}</Text>
        </View>)}
      </View>

      <View className="gap-3" style={{ marginBottom: tokens.spacing.four }}>
        <View className="flex-row flex-wrap items-center justify-between gap-2"><Text className=" type-micro-financial-rate text-text-secondary">Payment Progress</Text><Text className=" type-button-cta text-text-primary">{progress.toFixed(2)}%</Text></View>
        <View accessibilityRole="progressbar" accessibilityLabel="Payment progress" accessibilityValue={{ min: 0, max: 100, now: progress, text: `${progress.toFixed(2)}% paid` }} className="h-3 overflow-hidden rounded-pill" style={{ backgroundColor: tokens.color.surfaceSubtle }}>
          <View style={{ height: '100%', width: `${progress}%`, backgroundColor: color, borderRadius: 9999 }} />
        </View>
        <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-micro-caption text-text-secondary">{formatPesos(paidCentavos)} Paid</Text><Text className=" type-micro-caption text-text-secondary">{formatPesos(remainingCentavos)} Remaining</Text></View>
      </View>

      <View className="gap-3" style={{ marginBottom: tokens.spacing.four }}>
        <Text accessibilityRole="header" className=" type-list-financial text-text-primary">Borrowing Information</Text>
        {borrowingGroups.map(([date, rows]) => <View key={date} className="gap-3">
          <Text className=" type-label-nav text-text-secondary">{formatCalendarDate(date)}</Text>
          {rows.map(row => <View key={row.debt.id} className="gap-4 rounded-card border bg-white p-4" style={{ borderColor: tokens.color.borderOutline }}>
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-pill bg-accent-soft"><PosIcon name="money" size={20} color={payableColors.blue} /></View>
              <Text className=" type-micro-financial-rate text-text-secondary">Borrowing Information</Text>
            </View>
            <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Borrowing Type</Text><Text className=" type-label-nav text-brand">{row.debt.borrowingType === 'goods-stock' ? 'Goods/Stock' : 'Cash'}</Text></View>
            <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Amount Borrowed</Text><Text className=" type-label-nav text-brand">{formatPesos(row.debt.originalAmountCentavos)}</Text></View>
            <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Borrowing Date</Text><Text className=" type-micro-caption text-text-primary">{formatCalendarDate(row.debt.occurredAt.slice(0, 10))}</Text></View>
            <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Due Date</Text><Text className=" type-label-nav" style={{ color: row.remainingCentavos > 0 && row.debt.dueDate && row.debt.dueDate < today ? payableColors.red : payableColors.blue }}>{row.debt.dueDate ? formatCalendarDate(row.debt.dueDate) : 'No due date'}</Text></View>
            {!!row.debt.details && <Text className="border-t pt-3 type-micro-caption text-text-secondary" style={{ borderColor: tokens.color.borderOutline }}>{row.debt.details}</Text>}
          </View>)}
        </View>)}
      </View>

      {paidDetails && <BalancePanel title="Total Amount" amount={formatPesos(originalCentavos)} paid />}

      <View className="gap-3">
        <View className="gap-3 rounded-card border bg-white p-4" style={{ borderColor: tokens.color.borderOutline }}>
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-pill bg-accent-soft"><PosIcon name="history" size={18} color={payableColors.blue} /></View>
            <Text accessibilityRole="header" className=" type-micro-financial-rate text-text-secondary">Payment History</Text>
          </View>
          {!history.length ? <View className="items-center gap-2 p-3">
            <Text className=" type-micro-financial-rate text-text-primary">No Payments Yet</Text><Text className="text-center type-micro-caption text-text-secondary">This creditor has no payment transactions.</Text>
          </View> : history.map(({ payment, debtId: paymentDebtId }, index) => <View key={payment.id} className="flex-row flex-wrap items-start justify-between gap-2 pb-3" style={{ borderBottomWidth: index < history.length - 1 ? 1 : 0, borderColor: tokens.color.borderOutline }}>
            <View className="min-w-0 flex-1 gap-1"><Text className=" type-label-nav text-text-primary">Payment {index + 1}</Text><Text className=" type-micro-caption text-text-secondary">{manilaDateTime(payment.occurredAt)} · Ref {paymentDebtId.slice(-8)}</Text></View>
            <Text className=" type-button-cta" style={{ color: payableColors.green }}>+{formatPesos(payment.amountCentavos)}</Text>
          </View>)}
        </View>
      </View>

      {selectedBalance.remainingCentavos > 0 && <Button onPress={recordPayment}>Record Payment</Button>}
      {!paidDetails && <Button variant="secondary" onPress={back}>Cancel</Button>}
    </View>}
  </InventoryFrame>;
}
