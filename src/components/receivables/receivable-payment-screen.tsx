import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Keyboard, Text, View, type TextInputInstance } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { QuickAddField, quickAddColors } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { EmptyState as ContentState } from '@/components/ui/content-state';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { KeyboardAwareScrollView as ScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { SuccessContent } from '@/components/ui/success-content';
import { useQuickAdd } from '@/state/quick-add';
import { useReceivableDraft } from '@/state/receivable-draft';
import { localCalendarDate, receivableBalance, receivablePaymentError } from '@/utils/receivables';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { payableAmountInput, payableDueLabel } from '@/utils/payables';
import { formatPesos } from '@/utils/dashboard';
import type { ReceivablePayment, ReceivableStatus } from '@/types/receivables';
import tokens from '@/constants/design-tokens.json';
import { debtDescription, receivableStatusAppearance, ReceivableStatusPill, receivablesRoot } from './receivables-ui';

type PaymentSuccess = Pick<ReceivablePayment, 'id' | 'amountCentavos'> & { remainingCentavos: number };
type PendingPaymentCommand = { debtId: string; amount: string; outstanding: number };

export function ReceivablePaymentScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { records, receivablePayments, confirmReceivablePayment } = useQuickAdd();
  const { setQuery } = useReceivableDraft();
  const debt = records.find(record => record.kind === 'customerDebt' && record.id === debtId);
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [savedPayment, setSavedPayment] = useState<PaymentSuccess | null>(null);
  const busy = useRef(false);
  const confirmationDismissed = useRef(true);
  const pendingPaymentCommand = useRef<PendingPaymentCommand | null>(null);
  const input = useRef<TextInputInstance>(null);
  const [token] = useState(() => `receivable-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const insets = useSafeAreaInsets();
  const today = localCalendarDate();
  const balance = debt ? receivableBalance(debt, receivablePayments, today) : null;
  const outstanding = balance?.remainingCentavos ?? 0;
  const validation = receivablePaymentError(amount, outstanding);
  const entered = parsePaymentAmount(amount) ?? 0;
  const remaining = validation ? outstanding : outstanding - entered;
  const previewStatus: ReceivableStatus = remaining === 0 ? 'paid' : debt?.dueDate && debt.dueDate < today ? 'overdue' : !validation || (balance?.paidCentavos ?? 0) > 0 ? 'partial' : 'pending';
  const previewAppearance = receivableStatusAppearance(previewStatus);
  const update = (value: string) => { setAmount(value); setFailure(''); };

  function back(nextStatus = 'unpaid') {
    if (busy.current) return;
    Keyboard.dismiss();
    router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status: nextStatus } });
  }
  function submitPayment() {
    if (busy.current || confirmationOpen || !confirmationDismissed.current || !debt) return;
    setSubmitted(true);
    if (validation) { input.current?.focus(); return; }
    Keyboard.dismiss();
    confirmationDismissed.current = false;
    setConfirmationOpen(true);
  }
  function confirmPayment() {
    if (busy.current || !confirmationOpen || !debt) return;
    setSubmitted(true);
    if (validation) {
      setConfirmationOpen(false);
      input.current?.focus();
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
      const payment = await confirmReceivablePayment(token, command.debtId, command.amount);
      setSavedPayment({ id: payment.id, amountCentavos: payment.amountCentavos, remainingCentavos: Math.max(0, command.outstanding - payment.amountCentavos) });
      setQuery('');
    } catch (reason) {
      setFailure(reason instanceof Error ? reason.message : 'Could not record payment. Please try again.');
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  function finishSuccess() {
    if (!savedPayment) return;
    const status = savedPayment.remainingCentavos === 0 ? 'paid' : 'unpaid';
    setSavedPayment(null);
    router.dismissTo({ pathname: receivablesRoot, params: { section: 'receivable', status } });
  }
  function afterConfirmationHidden() {
    confirmationDismissed.current = true;
    const command = pendingPaymentCommand.current;
    pendingPaymentCommand.current = null;
    if (command) void persistPayment(command);
  }

  const overlay: ReactNode = <>
    <MotionModal visible={confirmationOpen} backdropColor={quickAddColors.backdrop}
      onRequestClose={() => { if (!busy.current) setConfirmationOpen(false); }}
      onHidden={afterConfirmationHidden}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          <ConfirmationContent variant="quickAdd" title="Confirm Payment?"
            message={`Customer: ${debt?.name ?? 'Customer'}\nPayment Amount: ${formatPesos(entered)}\nRemaining Balance: ${formatPesos(remaining)}`}
            cancelLabel="Cancel" confirmLabel="Confirm Payment" titleColor={tokens.color.textPrimary} iconTone="blue" destructive={false} cancelVariant="secondary"
            onCancel={() => setConfirmationOpen(false)} onConfirm={() => void confirmPayment()} />
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
    <MotionModal visible={!!savedPayment} backdropColor={quickAddColors.backdrop} onRequestClose={finishSuccess}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          {savedPayment && <SuccessContent testID="receivable-payment-success" visible={!!savedPayment} eventKey={savedPayment.id}
            title={savedPayment.remainingCentavos === 0 ? 'Debt Paid' : 'Payment Saved'} value={formatPesos(savedPayment.amountCentavos)}
            message={savedPayment.remainingCentavos === 0 ? `${debt?.name ?? 'Customer'}'s debt is fully paid.` : `Payment recorded for ${debt?.name ?? 'customer'}. Remaining balance: ${formatPesos(savedPayment.remainingCentavos)}.`}
            onClose={finishSuccess} />}
        </ScrollView>
      </SafeAreaView>
    </MotionModal>
  </>;

  return <InventoryFrame title="Record Payment" back inlineTitle onBack={() => back()} onNavigate={action => { if (!busy.current) action(); }} overlay={overlay}>
    {!debt || !balance || outstanding === 0 ? <ContentState title={debt ? 'This debt is fully paid' : 'Debt not available'} description={debt ? 'You can review this debt in Paid records.' : 'Return to Account Balances and choose an available debt.'} action="Back to Account Balances" onAction={() => back(debt ? 'paid' : 'unpaid')} /> : <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
      <Text className=" type-micro-financial-rate leading-[21px] text-text-secondary">{debtDescription}</Text>
      <View className="gap-5 rounded-control border border-accent bg-brand p-5">
        <View className="flex-row flex-wrap justify-between gap-2"><Text className="min-w-0 flex-shrink type-micro-financial-rate text-white">{debt.name} · Total Debt</Text><Text className=" type-list-financial text-white">{formatPesos(balance.originalCentavos)}</Text></View>
        <View className="gap-2"><Text className=" type-label-nav text-white">Current Balance</Text><Text className=" type-large-metric leading-[45px] text-white">{formatPesos(outstanding)}</Text></View>
        <Text className=" type-micro-caption leading-[18px] text-white">{payableDueLabel(debt.dueDate, today)} · Ref {debt.id.slice(-10)}</Text>
      </View>
      <View className="gap-4 rounded-card bg-white p-4">
        <QuickAddField ref={input} label="Payment Amount" required={false} money value={amount} onChangeText={update} placeholder="0.00" inputMode="decimal" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} error={submitted ? validation : undefined} />
        <Text className=" type-label-nav text-text-secondary">Quick Amount</Text>
        <Button fullWidth={false} shape="pill" disabled={saving} onPress={() => update(payableAmountInput(outstanding))}>Full Payment</Button>
        <View className="flex-row flex-wrap gap-2">{[10000, 20000, 50000].map(shortcut => {
          const disabled = saving || shortcut > outstanding;
          return <Button key={shortcut} fullWidth={false} shape="pill" variant="secondary" accessibilityLabel={`Set payment to ${formatPesos(shortcut)}`} disabled={disabled} onPress={() => update(payableAmountInput(shortcut))} style={{ minWidth: 70, flex: 1 }}>{formatPesos(shortcut)}</Button>;
        })}</View>
      </View>
      <View accessibilityLiveRegion="polite" className="gap-4 rounded-card p-5" style={{ backgroundColor: previewAppearance.surface }}>
        <View className="flex-row flex-wrap items-center justify-between gap-3"><Text className=" type-label-nav" style={{ color: previewAppearance.color }}>Preview</Text><ReceivableStatusPill status={previewStatus} /></View>
        <Text className=" type-title-accent leading-[33px]" style={{ color: previewAppearance.color }}>Remaining Balance: {formatPesos(remaining)}</Text>
        {!validation && <Text className=" type-micro-financial-rate leading-[21px] text-text-secondary">{formatPesos(outstanding)} − {formatPesos(entered)} = {formatPesos(remaining)}</Text>}
        <Text className=" type-micro-caption leading-[18px] text-text-secondary">Preview only. The debt record will be updated once the payment is confirmed.</Text>
      </View>
      {!!failure && <Text accessibilityRole="alert" className=" type-micro-caption text-error-base">{failure}</Text>}
      <View className="mt-3 flex-row flex-wrap gap-3">
        <View className="min-w-[100px] flex-1"><Button variant="secondary" disabled={saving} onPress={() => back()}>Cancel</Button></View>
        <View className="min-w-[160px] flex-1"><Button loading={saving} disabled={saving || (submitted && !!validation)} onPress={submitPayment}>Confirm Payment</Button></View>
      </View>
    </View>}
  </InventoryFrame>;
}
