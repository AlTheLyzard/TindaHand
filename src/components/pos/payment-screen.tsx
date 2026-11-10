import { Button } from '@/components/ui/button';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View, type TextInputInstance, type ViewInstance } from 'react-native';
import { MotionContent } from '@/components/ui/motion-content';
import { PosDialog } from '@/components/pos/pos-dialog';
import { PosBackButton } from '@/components/pos/pos-back-button';
import { PosChip } from '@/components/pos/pos-chip';
import { PosFrame } from '@/components/pos/pos-frame';
import { PaymentAmountField } from '@/components/pos/payment-amount-field';
import { PaymentCustomerField } from '@/components/pos/payment-customer-field';
import { FormField } from '@/components/ui/form-field';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import tokens from '@/constants/design-tokens.json';
import { usePos } from '@/state/pos';
import type { OwnerIdentity } from '@/types/auth';
import type { PaymentMethod } from '@/types/pos';
import { formatPesos } from '@/utils/dashboard';
import { cartCountsLabel, selectionSummary } from '@/utils/pos';
import { orderSelectionKey, paymentAmounts, paymentConfirmationRows, paymentErrors, paymentMethodLabels as modeLabels, sanitizePaymentReference } from '@/utils/pos-payment';
import { usePosMetrics } from './pos-metrics';

const errorLabels = { required: 'Enter the amount received.', invalid: 'Enter a valid peso amount with up to two decimal places.',
  overpayment: 'GCash cannot exceed the sale total. Check the amount received.',
  positive: 'Enter an amount greater than zero.', insufficient: 'Cover the remaining balance to complete this payment.',
  fullyPaid: 'This payment covers the total. Use Cash or GCash to complete a fully paid sale.' };

