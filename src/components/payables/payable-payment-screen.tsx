import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { QuickAddField } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { useQuickAdd } from '@/state/quick-add';
import { addPayableShortcut, payableAmountInput, payableBalance, payableDueLabel, payablePaymentError } from '@/utils/payables';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { formatPesos } from '@/utils/dashboard';
import { todayInManila } from '@/utils/inventory';
import { balancesRoot, payableColors } from './payables-ui';

export function PayablePaymentScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { payables, confirmPayablePayment } = useQuickAdd();
  const debt = payables.debts.find(row => row.id === debtId);
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const busy = useRef(false);
  const amountInput = useRef<TextInputInstance>(null);
  const [token] = useState(() => `payable-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const balance = debt ? payableBalance(debt, payables.payments) : null;
  const outstanding = balance?.remainingCentavos ?? 0;
  const validation = payablePaymentError(amount, outstanding);
  const valid = !validation;
  const entered = parsePaymentAmount(amount) ?? 0;
  const remaining = valid ? outstanding - entered : outstanding;
  const status = valid ? remaining === 0 ? 'Paid' : 'Partially Paid' : balance?.status === 'partial' ? 'Partially Paid' : 'Pending';
  const previewColor = status === 'Paid' ? payableColors.green : status === 'Partially Paid' ? payableColors.orange : payableColors.blue;
  const update = (value: string) => { setAmount(value); setFailure(''); };
  function back(nextStatus = 'unpaid') {
    if (busy.current) return;
    Keyboard.dismiss();
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: nextStatus } });
  }
  async function confirm() {
    if (busy.current || !debt) return;
    setSubmitted(true);
    if (validation) { amountInput.current?.focus(); return; }
    busy.current = true; setSaving(true); setFailure(''); Keyboard.dismiss();
    try {
      // Repository revalidates against cumulative confirmed payments, not this preview.
      await confirmPayablePayment(token, debt.id, amount);
      router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: remaining === 0 ? 'paid' : 'unpaid' } });
    } catch {
      busy.current = false; setSaving(false);
      setFailure('Could not confirm this payment. Check the current balance and try again.');
    }
  }
  return <InventoryFrame title="Record Payment" back inlineTitle onBack={() => back()} onNavigate={action => { if (!busy.current) action(); }}>
    {!debt || !balance || outstanding === 0 ? <View className="gap-4 rounded-card bg-white p-5">
      <Text accessibilityRole="status" className="font-poppins text-[14px] text-brand">{debt ? 'This debt is fully paid.' : 'This debt is not available.'}</Text>
      <Button onPress={() => back(debt ? 'paid' : 'unpaid')}>Back to Account Balances</Button>
    </View> : <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
      <View className="mt-5 gap-5 rounded-control border border-[#2F6CC9] bg-brand p-5">
        <Text className="font-poppins-semibold text-[18px] text-white">{debt.name}</Text>
        <View className="flex-row flex-wrap justify-between gap-2"><Text className="font-poppins-semibold text-[12px] text-white">Total Debt</Text><Text className="font-poppins-bold text-[16px] text-white">{formatPesos(debt.originalAmountCentavos)}</Text></View>
        <View className="gap-2"><Text className="font-poppins-semibold text-[12px] text-white">Current Balance</Text><Text className="font-poppins-bold text-[30px] leading-[45px] text-white">{formatPesos(outstanding)}</Text></View>
        <Text className="font-poppins text-[11px] leading-[18px] text-white">{payableDueLabel(debt.dueDate, todayInManila())}</Text>
      </View>
      <View className="gap-4 rounded-card bg-white p-4">
        <QuickAddField ref={amountInput} label="Payment Amount" required={false} money value={amount} onChangeText={update} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} error={submitted ? validation : undefined} />
        <Text className="font-poppins-semibold text-[12px] text-text-secondary">Quick Amount</Text>
        <Button fullWidth={false} shape="pill" variant="secondary" compact disabled={saving} onPress={() => update(payableAmountInput(outstanding))}>Full Payment</Button>
        <View className="flex-row flex-wrap gap-2">
          {[50000, 100000, 200000].map(increment => {
            const next = addPayableShortcut(amount, increment, outstanding);
            const disabled = saving || next === null;
            return <Button key={increment} fullWidth={false} shape="pill" compact accessibilityLabel={`Add ${formatPesos(increment)}`} disabled={disabled} onPress={() => { if (next !== null) update(next); }} style={{ minWidth: 85, flex: 1 }}>{`+ ₱${increment / 100}`}</Button>;
          })}
        </View>
      </View>
      <MotionLayout accessibilityLiveRegion="polite" className="gap-4 rounded-card p-5" style={{ backgroundColor: status === 'Paid' ? payableColors.greenSurface : status === 'Partially Paid' ? payableColors.partialSurface : payableColors.blueSurface }}>
        <View className="flex-row flex-wrap items-center justify-between gap-3"><Text className="font-poppins-semibold text-[12px]" style={{ color: previewColor }}>Preview</Text><Text className="rounded-control bg-white px-3 py-2 font-poppins-semibold text-[12px]" style={{ color: previewColor }}>{status}</Text></View>
        <Text className="font-poppins-semibold text-[22px] leading-[33px]" style={{ color: previewColor }}>Remaining Balance:</Text>
        <Text className="font-poppins-bold text-[24px] leading-9" style={{ color: previewColor }}>{formatPesos(remaining)}</Text>
        {valid && <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">{formatPesos(outstanding)} − {formatPesos(entered)} = {formatPesos(remaining)}</Text>}
        {valid && <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{formatPesos(balance.paidCentavos + entered)} paid of {formatPesos(debt.originalAmountCentavos)} · {((balance.paidCentavos + entered) / debt.originalAmountCentavos * 100).toFixed(2)}%</Text>}
        <Text className="font-poppins text-[11px] leading-[18px] text-text-secondary">Preview only. The debt record will be updated once the payment is confirmed.</Text>
      </MotionLayout>
      {!!failure && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{failure}</Text></MotionRegion>}
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[100px] flex-1"><Button variant="secondary" disabled={saving} onPress={() => back()}>Cancel</Button></View>
        <View className="min-w-[160px] flex-1"><Button loading={saving} onPress={() => void confirm()}>Confirm Payment</Button></View>
      </View>
    </View>}
  </InventoryFrame>;
}
