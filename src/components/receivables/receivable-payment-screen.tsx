import { router, useLocalSearchParams, type Href } from 'expo-router';
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
import { useApiReceivables } from '@/hooks/use-receivables';
import { useReceivableDraft } from '@/state/receivable-draft';
import { localCalendarDate, receivableBalance, receivablePaymentError } from '@/utils/receivables';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { formatPesos } from '@/utils/dashboard';
import { formatCalendarDate } from '@/utils/date';
import type { ReceivablePayment } from '@/types/receivables';
import tokens from '@/constants/design-tokens.json';
import { AnimatedPesoValue, debtDescription, useReceivablesRoot } from './receivables-ui';
import { useStoreOwner } from '@/hooks/use-store-owner';

type PaymentSuccess = Pick<ReceivablePayment, 'id' | 'amountCentavos'> & { remainingCentavos: number };
type PendingPaymentCommand = { debtId: string; amount: string; outstanding: number };

export function ReceivablePaymentScreen() {
  const { debtId } = useLocalSearchParams<{ debtId?: string }>();
  const { records, receivablePayments: localPayments, confirmReceivablePayment } = useQuickAdd();
  const storeOwner = useStoreOwner();
  const root = useReceivablesRoot();
  const confirmedMode = storeOwner?.mode === 'confirmed';
  const { debts: apiDebts, payments: apiPayments, loading: apiLoading, refresh: refreshReceivables } = useApiReceivables(confirmedMode ? storeOwner?.id : undefined);
  const receivablePayments = confirmedMode ? apiPayments : localPayments;
  const { setQuery } = useReceivableDraft();
  const debt = confirmedMode
    ? apiDebts.find(record => record.kind === 'customerDebt' && record.id === debtId)
    : records.find(record => record.kind === 'customerDebt' && record.id === debtId);
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
  const update = (value: string) => { setAmount(value); setFailure(''); };

  function back(nextStatus = 'unpaid') {
    if (busy.current) return;
    Keyboard.dismiss();
    router.dismissTo({ pathname: root, params: { section: 'receivable', status: nextStatus } } as Href);
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
      if (confirmedMode) refreshReceivables();
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
    router.dismissTo({ pathname: root, params: { section: 'receivable', status } } as Href);
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

  const stillLoading = confirmedMode && apiLoading && !debt;
  const footer = !stillLoading && debt && balance && outstanding > 0 ? <View className="gap-3">
    <Button loading={saving} disabled={saving || (submitted && !!validation)} onPress={submitPayment}>Confirm Payment</Button>
    <Button variant="secondary" disabled={saving} onPress={() => back()}>Cancel</Button>
  </View> : undefined;
  const previewColor = validation ? tokens.color.errorBase : tokens.color.successBase;

  return <InventoryFrame title="Record Payment" back inlineTitle background subtitle={debtDescription}
    hideNavigationWithKeyboard footer={footer} onBack={() => back()} onNavigate={action => { if (!busy.current) action(); }} overlay={overlay}>
    {stillLoading ? <ContentState title="Loading debt details…" description="Please wait a moment." /> :
      !debt || !balance || outstanding === 0 ? <ContentState title={debt ? 'This debt is fully paid' : 'Debt not available'} description={debt ? 'You can review this debt in Paid records.' : 'Return to Account Balances and choose an existing unpaid debt.'} action="Back to Account Balances" onAction={() => back(debt ? 'paid' : 'unpaid')} /> : <View className="gap-6" pointerEvents={saving ? 'none' : 'auto'}>
        <View className="gap-4 rounded-card border border-accent bg-brand p-5">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="type-list-financial text-white">Total Debt</Text>
            <Text className="type-micro-caption text-white">{formatCalendarDate(debt.occurredAt.slice(0, 10))}</Text>
          </View>
          <AnimatedPesoValue centavos={balance.originalCentavos} className="type-large-metric" style={{ color: tokens.color.surfaceCard }} />
        </View>

        <QuickAddField ref={input} label="Amount Paid" required money value={amount} onChangeText={update} placeholder="0.00"
          inputMode="decimal" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
          error={submitted ? validation : undefined} errorBackground={tokens.color.errorTint} />

        <View accessibilityLiveRegion="polite" className={`gap-3 rounded-card border p-5 ${validation ? 'border-error-base bg-error-tint' : 'border-success-base bg-success-tint'}`}>
          <Text className="type-label-nav" style={{ color: previewColor }}>Preview</Text>
          <AnimatedPesoValue centavos={remaining} prefix="Balance: " className="type-large-metric" style={{ color: previewColor }} />
          <Text className="type-micro-financial-rate text-text-secondary">{formatPesos(outstanding)} − {formatPesos(entered)} = {formatPesos(remaining)}</Text>
        </View>
        {!!failure && <Text accessibilityRole="alert" className="type-micro-caption text-error-base">{failure}</Text>}
      </View>}
  </InventoryFrame>;
}
