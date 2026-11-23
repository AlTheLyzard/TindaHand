import tokens from '@/constants/design-tokens.json';
import type { TextInputInstance } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { SuccessContent } from '@/components/ui/success-content';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { quickAddColors } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import { InvCard, InvField, InventoryFrame, InvText, inventoryIllustrations } from './inventory-ui';
import { AssetClassificationField } from './asset-classification-field';
import { useInventory } from '@/state/inventory';
import { useCashRegister } from '@/state/cash-register';
import { createAsset, updateAsset as updateAssetApi, deleteAsset as deleteAssetApi } from '@/services/inventory';
import type { AssetClassification, BusinessAsset } from '@/types/inventory';
import { assetLabels, todayInManila } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

type AssetStep = 'details' | 'review';
type Confirmation = 'save' | 'delete';

const assetCategoryName = (classification: AssetClassification) => classification === 'current' ? 'Cash On Hand' : assetLabels[classification];

export function AssetScreen() {
  useTranslation();
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { store, dispatch, setFeedback } = useInventory();
  const cashRegister = useCashRegister();
  const cashToken = useRef(cashRegister.begin());
  const preview = useContentPreview();
  const asset = store.assets.find(a => a.id === id);
  const adding = mode === 'add';
  const deleting = mode === 'delete';
  const [name, setName] = useState(asset?.name ?? '');
  const [value, setValue] = useState(asset ? (asset.valueCentavos / 100).toFixed(2) : '');
  const [life, setLife] = useState(asset ? String(asset.usefulLifeYears) : '');
  const [classification, setClassification] = useState<AssetClassification | ''>(asset?.classification ?? '');
  const [step, setStep] = useState<AssetStep>('details');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<BusinessAsset | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(deleting ? 'delete' : null);
  const insets = useSafeAreaInsets();
  const [newId] = useState(() => `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const submitted = useRef(false);
  const pendingConfirmationAction = useRef<(() => void) | null>(null);
  const valueInput = useRef<TextInputInstance>(null);
  const lifeInput = useRef<TextInputInstance>(null);

  function leave(message?: string) {
    Keyboard.dismiss();
    if (message) setFeedback(message);
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/owner-inventory', params: { tab: 'assets' } });
  }

  function validateDraft() {
    const next: Record<string, string> = {};
    const amount = parsePaymentAmount(value);
    if (!name.trim()) next.name = t('inventory.asset.name.is.required');
    if (amount === null || amount <= 0) next.value = t('inventory.enter.a.value.greater.than.zero.with');
    if (!Object.prototype.hasOwnProperty.call(assetLabels, classification)) next.classification = t('inventory.select.an.asset.classification');
    if (classification !== 'current' && (!/^\d+$/.test(life) || Number(life) < 1 || Number(life) > 100)) next.life = t('inventory.enter.a.whole.useful.life.from.1');
    setErrors(next);
    if (Object.keys(next).length) return null;
    return amount;
  }

  function review() {
    Keyboard.dismiss();
    if (validateDraft() !== null) setStep('review');
  }

  async function save() {
    if (submitted.current) return;
    Keyboard.dismiss();
    const amount = validateDraft();
    if (amount === null) {
      setStep('details');
      return;
    }
    submitted.current = true;
    const today = todayInManila();
    const record: BusinessAsset = {
      id: asset?.id ?? newId,
      name: name.trim(),
      valueCentavos: amount,
      usefulLifeYears: classification === 'current' ? 0 : Number(life),
      classification: classification as AssetClassification,
      recordedDate: asset?.recordedDate ?? today,
    };

    if (adding) {
      try {
        const created = await createAsset({
          name: record.name,
          classification: record.classification,
          valueCentavos: record.valueCentavos,
          usefulLifeYears: record.usefulLifeYears,
          recordedDate: record.recordedDate,
        });
        // Use the real API id so future edits/deletes reference the right record.
        record.id = created.id;
      } catch {
        // Offline — asset will be saved locally with a temporary id.
      }
    } else if (asset && asset.id.startsWith('asset-')) {
      try {
        await updateAssetApi(asset.id, {
          name: record.name,
          classification: record.classification,
          valueCentavos: record.valueCentavos,
          usefulLifeYears: record.usefulLifeYears,
          recordedDate: record.recordedDate,
        });
      } catch {
        // Offline — keep the local edit.
      }
    }

    if (dispatch({ type: 'saveAsset', asset: record })) {
      // When adding Cash On Hand, mirror the amount into the cash register so
      // the dashboard "Pera sa Kaha" total and the financial journal both reflect it.
      if (adding && record.classification === 'current') {
        const centavosStr = (record.valueCentavos / 100).toFixed(2);
        void cashRegister.add(cashToken.current, centavosStr);
      }
      setSaved(record);
      setSuccessVisible(true);
    } else {
      submitted.current = false;
      setErrors({ form: t('inventory.asset.could.not.be.saved.please.sign') });
    }
  }

  async function remove() {
    if (!asset || submitted.current) return;
    submitted.current = true;
    if (asset.id.startsWith('asset-')) {
      try {
        await deleteAssetApi(asset.id);
      } catch {
        // Offline — allow local delete anyway.
      }
    }
    if (dispatch({ type: 'deleteAsset', id: asset.id })) leave(t('inventory.asset.deleted', { name: asset.name }));
    else {
      submitted.current = false;
      setErrors({ form: t('inventory.asset.could.not.be.deleted') });
    }
  }

  function dismissConfirmation(action?: () => void) {
    pendingConfirmationAction.current = action ?? null;
    setConfirmation(null);
  }

  if (!adding && preview.loading) return <InventoryFrame title={t('inventory.edit.asset')} back inlineTitle background>
    {preview.control}<RecordSkeleton kind="form" form="asset" count={1} />
  </InventoryFrame>;
  if ((!adding && (!asset || preview.empty)) || !['add', 'edit', 'delete'].includes(mode ?? '')) return <InventoryFrame title={t('inventory.asset.unavailable')} back>
    {preview.control}<EmptyState title="Asset unavailable" description="This asset is no longer available. Return to your asset records to choose another." action="Return to Assets" onAction={() => { preview.reset(); router.replace({ pathname: '/owner-inventory', params: { tab: 'assets' } }); }} />
  </InventoryFrame>;

  const title = step === 'review' ? 'Review Details' : adding ? t('inventory.add.asset2') : t('inventory.edit.asset');
  const subtitle = step === 'review' ? 'Please review the details before saving.' : 'Asset details for your store.';
  const selectedClassification = classification && Object.prototype.hasOwnProperty.call(assetLabels, classification) ? classification as AssetClassification : null;
  const amount = parsePaymentAmount(value);

  const form = <View style={{ gap: tokens.spacing.three }}>
    <InvField label={t('inventory.asset.name.required')} value={name} onChangeText={setName} error={errors.name} placeholder={t('inventory.enter.asset.name')} maxLength={120} returnKeyType="next" onSubmitEditing={() => valueInput.current?.focus()} />
    <InvField money label={t('inventory.amount.value.required')} inputRef={valueInput} value={value} onChangeText={setValue} error={errors.value} placeholder="0.00" keyboardType="decimal-pad" returnKeyType={classification === 'current' ? 'done' : 'next'} onSubmitEditing={() => classification === 'current' ? Keyboard.dismiss() : lifeInput.current?.focus()} />
    <AssetClassificationField label={t('inventory.asset.classification.required')} value={classification} onChange={setClassification} error={errors.classification} />
    {classification !== 'current'
      ? <InvField label={t('inventory.estimated.useful.life.in.years.required')} inputRef={lifeInput} value={life} onChangeText={setLife} error={errors.life} placeholder={t('inventory.years2')} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
      : <InvText>{t('inventory.estimated.useful.life.does.not.apply.to')}</InvText>}
    {!!errors.form && <Text accessibilityRole="alert" style={{ color: tokens.color.errorBase, fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize }}>{errors.form}</Text>}
    <View style={{ gap: tokens.spacing.two, marginTop: tokens.spacing.two }}>
      <Button onPress={review}>Review Details</Button>
      <Button variant="secondary" onPress={() => leave()}>{t('inventory.cancel')}</Button>
      {!adding && <Button variant="destructiveOutline" onPress={() => setConfirmation('delete')}>{t('inventory.delete.asset')}</Button>}
    </View>
  </View>;

  const reviewDetails = selectedClassification && <View style={{ gap: tokens.spacing.three }}>
    <ReviewSectionLabel>ASSET INFORMATION</ReviewSectionLabel>
    <InvCard>
      <ReviewRow label="Asset Name" value={name.trim()} />
      <ReviewRow label="Asset Value" value={amount === null ? '—' : formatPesos(amount)} financial />
      <ReviewRow label="Asset Category" value={assetCategoryName(selectedClassification)} />
      {selectedClassification !== 'current' && <ReviewRow label="Estimated Useful Life" value={`${life} Years`} />}
    </InvCard>

    <ReviewSectionLabel>ASSET CLASSIFICATION</ReviewSectionLabel>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.two, borderWidth: 1, borderColor: tokens.color.brightBlue, borderRadius: tokens.radius.control, backgroundColor: tokens.color.iceContainer, padding: tokens.spacing.three }}>
      <PosIcon name="info" size={18} color={tokens.color.brightBlue} />
      <View style={{ flex: 1, gap: tokens.spacing.one }}>
        <InvText bold size={12} color={tokens.color.royalBlue}>{selectedClassification === 'current' ? 'Current Asset' : 'Non-current Asset'}</InvText>
        <InvText size={12} color={tokens.color.textSecondary}>Automatically assigned based on the selected category: {assetCategoryName(selectedClassification)}.</InvText>
      </View>
    </View>

    <View style={{ gap: tokens.spacing.two, borderRadius: tokens.radius.control, backgroundColor: tokens.color.royalBlue, padding: tokens.spacing.three }}>
      <InvText bold size={14} color={tokens.color.surfaceCard}>Asset Value to Be Recorded</InvText>
      <InvText bold size={30} color={tokens.color.surfaceCard}>{amount === null ? '₱0.00' : formatPesos(amount)}</InvText>
    </View>

    <View style={{ gap: tokens.spacing.two, marginTop: tokens.spacing.two }}>
      <Button onPress={() => setConfirmation('save')}>Confirm &amp; Save</Button>
      <Button variant="secondary" onPress={() => { setStep('details'); setErrors({}); }}>Edit Details</Button>
    </View>
  </View>;

  return <InventoryFrame title={title} back inlineTitle background subtitle={subtitle}
    illustration={step === 'details' ? inventoryIllustrations.asset : undefined}
    onBack={() => { if (step === 'review') { setStep('details'); setErrors({}); } else leave(); }} hideNavigationWithKeyboard
    overlay={<>
      <MotionModal visible={!!confirmation} backdropColor={quickAddColors.backdrop} onRequestClose={() => dismissConfirmation()} onHidden={() => {
        const action = pendingConfirmationAction.current;
        pendingConfirmationAction.current = null;
        action?.();
      }}>
        <View className="flex-1 justify-center px-5">
          {confirmation === 'save' && <ConfirmationContent variant="quickAdd" title="Confirm & Save Asset?"
            message="Please review your changes before saving the updated asset."
            leadingIcon={<PosIcon name="info" size={24} color={tokens.color.brightBlue} />}
            titleColor={tokens.color.darkNavy} iconTone="blue" destructive={false} cancelVariant="secondary"
            confirmLabel="Confirm" cancelLabel="Cancel" onCancel={() => dismissConfirmation()} onConfirm={() => dismissConfirmation(() => { void save(); })} />}
          {confirmation === 'delete' && <ConfirmationContent variant="quickAdd" title="Delete Asset?"
            message="Are you sure you want to delete this asset from your inventory? This action cannot be undone."
            confirmLabel="Delete" cancelLabel="Cancel" onCancel={() => dismissConfirmation()} onConfirm={() => dismissConfirmation(() => { void remove(); })} />}
        </View>
      </MotionModal>
      <MotionModal visible={successVisible} backdropColor={quickAddColors.backdrop} onRequestClose={() => setSuccessVisible(false)} onHidden={() => { if (saved) leave(); }}>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
            {saved && <SuccessContent testID="asset-success" title="Changes Saved" amountCentavos={saved.valueCentavos}
              message={`${saved.name} ${adding ? 'added' : 'updated'} successfully.`} eventKey={saved.id} visible={successVisible} onClose={() => setSuccessVisible(false)} />}
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </MotionModal>
    </>}>
    {!adding && preview.control}
    {step === 'details' ? form : reviewDetails}
  </InventoryFrame>;
}

function ReviewSectionLabel({ children }: { children: string }) {
  return <Text style={{ color: tokens.color.textSecondary, fontFamily: tokens.typography.weights.semibold,
    fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight }}>{children}</Text>;
}

function ReviewRow({ label, value, financial = false }: { label: string; value: string; financial?: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing.three }}>
    <Text style={{ flexShrink: 0, color: tokens.color.textSecondary, fontFamily: tokens.typography.weights.regular,
      fontSize: tokens.typography.microCaption.fontSize, lineHeight: tokens.typography.microCaption.lineHeight }}>{label}</Text>
    <Text style={{ flex: 1, textAlign: 'right', color: tokens.color.textPrimary, fontFamily: tokens.typography.weights[financial ? 'bold' : 'semibold'],
      fontSize: financial ? tokens.typography.listFinancial.fontSize : tokens.typography.microFinancialRate.fontSize,
      lineHeight: financial ? tokens.typography.listFinancial.lineHeight : tokens.typography.microFinancialRate.lineHeight }}>{value}</Text>
  </View>;
}
