import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { QuickAddField, quickAddColors } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { KeyboardAwareScrollView as ScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { SuccessContent } from '@/components/ui/success-content';
import { useQuickAdd } from '@/state/quick-add';
import { usePayableDraft } from '@/state/payable-draft';
import { payableAmountInput, payableBalance, payablePaymentError } from '@/utils/payables';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import { balancesRoot, payableColors } from './payables-ui';
import type { PayablePayment } from '@/types/payables';
import tokens from '@/constants/design-tokens.json';

const paymentPresets = [50000, 100000, 200000];
type PaymentSuccess = Pick<PayablePayment, 'id' | 'amountCentavos'> & { remainingCentavos: number };
type PendingPaymentCommand = { debtId: string; amount: string; outstanding: number };

export function PayablePaymentScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { payables, confirmPayablePayment } = useQuickAdd();
  const { setSearchQuery } = usePayableDraft();
  const debt = payables.debts.find(row => row.id === debtId);
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [savedPayment, setSavedPayment] = useState<PaymentSuccess | null>(null);
  const busy = useRef(false);
  const confirmationDismissed = useRef(true);
  const pendingPaymentCommand = useRef<PendingPaymentCommand | null>(null);
  const amountInput = useRef<TextInputInstance>(null);
  const [token] = useState(() => `payable-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const insets = useSafeAreaInsets();
  const balance = debt ? payableBalance(debt, payables.payments) : null;
  const outstanding = balance?.remainingCentavos ?? 0;
  const validation = payablePaymentError(amount, outstanding);
  const valid = !validation;
  const entered = parsePaymentAmount(amount) ?? 0;
  const remaining = valid ? outstanding - entered : outstanding;
  const previewStatus = remaining === 0 ? 'Paid' : 'Remaining Balance';
  const update = (value: string) => { setAmount(value); setFailure(''); };

  function back(nextStatus = 'unpaid') {
    if (busy.current) return;
    Keyboard.dismiss();
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: nextStatus } });
  }
  function submitPayment() {
    if (busy.current || confirmationOpen || !confirmationDismissed.current || !debt) return;
    setSubmitted(true);
    if (validation) { amountInput.current?.focus(); return; }
    Keyboard.dismiss();
    confirmationDismissed.current = false;
    setConfirmationOpen(true);
  }
  function confirmPayment() {
    if (busy.current || !confirmationOpen || !debt) return;
    setSubmitted(true);
    if (validation) {
      setConfirmationOpen(false);
      amountInput.current?.focus();
      return;
    }
    busy.current = true;
    pendingPaymentCommand.current = { debtId: debt.id, amount, outstanding };
    setConfirmationOpen(false);
    setSaving(true);
    setFailure('');
  }
  async function persistPayment(command: PendingPaymentCommand) {
    try {
      // Repository revalidates against cumulative confirmed payments, not this preview.
      const payment = await confirmPayablePayment(token, command.debtId, command.amount);
      setSavedPayment({ id: payment.id, amountCentavos: payment.amountCentavos, remainingCentavos: Math.max(0, command.outstanding - payment.amountCentavos) });
      setSearchQuery('');
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : 'Could not confirm this payment. Check the current balance and try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function finishSuccess() {
    if (!savedPayment) return;
    const nextStatus = savedPayment.remainingCentavos === 0 ? 'paid' : 'unpaid';
    setSavedPayment(null);
    router.dismissTo({ pathname: balancesRoot, params: { section: 'payable', status: nextStatus } });
  }
  function afterConfirmationHidden() {
    confirmationDismissed.current = true;
    const command = pendingPaymentCommand.current;
    pendingPaymentCommand.current = null;
    if (command) void persistPayment(command);
  }

  const overlay: ReactNode = <>
    <MotionModal visible={confirmationOpen} backdropColor={quickAddColors.backdrop}
      onRequestClose={() => { if (!busy.current) setConfirmationOpen(false); }} onHidden={afterConfirmationHidden}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <ConfirmationContent variant="quickAdd" title="Confirm Payment?"
            message={`Creditor: ${debt?.name ?? 'Creditor'}\nPayment Amount: ${formatPesos(entered)}\nRemaining Balance: ${formatPesos(remaining)}`}
            cancelLabel="Cancel" confirmLabel="Confirm Payment" titleColor={tokens.color.textPrimary} iconTone="blue" destructive={false} cancelVariant="secondary"
            onCancel={() => setConfirmationOpen(false)} onConfirm={confirmPayment} />
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
    <MotionModal visible={!!savedPayment} backdropColor={quickAddColors.backdrop} onRequestClose={finishSuccess}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          {savedPayment && <SuccessContent testID="payable-payment-success" visible={!!savedPayment} eventKey={savedPayment.id}
            title={savedPayment.remainingCentavos === 0 ? 'Debt Paid' : 'Payment Saved'} value={formatPesos(savedPayment.amountCentavos)}
            message={savedPayment.remainingCentavos === 0 ? `${debt?.name ?? 'Creditor'}'s debt is fully paid.` : `Payment recorded for ${debt?.name ?? 'creditor'}. Remaining balance: ${formatPesos(savedPayment.remainingCentavos)}.`}
            onClose={finishSuccess} />}
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
  </>;

  return <InventoryFrame title="Record Payment" back inlineTitle onBack={() => back()} overlay={overlay} onNavigate={action => { if (!busy.current) action(); }}>
    {!debt || !balance || outstanding === 0 ? <View className="gap-4 rounded-card bg-white p-5">
      <Text className="font-poppins text-[14px] text-brand">{debt ? 'This debt is fully paid.' : 'This debt is not available.'}</Text>
      <Button onPress={() => back(debt ? 'paid' : 'unpaid')}>Back to Account Balances</Button>
    </View> : <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
      <View className="gap-5 rounded-control border border-[#2F6CC9] p-5" style={{ backgroundColor: '#112F6F' }}>
        <View className="flex-row flex-wrap justify-between gap-2"><Text className="font-poppins-semibold text-[14px] text-white">Total Debt</Text><Text className="font-poppins-bold text-[16px] text-white">{formatPesos(debt.originalAmountCentavos)}</Text></View>
        <View className="gap-2"><Text className="font-poppins-semibold text-[14px] text-white">Current Balance</Text><Text className="font-poppins-bold text-[30px] leading-[45px] text-white">{formatPesos(outstanding)}</Text></View>
        <Text className="font-poppins text-[12px] leading-[18px] text-white">Payment Due Date: {debt.dueDate ? formatCalendarDate(debt.dueDate) : 'No due date'}</Text>
      </View>
      <View className="gap-4 rounded-card bg-white p-4">
        <QuickAddField ref={amountInput} label="Payment Amount" required={false} money value={amount} onChangeText={update} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} error={submitted ? validation : undefined} />
        <Text className="font-poppins-semibold text-[12px] text-text-secondary">Quick Amount</Text>
        <Button shape="pill" variant="secondary" disabled={saving} onPress={() => update(payableAmountInput(outstanding))}>Full Payment</Button>
        <View className="flex-row flex-wrap gap-2">
          {paymentPresets.map(preset => <Button key={preset} fullWidth={false} shape="pill" variant="secondary" compact accessibilityLabel={`Set payment amount to ${formatPesos(preset)}`} disabled={saving || preset > outstanding}
            onPress={() => update(payableAmountInput(preset))} style={{ minWidth: 70, flex: 1 }}>{formatPesos(preset).replace('.00', '')}</Button>)}
        </View>
      </View>
      <MotionLayout accessibilityLiveRegion="polite" className="gap-4 rounded-card p-5" style={{ backgroundColor: payableColors.greenSurface }}>
        <View className="flex-row flex-wrap items-center justify-between gap-3"><Text className="font-poppins-semibold text-[12px]" style={{ color: payableColors.green }}>Preview</Text><Text className="rounded-control bg-white px-3 py-2 font-poppins-semibold text-[12px]" style={{ color: payableColors.green }}>{previewStatus}</Text></View>
        <Text className="font-poppins-semibold text-[22px] leading-[33px]" style={{ color: payableColors.green }}>Remaining Balance:</Text>
        <Text className="font-poppins-bold text-[24px] leading-9" style={{ color: payableColors.green }}>{formatPesos(remaining)}</Text>
        {valid && <Text className="font-poppins text-[14px] leading-[21px] text-text-secondary">{formatPesos(outstanding)} - {formatPesos(entered)} = {formatPesos(remaining)}</Text>}
        <Text className="font-poppins text-[11px] leading-[18px] text-text-secondary">Preview only. The debt record will be updated once the payment is confirmed.</Text>
      </MotionLayout>
      {!!failure && <MotionRegion><Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{failure}</Text></MotionRegion>}
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[100px] flex-1"><Button variant="secondary" disabled={saving} onPress={() => back()}>Cancel</Button></View>
        <View className="min-w-[160px] flex-1"><Button loading={saving} disabled={saving || (submitted && !!validation)} onPress={submitPayment}>Confirm Payment</Button></View>
      </View>
    </View>}
  </InventoryFrame>;
}
