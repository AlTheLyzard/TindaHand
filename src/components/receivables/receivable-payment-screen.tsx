import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { EmptyState as ContentState } from '@/components/ui/content-state';
import { useQuickAdd } from '@/state/quick-add';
import { useReceivableDraft } from '@/state/receivable-draft';
import { localCalendarDate, receivableBalance, receivablePaymentError } from '@/utils/receivables';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { payableAmountInput, payableDueLabel } from '@/utils/payables';
import { formatPesos } from '@/utils/dashboard';
import { debtDescription, receivableColors as colors, receivablesRoot } from './receivables-ui';

export function ReceivablePaymentScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { records, receivablePayments, confirmReceivablePayment } = useQuickAdd();
  const { setQuery } = useReceivableDraft();
  const debt = records.find(record => record.kind === 'customerDebt' && record.id === debtId);
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const busy = useRef(false);
  const input = useRef<TextInputInstance>(null);
  const [token] = useState(() => `receivable-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const today = localCalendarDate();
  const balance = debt ? receivableBalance(debt, receivablePayments, today) : null;
  const outstanding = balance?.remainingCentavos ?? 0;
  const validation = receivablePaymentError(amount, outstanding);
  const entered = parsePaymentAmount(amount) ?? 0;
  const remaining = validation ? outstanding : outstanding - entered;
  const status = remaining === 0 ? 'Paid' : debt?.dueDate && debt.dueDate < today ? 'Overdue' : !validation || (balance?.paidCentavos ?? 0) > 0 ? 'Remaining Balance' : 'Pending';
  const color = status === 'Paid' ? colors.green : status === 'Overdue' ? colors.red : status === 'Remaining Balance' ? colors.orange : colors.blue;
  const surface = status === 'Paid' ? colors.greenSurface : status === 'Overdue' ? colors.redSurface : status === 'Remaining Balance' ? colors.partialSurface : colors.blueSurface;
  const update = (value: string) => { setAmount(value); setFailure(''); };
  function back(nextStatus = 'unpaid') {
    if (busy.current) return;
    Keyboard.dismiss();
    router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: nextStatus } });
  }
  async function confirm() {
    if (busy.current || !debt) return;
    setSubmitted(true);
    if (validation) { input.current?.focus(); return; }
    busy.current = true; setSaving(true); setFailure(''); Keyboard.dismiss();
    try {
      await confirmReceivablePayment(token, debt.id, amount);
      setQuery('');
      router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: remaining === 0 ? 'paid' : 'unpaid' } });
    } catch (reason) {
      busy.current = false; setSaving(false);
      setFailure(reason instanceof Error ? reason.message : 'Could not record payment. Please try again.');
    }
  }
  return <InventoryFrame title="Record Payment" back inlineTitle onBack={() => back()} onNavigate={action => { if (!busy.current) action(); }}>
    {!debt || !balance || outstanding === 0 ? <ContentState title={debt ? 'This debt is fully paid' : 'Debt not available'} description={debt ? 'You can review this debt in Paid records.' : 'Return to Account Balances and choose an available debt.'} action="Back to Account Balances" onAction={() => back(debt ? 'paid' : 'unpaid')} /> : <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
      <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">{debtDescription}</Text>
      <View className="gap-5 rounded-control border border-[#2F6CC9] bg-brand p-5">
        <View className="flex-row flex-wrap justify-between gap-2"><Text className="min-w-0 flex-shrink font-poppins-semibold text-[14px] text-white">{debt.name} · Total Debt</Text><Text className="font-poppins-bold text-[16px] text-white">{formatPesos(balance.originalCentavos)}</Text></View>
        <View className="gap-2"><Text className="font-poppins-semibold text-[12px] text-white">Current Balance</Text><Text className="font-poppins-bold text-[30px] leading-[45px] text-white">{formatPesos(outstanding)}</Text></View>
        <Text className="font-poppins text-[11px] leading-[18px] text-white">{payableDueLabel(debt.dueDate, today)} · Ref {debt.id.slice(-10)}</Text>
      </View>
      <View className="gap-4 rounded-card bg-white p-4">
        <QuickAddField ref={input} label="Payment Amount" required={false} money value={amount} onChangeText={update} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} error={submitted ? validation : undefined} />
        <Text className="font-poppins-semibold text-[12px] text-text-secondary">Quick Amount</Text>
        <Button fullWidth={false} shape="pill" disabled={saving} onPress={() => update(payableAmountInput(outstanding))}>Full Payment</Button>
        <View className="flex-row flex-wrap gap-2">{[10000, 20000, 50000].map(shortcut => {
          const disabled = saving || shortcut > outstanding;
          return <Button key={shortcut} fullWidth={false} shape="pill" variant="secondary" accessibilityLabel={`Set payment to ${formatPesos(shortcut)}`} disabled={disabled} onPress={() => update(payableAmountInput(shortcut))} style={{ minWidth: 70, flex: 1 }}>{`₱${shortcut / 100}`}</Button>;
        })}</View>
      </View>
      <View accessibilityLiveRegion="polite" className="gap-4 rounded-card p-5" style={{ backgroundColor: surface }}>
        <View className="flex-row flex-wrap items-center justify-between gap-3"><Text className="font-poppins-semibold text-[12px]" style={{ color }}>Preview</Text><Text className="rounded-control bg-white px-3 py-2 font-poppins-semibold text-[12px]" style={{ color }}>{status}</Text></View>
        <Text className="font-poppins-semibold text-[22px] leading-[33px]" style={{ color }}>Remaining Balance: {formatPesos(remaining)}</Text>
        {!validation && <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">{formatPesos(outstanding)} − {formatPesos(entered)} = {formatPesos(remaining)}</Text>}
        <Text className="font-poppins text-[11px] leading-[18px] text-text-secondary">Preview only. The debt record will be updated once the payment is confirmed.</Text>
      </View>
      {!!failure && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{failure}</Text>}
      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="min-w-[100px] flex-1"><Button variant="secondary" disabled={saving} onPress={() => back()}>Cancel</Button></View>
        <View className="min-w-[160px] flex-1"><Button loading={saving} disabled={submitted && !!validation} onPress={() => void confirm()}>Confirm Payment</Button></View>
      </View>
    </View>}
  </InventoryFrame>;
}