export function PaymentScreen({ owner }: { owner: OwnerIdentity }) {
  const metrics = usePosMetrics();
  const { selection, paymentDraft: draft, updatePayment, completeOrder, clear, hasStockConflict, customers } = usePos();
  const preview = useContentPreview();
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState({ cash: false, gcash: false, customer: false, reference: false });
  const touch = (field: keyof typeof touched) => setTouched(previous => ({ ...previous, [field]: true }));
  const [cancelRequested, setCancelRequested] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const committing = useRef(false);
  const keyboardArea = useRef<ViewInstance>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const cashInput = useRef<TextInputInstance>(null);
  const gcashInput = useRef<TextInputInstance>(null);
  const referenceInput = useRef<TextInputInstance>(null);
  const customerInput = useRef<TextInputInstance>(null);
  const summary = selectionSummary(selection);
  const amounts = paymentAmounts(summary.totalCentavos, draft);
  const errors = paymentErrors(summary.totalCentavos, draft);
  const partial = draft.method === 'partial';
  const split = draft.method === 'split';
  const gcashVisible = draft.method === 'gcash' || split || (partial && draft.partialMethod === 'gcash');
  const referenceVisible = gcashVisible;
  const confirmationKey = orderSelectionKey(selection) + JSON.stringify(draft);
  const update = (patch: Parameters<typeof updatePayment>[0]) => { setFailure(''); updatePayment(patch); };
  const amountError = errors.amount ? errorLabels[errors.amount] : undefined;
  const back = () => { Keyboard.dismiss(); router.navigate('/owner-pos/cart'); };
  function submit() {
    setAttempted(true);
    if (hasStockConflict || errors.order) return;
    if (errors.customer) { customerInput.current?.focus(); return; }
    if (errors.tender) return;
    if (errors.cash) { cashInput.current?.focus(); return; }
    if (errors.gcash) { gcashInput.current?.focus(); return; }
    if (errors.amount) { (amounts.cashRaw === null ? gcashInput : cashInput).current?.focus(); return; }
    if (errors.reference) { referenceInput.current?.focus(); return; }
    Keyboard.dismiss();
    setConfirmation(confirmationKey);
  }
  function commit() {
    if (committing.current) return;
    committing.current = true;
    setBusy(true);
    let saved = false;
    try {
      saved = confirmation === confirmationKey && completeOrder();
      if (!saved) {
        setFailure('The order could not be saved. Review the current stock and payment, then try again.');
        return;
      }
    } catch {
      setFailure('The order could not be saved. Your cart and payment are kept for retry.');
    } finally {
      setConfirmation(null);
      // Keep success locked through the modal exit and route transition.
      if (!saved) committing.current = false;
      setBusy(false);
    }
    if (saved) router.navigate('/owner-pos');
  }
  const confirmationRows = paymentConfirmationRows(summary.totalCentavos, draft,
    customers.find(customer => customer.id === draft.customerId)?.name ?? draft.customerName.trim());

  return <PosFrame owner={owner} step="payment" onPos={() => router.navigate('/owner-pos')}>
    <View ref={keyboardArea} collapsable={false} className="flex-1" onLayout={() => keyboardArea.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tokens.spacing.four }}>
        <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.gutter }}>
          {preview.loading ? <RecordSkeleton kind="payment" gcash={gcashVisible} /> : preview.empty || summary.quantity === 0
            ? <EmptyState icon="cart" title="Your cart is empty" description="Select products before making a payment." action="Browse Products" onAction={() => { preview.reset(); router.navigate('/owner-pos'); }} /> : <>
            <View className="rounded-card bg-action p-5">
              <Text className="font-poppins-bold text-[11px] text-white">Total Amount Payable · {cartCountsLabel(selection)}</Text>
              <Text accessibilityLiveRegion="polite" className="mt-3 font-poppins-bold text-[26px] text-white">Total: {formatPesos(summary.totalCentavos)}</Text>
            </View>
            <View accessibilityRole="radiogroup" accessibilityLabel="Payment mode" className="mb-8 mt-2 flex-row gap-1">
              {(Object.keys(modeLabels) as PaymentMethod[]).map(method => <View key={method} style={{ flex: method === 'cash' ? 60 : method === 'gcash' ? 70 : method === 'split' ? 100 : 114 }}>
                <PosChip radio stretch appearance="payment" selected={draft.method === method}
                  onPress={() => update({ method })} label={modeLabels[method]} />
              </View>)}
            </View>
            {hasStockConflict && <Text accessibilityRole="alert" className="mb-3 font-poppins text-[12px] text-[#972020]">Stock changed. Return to your cart and review the unavailable quantities.</Text>}
            <View className="gap-4 rounded-card bg-white p-4" style={{ zIndex: 1 }}>
              {partial && <>
                <PaymentCustomerField inputRef={customerInput} customers={customers} draft={draft} update={update}
                  onBlur={() => touch('customer')} error={(attempted || touched.customer) && errors.customer ? 'Select a customer or enter a customer name.' : undefined} onNext={() => (draft.partialMethod === 'cash' ? cashInput : gcashInput).current?.focus()} />
                <View>
                  <Text className="mb-2 font-poppins-bold text-[12px] text-brand">Payment method for amount paid now<Text className="text-[#B42318]"> *</Text></Text>
                  <View accessibilityRole="radiogroup" accessibilityLabel="Partial Payment method" className="flex-row gap-2">
                    {(['cash', 'gcash'] as const).map(partialMethod => <PosChip key={partialMethod} radio selected={draft.partialMethod === partialMethod} onPress={() => update({ partialMethod })} label={modeLabels[partialMethod]} />)}
                  </View>
                  {attempted && errors.tender && <Text accessibilityRole="alert" className="mt-2 font-poppins text-[12px] text-[#972020]">Choose Cash or GCash for the amount paid now.</Text>}
                </View>
              </>}
              {amounts.cashRaw !== null && <PaymentAmountField inputRef={cashInput} label={split ? 'Cash Amount Received' : partial ? 'Amount Paid' : 'Amount Received'} value={amounts.cashRaw}
                onChange={value => update(split ? { splitCashAmount: value } : partial ? { partialAmount: value } : { cashAmount: value })}
                onBlur={() => touch('cash')} error={(attempted || touched.cash) && (errors.cash || errors.amount) ? errorLabels[(errors.cash ?? errors.amount)!] : undefined} onNext={split ? () => gcashInput.current?.focus() : undefined} />}
              {amounts.gcashRaw !== null && <PaymentAmountField inputRef={gcashInput} label={split ? 'GCash Amount Received' : partial ? 'Amount Paid' : 'Amount Received'} value={amounts.gcashRaw}
                onChange={value => update(split ? { splitGcashAmount: value } : partial ? { partialAmount: value } : { gcashAmount: value })}
                onBlur={() => touch('gcash')} error={(attempted || touched.gcash) && (errors.gcash || (!split && errors.amount)) ? errorLabels[(errors.gcash ?? errors.amount)!] : undefined} onNext={() => referenceInput.current?.focus()} />}
              {gcashVisible && <Text className="font-poppins text-[11px] text-text-secondary">Record GCash manually after checking the transfer. A reference number does not verify a payment.</Text>}
              {referenceVisible && <FormField ref={referenceInput} label="GCash Reference Number" requiredIndicator="asterisk" required={amounts.needsReference} value={split ? draft.splitReference : partial ? draft.partialReference : draft.gcashReference}
                onChangeText={value => { const reference = sanitizePaymentReference(value); update(split ? { splitReference: reference } : partial ? { partialReference: reference } : { gcashReference: reference }); }}
                keyboardType="number-pad" inputMode="numeric" onBlur={() => touch('reference')}
                autoCapitalize="none" placeholder="Enter reference number" returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
                error={(attempted || touched.reference) && errors.reference ? 'Enter the GCash reference number.' : undefined} />}
            </View>
            <View accessibilityLiveRegion="polite" className="mt-8 gap-2 rounded-card bg-[#D1E1F5] p-5">
              {partial && <Text className="font-poppins-bold text-[12px] text-brand">Amount Paid: {formatPesos(amounts.paidCentavos)}</Text>}
              {split && <Text className="font-poppins-bold text-[12px] text-brand">Amount Received: {formatPesos(amounts.paidCentavos)}</Text>}
              {!partial && <Text className="font-poppins-bold text-[12px] text-brand">{amounts.remainingCentavos > 0 ? 'Remaining Balance' : 'Change'}</Text>}
              <Text className="font-poppins text-[12px] text-text-secondary">{partial || amounts.remainingCentavos > 0
                ? `${formatPesos(summary.totalCentavos)} − ${formatPesos(amounts.paidCentavos)} = ${formatPesos(amounts.remainingCentavos)}`
                : errors.gcash === 'overpayment' ? 'Review the GCash amount before completing the order.' : `${formatPesos(amounts.paidCentavos)} − ${formatPesos(summary.totalCentavos)} = ${formatPesos(amounts.changeCentavos)}`}</Text>
              {partial && <Text className="mt-4 font-poppins-bold text-[12px] text-brand">Remaining Balance</Text>}
              <Text className="font-poppins-bold text-[28px] text-brand">{formatPesos(partial || amounts.remainingCentavos > 0 ? amounts.remainingCentavos : amounts.changeCentavos)}</Text>
            </View>
            {attempted && amountError && <Text accessibilityRole="alert" className="mt-3 font-poppins text-[12px] text-[#972020]">{amountError}</Text>}
            {attempted && errors.amount === 'fullyPaid' && draft.partialMethod && <Button variant="text" fullWidth={false} compact style={{ alignSelf: 'flex-start' }} onPress={() => update(draft.partialMethod === 'cash' ? { method: 'cash', cashAmount: draft.partialAmount } : { method: 'gcash', gcashAmount: draft.partialAmount, gcashReference: draft.partialReference })}>{["Use ", modeLabels[draft.partialMethod], "for full payment"].join('')}</Button>}
            {!!failure && <Text accessibilityRole="alert" className="mt-3 font-poppins text-[12px] text-[#972020]">{failure}</Text>}
            <View className="mt-12 gap-3">
              <Button variant="positive" loading={busy} disabled={hasStockConflict} onPress={submit}>Complete Order</Button>
              <Button variant="destructiveOutline" onPress={() => { Keyboard.dismiss(); setCancelRequested(true); }}>Cancel Order</Button>
            </View>
            <PosBackButton label="Back to cart review" onPress={back} />
          </>}
          {preview.control}
        </MotionContent>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
    <PosDialog visible={confirmation !== null} title="Confirm Checkout?" confirmLabel="Confirm Checkout" cancelLabel="Back to Payment" onClose={() => setConfirmation(null)} onConfirm={commit}>
      <View className="gap-3">
        {confirmationRows.map((row, index) => <View key={row.label} className={`flex-row items-start justify-between gap-3 ${index === 0 ? 'border-b border-[#ADC9EE] pb-3' : ''}`}>
          <Text className="flex-1 font-poppins text-[12px] text-text-secondary">{row.label}</Text>
          <Text selectable className="flex-1 text-right font-poppins-bold text-[12px] text-brand">{typeof row.value === 'number' ? formatPesos(row.value) : row.value}</Text>
        </View>)}
      </View>
    </PosDialog>
    <PosDialog visible={cancelRequested} destructive title="Discard Changes?" message="You have unsaved changes. Are you sure you want to close without saving?" confirmLabel="Discard Changes" cancelLabel="Keep Editing" onClose={() => setCancelRequested(false)}
      onConfirm={() => { setCancelRequested(false); clear(); router.navigate('/owner-pos'); }} />
  </PosFrame>;
}
