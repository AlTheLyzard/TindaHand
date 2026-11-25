import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { Button, IconButton } from '@/components/ui/button';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Keyboard, Platform, Text, View, useWindowDimensions, type TextInputInstance, type ViewInstance } from 'react-native';
import { MotionContent } from '@/components/ui/motion-content';
import { PosDialog } from '@/components/pos/pos-dialog';
import { PosChip } from '@/components/pos/pos-chip';
import { PosFrame, posHref, type PosRouteBase } from '@/components/pos/pos-frame';
import { PaymentAmountField } from '@/components/pos/payment-amount-field';
import { PaymentCustomerField } from '@/components/pos/payment-customer-field';
import { FormField } from '@/components/ui/form-field';
import { AppIcon } from '@/components/ui/app-icon';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import tokens from '@/constants/design-tokens.json';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { usePos } from '@/state/pos';
import type { OwnerIdentity } from '@/types/auth';
import type { PaymentMethod } from '@/types/pos';
import { formatPesos } from '@/utils/dashboard';
import { cartCountsLabel, selectionSummary } from '@/utils/pos';
import { orderSelectionKey, paymentAmounts, paymentErrors, paymentMethodLabels as modeLabels, sanitizePaymentReference } from '@/utils/pos-payment';
import { formatPosDenomination, previewPosChangeBreakdown } from '@/utils/pos-change-breakdown';
import { usePosMetrics } from './pos-metrics';

const errorLabels = { required: 'Enter the amount received.', invalid: 'Enter a valid peso amount with up to two decimal places.',
  overpayment: 'GCash cannot exceed the sale total. Check the amount received.',
  positive: 'Enter an amount greater than zero.', insufficient: 'Cover the remaining balance to complete this payment.',
  fullyPaid: 'This payment covers the total. Use Cash or GCash to complete a fully paid sale.' };

