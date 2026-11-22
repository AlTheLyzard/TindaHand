import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { BalancePanel } from '@/components/payables/payables-ui';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/content-state';
import { useQuickAdd } from '@/state/quick-add';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { localCalendarDate, receivableBalance } from '@/utils/receivables';
import tokens from '@/constants/design-tokens.json';
import { receivableColors as colors, receivableStatusAppearance, ReceivableStatusPill, receivablesRoot } from './receivables-ui';

function paymentDate(value: string) {
  return `${formatCalendarDate(value.slice(0, 10))} · ${new Date(value).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
}

export function ReceivableDetailsScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { records, receivablePayments } = useQuickAdd();
  const debt = records.find(record => record.kind === 'customerDebt' && record.id === debtId);
  const today = localCalendarDate();
  const selectedBalance = debt ? receivableBalance(debt, receivablePayments, today) : null;
  const paidDetails = selectedBalance?.status === 'paid';
  const customerDebts = debt ? records.filter(record => record.kind === 'customerDebt' && record.customerId === debt.customerId) : [];
  const allBalances = customerDebts.map(item => receivableBalance(item, receivablePayments, today));
  const detailBalances = paidDetails ? allBalances.filter(row => row.status === 'paid') : allBalances;
  const originalCentavos = detailBalances.reduce((sum, row) => sum + row.originalCentavos, 0);
  const paidCentavos = detailBalances.reduce((sum, row) => sum + row.paidCentavos, 0);
  const remainingCentavos = detailBalances.reduce((sum, row) => sum + row.remainingCentavos, 0);
  const progress = originalCentavos ? paidCentavos / originalCentavos * 100 : 0;
  const overdue = !paidDetails && detailBalances.some(row => row.status === 'overdue');
  const partial = !paidDetails && !overdue && detailBalances.some(row => row.status === 'partial');
  const status = paidDetails ? 'paid' : overdue ? 'overdue' : partial ? 'partial' : 'pending';
  const { color } = receivableStatusAppearance(status);
  const borrowingGroups = [...detailBalances.reduce((groups, row) => {
    const date = row.debt.occurredAt.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), row]);
    return groups;
  }, new Map<string, typeof detailBalances>()).entries()].sort(([first], [second]) => second.localeCompare(first));
  const history = detailBalances.flatMap(row => row.history.map(payment => ({ payment, debtId: row.debt.id })))
    .sort((first, second) => first.payment.occurredAt.localeCompare(second.payment.occurredAt));

  function back() {
    router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: paidDetails ? 'paid' : 'unpaid' } });
  }
  function recordPayment() {
    if (!debt || !selectedBalance || selectedBalance.status === 'paid') return;
    router.push({ pathname: `${receivablesRoot}/customer-payment`, params: { debtId: debt.id } });
  }

  return <InventoryFrame title={paidDetails ? 'Paid Details' : 'Customer Debt Details'} back inlineTitle onBack={back}>
    {!debt || !selectedBalance ? <EmptyState title="Debt not available" description="Return to Account Balances and choose an existing customer debt." action="Back to Account Balances" onAction={back} /> : <View className="gap-5">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Text accessibilityRole="header" className="min-w-0 flex-1 type-title-accent leading-[30px] text-text-primary">{debt.name}</Text>
        <ReceivableStatusPill status={status} />
      </View>
      <Text className=" type-micro-caption leading-[18px] text-text-secondary">{detailBalances.length} {detailBalances.length === 1 ? 'borrowing record' : 'borrowing records'} · Ref {debt.id.slice(-10)}</Text>

      <View className="flex-row rounded-control border p-3" style={{ borderColor: tokens.color.borderOutline, backgroundColor: tokens.color.surfaceSubtle }}>
        {[
          { title: 'Original Total Debt', value: originalCentavos, color: colors.blue },
          { title: 'Amount Paid', value: paidCentavos, color: colors.green },
          { title: 'Remaining Balance', value: remainingCentavos, color: colors.blue },
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
          {rows.map(row => {
            const rowDebt = row.debt;
            const lines = Object.values(rowDebt.items);
            const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCentavos, 0);
            return <View key={rowDebt.id} className="gap-4 rounded-card border bg-white p-4" style={{ borderColor: tokens.color.borderOutline }}>
              <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Borrowing Type</Text><Text className=" type-label-nav text-brand">{rowDebt.borrowing === 'product' ? 'Product' : 'Cash'}</Text></View>
              {rowDebt.borrowing === 'product' ? <>
                {lines.map(line => <View key={line.productId} className="flex-row flex-wrap justify-between gap-x-3 gap-y-1 pl-3">
                  <Text className="min-w-0 flex-1 type-micro-caption text-text-primary">{line.quantity} × {line.itemName}</Text><Text className=" type-micro-caption text-text-primary">{formatPesos(line.quantity * line.unitPriceCentavos)}</Text>
                </View>)}
                <View className="flex-row flex-wrap justify-between gap-2 border-t pt-3" style={{ borderColor: tokens.color.borderOutline }}><Text className=" type-label-nav text-text-secondary">Product Subtotal</Text><Text className=" type-button-cta text-brand">{formatPesos(subtotal)}</Text></View>
              </> : <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Amount Borrowed</Text><Text className=" type-button-cta text-brand">{formatPesos(row.originalCentavos)}</Text></View>}
              <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Borrowing Date</Text><Text className=" type-micro-caption text-text-primary">{formatCalendarDate(rowDebt.occurredAt.slice(0, 10))}</Text></View>
              <View className="flex-row flex-wrap justify-between gap-2"><Text className=" type-label-nav text-text-secondary">Due Date</Text><Text className=" type-label-nav" style={{ color: row.status === 'overdue' ? colors.red : colors.blue }}>{rowDebt.dueDate ? formatCalendarDate(rowDebt.dueDate) : 'No due date'}</Text></View>
              {!!rowDebt.details && <Text className="border-t pt-3 type-micro-caption text-text-secondary" style={{ borderColor: tokens.color.borderOutline }}>{rowDebt.details}</Text>}
            </View>;
          })}
        </View>)}
      </View>

      {paidDetails && <BalancePanel title="Total Amount" amount={formatPesos(originalCentavos)} paid />}

      <View className="gap-3">
        <Text accessibilityRole="header" className=" type-list-financial text-text-primary">Payment History</Text>
        {!history.length ? <View className="items-center gap-2 rounded-card border bg-white p-5" style={{ borderColor: tokens.color.borderOutline }}>
          <Text className=" type-micro-financial-rate text-text-primary">No Payments Yet</Text><Text className="text-center type-micro-caption text-text-secondary">This customer has no payment transactions.</Text>
        </View> : <View className="gap-3 rounded-card border bg-white p-4" style={{ borderColor: tokens.color.borderOutline }}>
          {history.map(({ payment, debtId: paymentDebtId }, index) => <View key={payment.id} className="flex-row flex-wrap items-start justify-between gap-2 pb-3" style={{ borderBottomWidth: index < history.length - 1 ? 1 : 0, borderColor: tokens.color.borderOutline }}>
            <View className="min-w-0 flex-1 gap-1"><Text className=" type-label-nav text-text-primary">Payment {index + 1}</Text><Text className=" type-micro-caption text-text-secondary">{paymentDate(payment.occurredAt)} · Ref {paymentDebtId.slice(-8)}</Text>{!!payment.reference && <Text selectable className=" type-micro-caption text-text-secondary">GCash reference: {payment.reference}</Text>}</View>
            <Text className=" type-button-cta" style={{ color: colors.green }}>+{formatPesos(payment.amountCentavos)}</Text>
          </View>)}
        </View>}
      </View>

      {selectedBalance.remainingCentavos > 0 && <Button onPress={recordPayment}>Record Payment</Button>}
      {!paidDetails && <Button variant="secondary" onPress={back}>Cancel</Button>}
    </View>}
  </InventoryFrame>;
}
