import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, View, type TextInputInstance } from 'react-native';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosDialog } from '@/components/pos/pos-dialog';
import { PosBackButton } from '@/components/pos/pos-back-button';
import { PosChip } from '@/components/pos/pos-chip';
import { PosFrame } from '@/components/pos/pos-frame';
import { PaymentAmountField } from '@/components/pos/payment-amount-field';
import { PaymentCustomerField } from '@/components/pos/payment-customer-field';
import { posStyles } from '@/components/pos/pos-styles';
import { FormField } from '@/components/ui/form-field';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import tokens from '@/constants/design-tokens.json';
import { useDashboardNavigation } from '@/hooks/use-dashboard-navigation';
import { usePos } from '@/state/pos';
import type { OwnerIdentity } from '@/types/auth';
import type { PaymentMethod } from '@/types/pos';
import { formatPesos } from '@/utils/dashboard';
import { cartCountsLabel, selectionSummary } from '@/utils/pos';
import { orderSelectionKey, paymentAmounts, paymentErrors } from '@/utils/pos-payment';

const modeLabels: Record<PaymentMethod, string> = { cash: 'Cash', gcash: 'GCash', split: 'Split Payment', partial: 'Partial Payment' };
const errorLabels = { required: 'Enter the amount received.', invalid: 'Enter a valid peso amount with up to two decimal places.',
  overpayment: 'GCash cannot exceed the sale total. Check the amount received.',
  positive: 'Enter an amount greater than zero.', insufficient: 'Cover the remaining balance to complete this payment.',
  fullyPaid: 'This payment covers the total. Use Cash or GCash to complete a fully paid sale.' };