export function PaymentScreen({ owner, basePath = '/owner-pos', allowPartialPayment = true }: {
  owner: OwnerIdentity; basePath?: PosRouteBase; allowPartialPayment?: boolean;
}) {
  const metrics = usePosMetrics();
  const { width: viewportWidth } = useWindowDimensions();
  const { selection, paymentDraft: draft, updatePayment, completeOrder, clear, hasStockConflict, customers } = usePos();
  const preview = useContentPreview();
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState({ cash: false, gcash: false, customer: false, reference: false });
  const touch = (field: keyof typeof touched) => setTouched(previous => ({ ...previous, [field]: true }));
  const [cancelRequested, setCancelRequested] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
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
  const validPayment = !hasStockConflict && !Object.values(errors).some(Boolean);
  const partial = draft.method === 'partial';
  const split = draft.method === 'split';
  const gcashVisible = draft.method === 'gcash' || split || (partial && draft.partialMethod === 'gcash');
  const referenceVisible = gcashVisible;
  const confirmationKey = orderSelectionKey(selection) + JSON.stringify(draft);
  const update = (patch: Parameters<typeof updatePayment>[0]) => { setFailure(''); updatePayment(patch); };
  /** Extract the most likely GCash reference number (13 consecutive digits) from OCR text lines. */
  function extractGcashReference(lines: readonly string[]): string | null {
    for (const line of lines) {
      // GCash reference numbers are exactly 13 digits — strip spaces and check
      const digits = line.replace(/\s+/g, '');
      const match = digits.match(/\d{13}/);
      if (match) return match[0];
    }
    // Fallback: concatenate all digits across all lines and take the first 13-digit run
    const allText = lines.join(' ');
    const fallback = allText.replace(/\s+/g, '').match(/\d{13}/);
    return fallback ? fallback[0] : null;
  }

  async function openReferenceCamera() {
    if (cameraBusy) return;
    setCameraBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        if (permission.canAskAgain) {
          Alert.alert('Camera permission needed', 'Allow TindaHand to use your camera to capture a GCash payment reference.');
        } else {
          Alert.alert('Camera access is off', 'Enable camera access in your device settings to capture a GCash payment reference.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => { void Linking.openSettings().catch(() => {}); } },
          ]);
        }
        return;
      }
      // OCR.space free tier has a ~1MB payload limit. Keep the image small:
      // 1024px wide is plenty for reading a 13-digit reference number.
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.3, exif: false });
      if (result.canceled || !result.assets[0]?.uri) return;
      const sourceUri = result.assets[0].uri;
      // TODO: move to env once EXPO_PUBLIC_ vars are confirmed loading
      const apiKey = process.env.EXPO_PUBLIC_VISION_KEY || 'AIzaSyDDy-6klNZGU6VT3ZD08lkl8Av0pLsizOE';
      // Convert to base64 via fetch+FileReader — works on content:// and file:// URIs in Expo Go.
      let base64: string;
      try {
        const blob = await (await fetch(sourceUri)).blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (!base64) throw new Error('empty');
      } catch {
        Alert.alert('Could not read image', 'Failed to process the photo. Try again.');
        return;
      }
      let ocrText = '';
      try {
        // Google Cloud Vision TEXT_DETECTION — JSON body, no multipart issues.
        const response = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                image: { content: base64 },
                features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
              }],
            }),
          },
        );
        if (!response.ok) {
          const errJson = await response.json().catch(() => ({})) as { error?: { message?: string } };
          Alert.alert('Could not read image', `Vision API error ${response.status}: ${errJson.error?.message ?? 'unknown'}. Enter the reference number manually.`);
          return;
        }
        const json = await response.json() as { responses?: { fullTextAnnotation?: { text?: string } }[] };
        ocrText = json.responses?.[0]?.fullTextAnnotation?.text ?? '';
      } catch (err) {
        Alert.alert('Could not read image', `Network error: ${String(err)}. Enter the reference number manually.`);
        return;
      }
      // Split into lines for the same extraction logic
      const lines = ocrText.split(/\r?\n/).filter(Boolean);
      const reference = extractGcashReference(lines);
      if (!reference) {
        Alert.alert('No reference number found', 'Make sure the GCash reference number is clearly visible and try again, or enter it manually.');
        return;
      }
      // Auto-fill the correct reference field based on payment mode
      update(split ? { splitReference: reference } : partial ? { partialReference: reference } : { gcashReference: reference });
      touch('reference');
    } catch {
      Alert.alert('Unable to open camera', 'Check camera access and try again.');
    } finally {
      setCameraBusy(false);
    }
  }
  const amountError = errors.amount ? errorLabels[errors.amount] : undefined;
  const back = () => { Keyboard.dismiss(); router.navigate(posHref(basePath, 'cart')); };
  const closeConfirmation = () => { if (!committing.current) setConfirmation(null); };
  function submit() {
    if (committing.current || confirmation !== null) return;
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
  async function commit() {
    if (committing.current || confirmation === null) return;
    if (!validPayment || confirmation !== confirmationKey) {
      setConfirmation(null);
      setAttempted(true);
      setFailure('The order or payment changed. Review the details and confirm again.');
      return;
    }
    committing.current = true;
    setBusy(true);
    setConfirmation(null);
    try {
      const result = await completeOrder();
      if (!result.success) {
        setFailure('The order could not be saved. Review the current stock and payment, then try again.');
        committing.current = false;
        return;
      }
      // Success — navigate back to POS (toast will show change breakdown)
      router.navigate(posHref(basePath));
    } catch {
      setFailure('The order could not be saved. Your cart and payment are kept for retry.');
      committing.current = false;
    } finally {
      setBusy(false);
    }
  }
  const balanceAmount = partial || amounts.remainingCentavos > 0 ? amounts.remainingCentavos : amounts.changeCentavos;
  const changeBreakdown = errors.gcash === 'overpayment' || partial
    ? [] : previewPosChangeBreakdown(amounts.changeCentavos);
  const compactChangeCard = viewportWidth < 360;

  const paymentMethods = (Object.keys(modeLabels) as PaymentMethod[]).filter(method => allowPartialPayment || method !== 'partial');

  return <PosFrame owner={owner} basePath={basePath} step="payment" onPos={() => router.navigate(posHref(basePath))}
    backAction={{ label: 'Back to cart review', onPress: back }}>
    <View ref={keyboardArea} collapsable={false} className="flex-1" onLayout={() => keyboardArea.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tokens.spacing.four }}>
        <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.gutter }}>
          {preview.loading ? <RecordSkeleton kind="payment" gcash={gcashVisible} /> : preview.empty || summary.quantity === 0
            ? <EmptyState icon="cart" title="Your cart is empty" description="Select products before making a payment." action="Browse Products" onAction={() => { preview.reset(); router.navigate(posHref(basePath)); }} /> : <>
            <View className="rounded-card bg-action p-5">
              <Text className=" type-label-nav text-white">Total Amount Payable · {cartCountsLabel(selection)}</Text>
              <Text accessibilityLiveRegion="polite" className="mt-3 type-large-metric text-white">Total: {formatPesos(summary.totalCentavos)}</Text>
            </View>
            <ScrollView testID="payment-mode-selector" horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
               style={{ flexGrow: 0, marginHorizontal: -8, marginTop: 8, marginBottom: 16 }}
              contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 2, gap: 8, alignItems: 'center' }}>
              <View accessibilityRole="radiogroup" accessibilityLabel="Payment mode" className="flex-row items-center gap-2">
                {paymentMethods.map(method => <PosChip key={method} radio appearance="payment" selected={draft.method === method}
                  disabled={busy} onPress={() => update({ method })} label={modeLabels[method]} />)}
              </View>
            </ScrollView>
            {hasStockConflict && <Text accessibilityRole="alert" className="mb-3 type-micro-caption" style={{ color: tokens.color.errorBase }}>Stock changed. Return to your cart and review the unavailable quantities.</Text>}
            <View className="gap-4 rounded-card bg-white p-4" style={{ zIndex: 1 }}>
              {partial && <>
                <PaymentCustomerField inputRef={customerInput} customers={customers} draft={draft} update={update}
                  onBlur={() => touch('customer')} error={(attempted || touched.customer) && errors.customer ? 'Select a customer or enter a customer name.' : undefined} onNext={() => (draft.partialMethod === 'cash' ? cashInput : gcashInput).current?.focus()} />
                <View>
                  <Text className="mb-2 type-label-nav text-brand">Payment method for amount paid now<Text className="text-error-base"> *</Text></Text>
                  <View accessibilityRole="radiogroup" accessibilityLabel="Partial Payment method" className="flex-row gap-2">
                    {(['cash', 'gcash'] as const).map(partialMethod => <PosChip key={partialMethod} radio selected={draft.partialMethod === partialMethod} onPress={() => update({ partialMethod })} label={modeLabels[partialMethod]} />)}
                  </View>
                  {attempted && errors.tender && <Text accessibilityRole="alert" className="mt-2 type-micro-caption text-error-base">Choose Cash or GCash for the amount paid now.</Text>}
                </View>
              </>}
              {amounts.cashRaw !== null && <PaymentAmountField inputRef={cashInput} label={split ? 'Cash Amount Received' : partial ? 'Amount Paid' : 'Amount Received'} value={amounts.cashRaw}
                onChange={value => update(split ? { splitCashAmount: value } : partial ? { partialAmount: value } : { cashAmount: value })}
                onBlur={() => touch('cash')} error={(attempted || touched.cash) && (errors.cash || errors.amount) ? errorLabels[(errors.cash ?? errors.amount)!] : undefined} onNext={split ? () => gcashInput.current?.focus() : undefined} />}
              {amounts.gcashRaw !== null && <PaymentAmountField inputRef={gcashInput} label={split ? 'GCash Amount Received' : partial ? 'Amount Paid' : 'Amount Received'} value={amounts.gcashRaw}
                onChange={value => update(split ? { splitGcashAmount: value } : partial ? { partialAmount: value } : { gcashAmount: value })}
                onBlur={() => touch('gcash')} error={(attempted || touched.gcash) && (errors.gcash || (!split && errors.amount)) ? errorLabels[(errors.gcash ?? errors.amount)!] : undefined} onNext={() => referenceInput.current?.focus()} />}
              {gcashVisible && <Text className=" type-micro-caption text-text-secondary">Record GCash manually after checking the transfer. A reference number does not verify a payment.</Text>}
              {/* TODO(backend): Connect GCash receipt capture to the payment API for receipt upload and reference verification. */}
              {referenceVisible && <FormField ref={referenceInput} label="GCash Reference Number" requiredIndicator="asterisk" required={amounts.needsReference} value={split ? draft.splitReference : partial ? draft.partialReference : draft.gcashReference}
                onChangeText={value => { const reference = sanitizePaymentReference(value); update(split ? { splitReference: reference } : partial ? { partialReference: reference } : { gcashReference: reference }); }}
                keyboardType="number-pad" inputMode="numeric" onBlur={() => touch('reference')}
                autoCapitalize="none" placeholder="Enter reference number" returnKeyType="done" onSubmitEditing={Keyboard.dismiss}
                error={(attempted || touched.reference) && errors.reference ? 'Enter the GCash reference number.' : undefined}
                trailingAccessory={<IconButton accessibilityLabel="Open camera to capture GCash reference" disabled={cameraBusy}
                  onPress={openReferenceCamera} icon={({ color }) => <AppIcon name="camera" size={24} color={color} />} />} />}
            </View>
            <View testID="payment-balance-card" accessibilityLiveRegion="polite" className="mt-4 rounded-control border border-bright-blue p-4"
              style={{ backgroundColor: tokens.color.iceContainerOverlay }}>
              <View className={compactChangeCard ? 'gap-4' : 'flex-row items-start gap-4'}>
                <View className={compactChangeCard ? 'gap-2' : 'min-w-0 flex-[1.15] gap-2'}>
                  <Text className=" type-button-cta text-brand">{partial || amounts.remainingCentavos > 0 ? 'Remaining Balance' : 'Total Change'}</Text>
                  <Text className=" type-micro-financial-rate text-text-secondary">{partial || amounts.remainingCentavos > 0
                    ? `${formatPesos(summary.totalCentavos)} − ${formatPesos(amounts.paidCentavos)} = ${formatPesos(amounts.remainingCentavos)}`
                    : errors.gcash === 'overpayment' ? 'Review the GCash amount before completing the order.' : `${formatPesos(amounts.paidCentavos)} − ${formatPesos(summary.totalCentavos)} = ${formatPesos(amounts.changeCentavos)}`}</Text>
                  <Text testID="payment-balance-amount" className=" type-large-metric" style={{ color: tokens.color.darkNavy }}>{formatPesos(balanceAmount)}</Text>
                </View>
                <View testID="payment-change-breakdown" className={compactChangeCard ? 'gap-2' : 'min-w-0 flex-1 gap-2'}>
                  <Text className="self-end text-right type-button-cta text-text-primary">Change breakdown</Text>
                  {changeBreakdown.length > 0 ? <View className="items-end gap-1.5">
                    {changeBreakdown.map(({ denominationCentavos, count }) => <View key={denominationCentavos} className="self-end flex-row items-center gap-2">
                      <View className="min-h-6 self-start justify-center rounded-control bg-white px-2">
                        <Text className="type-button-cta text-text-primary" numberOfLines={1}>{formatPosDenomination(denominationCentavos)}</Text>
                      </View>
                      <Text className="shrink-0 type-button-cta text-text-primary">× {count}</Text>
                    </View>)}
                  </View> : <Text className="self-end text-right type-micro-financial-rate text-text-secondary">
                    {errors.gcash === 'overpayment' ? 'Fix the GCash amount to review change.' : 'No change due'}
                  </Text>}
                </View>
              </View>
            </View>
            {attempted && amountError && <Text accessibilityRole="alert" className="mt-3 type-micro-caption text-error-base">{amountError}</Text>}
            {attempted && errors.amount === 'fullyPaid' && draft.partialMethod && <Button variant="text" fullWidth={false} compact style={{ alignSelf: 'flex-start' }} onPress={() => update(draft.partialMethod === 'cash' ? { method: 'cash', cashAmount: draft.partialAmount } : { method: 'gcash', gcashAmount: draft.partialAmount, gcashReference: draft.partialReference })}>{["Use ", modeLabels[draft.partialMethod], "for full payment"].join('')}</Button>}
            {!!failure && <Text accessibilityRole="alert" className="mt-3 type-micro-caption text-error-base">{failure}</Text>}
            <View className="mt-6 gap-3">
              <Button loading={busy} disabled={hasStockConflict} onPress={submit}>Complete Order</Button>
              <Button variant="secondary" onPress={() => { Keyboard.dismiss(); setCancelRequested(true); }}>Cancel Order</Button>
            </View>
          </>}
          {preview.control}
        </MotionContent>
      </ScrollView>
    </KeyboardAvoidingView>
    </View>
    <PosDialog visible={confirmation !== null} title="Confirm Checkout?"
      message="Are you sure you want to complete this order and proceed with the transaction?"
      confirmLabel="Confirm" cancelLabel="Cancel" busy={busy} confirmDisabled={!validPayment || confirmation !== confirmationKey}
      onClose={closeConfirmation} onConfirm={() => void commit()} />
    <PosDialog visible={cancelRequested} destructive title="Discard Changes?" message="You have unsaved changes. Are you sure you want to close without saving?" confirmLabel="Discard Changes" cancelLabel="Keep Editing" onClose={() => setCancelRequested(false)}
      onConfirm={() => { setCancelRequested(false); clear(); router.navigate(posHref(basePath)); }} />
  </PosFrame>;
}