export function PaymentScreen({ owner }: { owner: OwnerIdentity }) {
  const navigation = useDashboardNavigation();
  const { selection, paymentDraft: draft, updatePayment, completeOrder, clear, hasStockConflict, customers } = usePos();
  const preview = useContentPreview();
  const [attempted, setAttempted] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const committing = useRef(false);
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
  const confirmationMessage = [
    `Total: ${formatPesos(summary.totalCentavos)}`, `Payment method: ${modeLabels[draft.method]}${partial ? ` · ${draft.partialMethod === 'cash' ? 'Cash' : 'GCash'}` : ''}`,
    `Amount Received: ${formatPesos(amounts.paidCentavos)}`,
    ...(split ? [`Cash: ${formatPesos(amounts.cash ?? 0)} · GCash: ${formatPesos(amounts.gcash ?? 0)}`] : []),
    ...(partial ? [`Customer: ${customers.find(customer => customer.id === draft.customerId)?.name ?? draft.customerName.trim()}`, `Remaining debt: ${formatPesos(amounts.remainingCentavos)}`] : []),
    ...(amounts.changeCentavos > 0 ? [`Cash change: ${formatPesos(amounts.changeCentavos)}`] : []),
    'Confirm this sale?',
  ].join('\n');

  return <PosFrame owner={owner} step="payment" expanded={navigation.expanded} onPos={() => router.navigate('/owner-pos')}>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView onScroll={navigation.onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tokens.spacing.four }}>
        <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] self-center px-4">
          {preview.control}
          <PosBackButton label="Back to cart review" onPress={back} />
          {preview.loading ? <RecordSkeleton kind="payment" gcash={gcashVisible} /> : preview.empty || summary.quantity === 0
            ? <EmptyState icon="cart" title="Your cart is empty" description="Select products before making a payment." action="Browse Products" onAction={() => { preview.reset(); router.navigate('/owner-pos'); }} /> : <>
            <View className="rounded-card bg-action p-5">
              <Text className="font-poppins-bold text-[11px] text-white">Total Amount Payable · {cartCountsLabel(selection)}</Text>
              <Text accessibilityLiveRegion="polite" className="mt-3 font-poppins-bold text-[26px] text-white">Total: {formatPesos(summary.totalCentavos)}</Text>
            </View>
            <View accessibilityRole="radiogroup" accessibilityLabel="Payment mode" className="my-3 flex-row flex-wrap gap-2">
              {(Object.keys(modeLabels) as PaymentMethod[]).map(method => <PosChip key={method} radio selected={draft.method === method}
                onPress={() => update({ method })} label={modeLabels[method]} />)}
            </View>
            {hasStockConflict && <Text accessibilityRole="alert" className="mb-3 font-poppins text-[12px] text-[#972020]">Stock changed. Return to your cart and review the unavailable quantities.</Text>}
            <View className="gap-4 rounded-card bg-white p-4">
              {partial && <>
                <PaymentCustomerField inputRef={customerInput} customers={customers} draft={draft} update={update}
                  error={attempted && errors.customer ? 'Select a customer or enter a customer name.' : undefined} onNext={() => (draft.partialMethod === 'cash' ? cashInput : gcashInput).current?.focus()} />
                <View>
                  <Text className="mb-2 font-poppins-bold text-[12px] text-brand">Payment method for amount paid now</Text>
                  <View accessibilityRole="radiogroup" accessibilityLabel="Partial Payment method" className="flex-row gap-2">
                    {(['cash', 'gcash'] as const).map(partialMethod => <PosChip key={partialMethod} radio selected={draft.partialMethod === partialMethod} onPress={() => update({ partialMethod })} label={modeLabels[partialMethod]} />)}
                  </View>
                  {attempted && errors.tender && <Text accessibilityRole="alert" className="mt-2 font-poppins text-[12px] text-[#972020]">Choose Cash or GCash for the amount paid now.</Text>}
                </View>
              </>}
              {amounts.cashRaw !== null && <PaymentAmountField inputRef={cashInput} label={split ? 'Cash Amount Received' : partial ? 'Amount Paid' : 'Amount Received'} value={amounts.cashRaw}
                onChange={value => update(split ? { splitCashAmount: value } : partial ? { partialAmount: value } : { cashAmount: value })}
                error={attempted && errors.cash ? errorLabels[errors.cash] : undefined} onNext={split ? () => gcashInput.current?.focus() : undefined} />}
              {amounts.gcashRaw !== null && <PaymentAmountField inputRef={gcashInput} label={split ? 'GCash Amount Received' : partial ? 'Amount Paid' : 'Amount Received'} value={amounts.gcashRaw}
                onChange={value => update(split ? { splitGcashAmount: value } : partial ? { partialAmount: value } : { gcashAmount: value })}
                error={attempted && errors.gcash ? errorLabels[errors.gcash] : undefined} onNext={() => referenceInput.current?.focus()} />}
              {gcashVisible && <Text className="font-poppins text-[11px] text-text-secondary">Record GCash manually after checking the transfer. A reference number does not verify a payment.</Text>}
              {referenceVisible && <FormField ref={referenceInput} label="GCash Reference Number" required={amounts.needsReference} value={split ? draft.splitReference : partial ? draft.partialReference : draft.gcashReference}
                onChangeText={value => update(split ? { splitReference: value } : partial ? { partialReference: value } : { gcashReference: value })}
                autoCapitalize="none" placeholder="Enter reference number" returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
                error={attempted && errors.reference ? 'Enter the GCash reference number.' : undefined} />}
              <Pressable accessibilityRole="button" onPress={Keyboard.dismiss} className="min-h-12 items-end justify-center"><Text className="font-poppins-bold text-[12px] text-action">Done</Text></Pressable>
            </View>
            <View accessibilityLiveRegion="polite" className="mt-4 gap-2 rounded-card bg-[#D1E1F5] p-5">
              <Text className="font-poppins-bold text-[12px] text-brand">Total: {formatPesos(summary.totalCentavos)}</Text>
              <Text className="font-poppins-bold text-[12px] text-brand">{partial ? 'Amount Paid' : 'Amount Received'}: {formatPesos(amounts.paidCentavos)}</Text>
              <Text className="font-poppins-bold text-[12px] text-brand">{partial || amounts.remainingCentavos > 0 ? 'Remaining Balance' : 'Change'}</Text>
              <Text className="font-poppins text-[12px] text-text-secondary">{partial || amounts.remainingCentavos > 0
                ? `${formatPesos(summary.totalCentavos)} − ${formatPesos(amounts.paidCentavos)} = ${formatPesos(amounts.remainingCentavos)}`
                : errors.gcash === 'overpayment' ? 'Review the GCash amount before completing the order.' : `${formatPesos(amounts.paidCentavos)} − ${formatPesos(summary.totalCentavos)} = ${formatPesos(amounts.changeCentavos)}`}</Text>
              <Text className="font-poppins-bold text-[28px] text-brand">{formatPesos(partial || amounts.remainingCentavos > 0 ? amounts.remainingCentavos : amounts.changeCentavos)}</Text>
            </View>
            {attempted && amountError && <Text accessibilityRole="alert" className="mt-3 font-poppins text-[12px] text-[#972020]">{amountError}</Text>}
            {attempted && errors.amount === 'fullyPaid' && draft.partialMethod && <Pressable accessibilityRole="button" className="min-h-12 justify-center" onPress={() => update(draft.partialMethod === 'cash' ? { method: 'cash', cashAmount: draft.partialAmount } : { method: 'gcash', gcashAmount: draft.partialAmount, gcashReference: draft.partialReference })}><Text className="font-poppins-bold text-[12px] text-action">Use {modeLabels[draft.partialMethod]} for full payment</Text></Pressable>}
            {!!failure && <Text accessibilityRole="alert" className="mt-3 font-poppins text-[12px] text-[#972020]">{failure}</Text>}
            <View className="mt-6 gap-3">
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || hasStockConflict }} disabled={busy || hasStockConflict} onPress={submit}
                className="items-center justify-center px-4 py-3" style={[posStyles.action, { backgroundColor: '#36833C', borderColor: '#75A878', opacity: busy || hasStockConflict ? 0.5 : 1 }]}><Text className="text-center font-poppins-bold text-[14px] text-white">{busy ? 'Saving…' : 'Complete Order'}</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setCancelRequested(true); }} className="items-center justify-center bg-white px-4 py-3" style={[posStyles.action, { borderColor: '#CC333B' }]}><Text className="font-poppins-bold text-[14px] text-[#B4232C]">Cancel Order</Text></Pressable>
            </View>
          </>}
        </MotionContent>
      </ScrollView>
    </KeyboardAvoidingView>
    <PosDialog visible={confirmation !== null} title="Confirm Checkout?" message={confirmationMessage} confirmLabel="Confirm" onClose={() => setConfirmation(null)} onConfirm={commit} />
    <PosDialog visible={cancelRequested} destructive title="Cancel Order?" message="This will discard all items and payment entries in the current order. Cancel this order?" confirmLabel="Cancel Order" onClose={() => setCancelRequested(false)}
      onConfirm={() => { setCancelRequested(false); clear(); router.navigate('/owner-pos'); }} />
  </PosFrame>;
}
