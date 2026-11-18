import type { ScrollViewInstance, TextInputInstance } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionModal } from '@/components/ui/motion-modal';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { SuccessContent } from '@/components/ui/success-content';
import { quickAddColors } from '@/components/dashboard/quick-add-ui';
import { Button } from '@/components/ui/button';
import { InvCard, InvDanger, InvField, InventoryFrame, InvText, inventoryIllustrations } from './inventory-ui';
import { AssetClassificationField, assetClassificationIllustrations } from './asset-classification-field';
import { useInventory } from '@/state/inventory';
import type { AssetClassification, BusinessAsset } from '@/types/inventory';
import { assetLabels, todayInManila } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

type AssetStep = 'details' | 'review';

const assetDescriptions: Record<AssetClassification, string> = {
  current: 'Money currently available in your business.',
  equipment: 'Machines, tools, and business equipment.',
  furniture: 'Tables, chairs, shelves, and store fixtures.',
};

export function AssetScreen() {
  useTranslation();
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { store, dispatch, setFeedback } = useInventory();
  const preview = useContentPreview();
  const asset = store.assets.find(a => a.id === id);
  const [initial] = useState(() => ({
    name: asset?.name ?? '',
    value: asset ? (asset.valueCentavos / 100).toFixed(2) : '',
    life: asset && asset.usefulLifeYears ? String(asset.usefulLifeYears) : '',
    classification: asset?.classification ?? '' as AssetClassification | '',
  }));
  const [name, setName] = useState(initial.name);
  const [value, setValue] = useState(initial.value);
  const [life, setLife] = useState(initial.life);
  const [classification, setClassification] = useState<AssetClassification | ''>(initial.classification);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<BusinessAsset | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [step, setStep] = useState<AssetStep>('details');
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const insets = useSafeAreaInsets();
  const [newId] = useState(() => `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const submitted = useRef(false);
  const afterDeleteClose = useRef<(() => void) | null>(null);
  const valueInput = useRef<TextInputInstance>(null);
  const lifeInput = useRef<TextInputInstance>(null);
  const adding = mode === 'add';
  const deleting = mode === 'delete';
  const editing = mode === 'edit';
  const reviewing = adding && step === 'review';
  const dirty = editing && (name !== initial.name || value !== initial.value || life !== initial.life || classification !== initial.classification);
  const amount = parsePaymentAmount(value);
  const title = deleting ? t('inventory.delete.asset') : reviewing ? 'Review Asset Details' : adding ? t('inventory.add.asset2') : t('inventory.edit.asset');

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [step]);

  function leave(message?: string) {
    Keyboard.dismiss();
    setLeaving(true);
    if (message) setFeedback(message);
    router.dismissTo({ pathname: '/owner-inventory', params: { tab: 'assets' } });
  }

  function validateFields() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t('inventory.asset.name.is.required');
    if (amount === null || amount <= 0) next.value = t('inventory.enter.a.value.greater.than.zero.with');
    if (!Object.prototype.hasOwnProperty.call(assetLabels, classification)) next.classification = t('inventory.select.an.asset.classification');
    if (classification !== 'current' && (!/^\d+$/.test(life) || Number(life) < 1 || Number(life) > 100)) next.life = t('inventory.enter.a.whole.useful.life.from.1');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function reviewDetails() {
    Keyboard.dismiss();
    if (validateFields()) setStep('review');
  }

  function save() {
    if (submitted.current || saved) return;
    Keyboard.dismiss();
    if (!validateFields()) {
      if (adding) setStep('details');
      return;
    }
    submitted.current = true;
    setSaving(true);
    const record: BusinessAsset = {
      id: asset?.id ?? newId,
      name: name.trim(),
      valueCentavos: amount!,
      usefulLifeYears: classification === 'current' ? 0 : Number(life),
      classification: classification as AssetClassification,
      recordedDate: asset?.recordedDate ?? todayInManila(),
    };
    if (dispatch({ type: 'saveAsset', asset: record })) {
      setSaved(record);
      setSuccessVisible(true);
    } else {
      submitted.current = false;
      setSaving(false);
      setErrors({ form: t('inventory.asset.could.not.be.saved.please.sign') });
    }
  }

  function remove() {
    if (!asset || submitted.current) return;
    submitted.current = true;
    setSaving(true);
    if (dispatch({ type: 'deleteAsset', id: asset.id })) {
      const message = t('inventory.asset.deleted', { name: asset.name });
      if (deleteConfirmation) {
        setLeaving(true);
        afterDeleteClose.current = () => leave(message);
        setDeleteConfirmation(false);
      } else leave(message);
    } else {
      submitted.current = false;
      setSaving(false);
      setErrors({ form: t('inventory.asset.could.not.be.deleted') });
      setDeleteConfirmation(false);
    }
  }

  if (!adding && preview.loading) return <InventoryFrame title={deleting ? t('inventory.delete.asset') : t('inventory.edit.asset')} back inlineTitle background>{preview.control}<RecordSkeleton kind={deleting ? 'asset' : 'form'} form="asset" count={1} deleting={deleting} /></InventoryFrame>;
  if ((!adding && (!asset || preview.empty) && !leaving) || !['add', 'edit', 'delete'].includes(mode ?? '')) return <InventoryFrame title={t('inventory.asset.unavailable')} back>{preview.control}<EmptyState title="Asset unavailable" description="This asset is no longer available. Return to your asset records to choose another." action="Return to Assets" onAction={() => { preview.reset(); router.replace({ pathname: '/owner-inventory', params: { tab: 'assets' } }); }} /></InventoryFrame>;

  const footer = deleting || reviewing ? undefined : <>
    <Button loading={saving} disabled={!!saved || (editing && !dirty)} onPress={adding ? reviewDetails : save}>{adding ? 'Review Details' : t('inventory.save.changes')}</Button>
    <Button variant="secondary" disabled={saving || !!saved} onPress={() => leave()}>{t('inventory.cancel')}</Button>
  </>;

  return <InventoryFrame title={title} back inlineTitle background scrollRef={scrollRef} illustration={!reviewing && !deleting ? inventoryIllustrations.asset : undefined}
    subtitle={reviewing ? 'Review the asset details before saving.' : deleting ? t('inventory.are.you.sure.you.want.to.remove2') : t('inventory.record.your.business.asset.details')}
    hideNavigationWithKeyboard footer={footer} onBack={() => reviewing ? setStep('details') : leave()} overlay={<>
      <MotionModal visible={successVisible} backdropColor={quickAddColors.backdrop} onRequestClose={() => setSuccessVisible(false)} onHidden={() => { if (saved) leave(); }}>
        <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
          <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
            {saved && <SuccessContent testID="asset-success" title={adding ? 'Asset Added' : 'Changes Saved'} amountCentavos={saved.valueCentavos}
              message={`${saved.name} ${adding ? 'added' : 'updated'} successfully.`} eventKey={saved.id} visible={successVisible} onClose={() => setSuccessVisible(false)} />}
          </KeyboardAwareScrollView>
        </SafeAreaView>
      </MotionModal>
      <MotionModal visible={deleteConfirmation} onRequestClose={() => { if (!submitted.current) setDeleteConfirmation(false); }}
        onHidden={() => { const action = afterDeleteClose.current; afterDeleteClose.current = null; action?.(); }}>
        <View className="flex-1 justify-center px-5">
          {deleteConfirmation && <ConfirmationContent title="Delete Asset?" message={`Delete ${asset?.name ?? 'this asset'} from your asset records? This cannot be undone.`}
            confirmLabel="Delete Asset" cancelLabel="Cancel" onCancel={() => setDeleteConfirmation(false)} onConfirm={remove} />}
        </View>
      </MotionModal>
    </>}>
    {!adding && preview.control}
    {deleting && asset ? <>
      <InvCard><InvText bold size={20}>{asset.name}</InvText><InvText>{assetLabels[asset.classification]}</InvText><InvText bold>{formatPesos(asset.valueCentavos)}</InvText></InvCard>
      <View className="rounded-control bg-[#FFEBEE] p-4"><InvText color="#972020">{t('inventory.this.will.remove')}{asset.name} {t('inventory.from.your.asset.records.this.action.cannot')}</InvText></View>
      {!!errors.form && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{errors.form}</Text>}
      <Button variant="secondary" onPress={() => leave()}>{t('inventory.cancel')}</Button>
      <InvDanger label={t('inventory.delete.asset')} onPress={remove} />
    </> : reviewing ? <>
      <AssetReview name={name.trim()} amountCentavos={amount ?? 0} classification={classification as AssetClassification} life={life} />
      {!!errors.form && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{errors.form}</Text>}
      <View className="mt-2 gap-3">
        <Button loading={saving} disabled={!!saved} onPress={save}>Confirm &amp; Save</Button>
        <Button variant="secondary" disabled={saving || !!saved} onPress={() => { setErrors({}); setStep('details'); }}>Edit Details</Button>
      </View>
    </> : <>
      <InvField label={t('inventory.asset.name.required')} value={name} onChangeText={setName} error={errors.name} placeholder={t('inventory.enter.asset.name')} maxLength={120} returnKeyType="next" onSubmitEditing={() => valueInput.current?.focus()} />
      <InvField money label={t('inventory.amount.value.required')} inputRef={valueInput} value={value} onChangeText={setValue} error={errors.value} placeholder="0.00" keyboardType="decimal-pad" returnKeyType={classification === 'current' ? 'done' : 'next'} onSubmitEditing={() => classification === 'current' ? Keyboard.dismiss() : lifeInput.current?.focus()} />
      <AssetClassificationField label={t('inventory.asset.classification.required')} value={classification} onChange={setClassification} error={errors.classification} />
      {classification !== 'current' ? <InvField label={t('inventory.estimated.useful.life.in.years.required')} inputRef={lifeInput} value={life} onChangeText={setLife} error={errors.life} placeholder={t('inventory.years2')} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /> : <InvText>{t('inventory.estimated.useful.life.does.not.apply.to')}</InvText>}
      {!adding && <View className="mt-8 gap-2 border-t border-[#B0C8E3] pt-4"><InvText size={10}>This action cannot be undone.</InvText><Button variant="destructiveOutline" disabled={saving} onPress={() => setDeleteConfirmation(true)}>Delete Asset</Button></View>}
      {!!errors.form && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{errors.form}</Text>}
    </>}
  </InventoryFrame>;
}

function AssetReview({ name, amountCentavos, classification, life }: {
  name: string; amountCentavos: number; classification: AssetClassification; life: string;
}) {
  const isCurrent = classification === 'current';
  const value = formatPesos(amountCentavos);
  const classificationLabel = assetLabels[classification];
  const category = isCurrent ? 'Current Asset' : 'Non-Current Asset';
  const categoryColor = isCurrent ? '#286B2C' : '#245399';
  return <>
    <View className="items-center gap-2 py-2">
      <View className="h-14 w-14 items-center justify-center rounded-card bg-[#D9E7F4]">
        <ExpoImage source={assetClassificationIllustrations[classification]} accessible={false} contentFit="contain" style={{ width: 32, height: 32 }} />
      </View>
      <InvText bold size={18} color="#112F6F">{name}</InvText>
      <InvText size={11}>Please review the details before saving.</InvText>
    </View>

    <InvText bold color="#245399">Asset Information</InvText>
    <InvCard>
      <ReviewRow label="Asset Name" value={name} />
      <ReviewRow label="Asset Value" value={value} />
      <ReviewRow label="Asset Category" value={classificationLabel} />
      {!isCurrent && <ReviewRow label="Estimated Useful Life" value={`${life} ${Number(life) === 1 ? 'year' : 'years'}`} />}
    </InvCard>

    <InvText bold color="#245399">Asset Classification</InvText>
    <View className="min-h-20 flex-row items-center gap-3 rounded-control border border-[#B0C8E3] bg-white p-3">
      <ExpoImage source={assetClassificationIllustrations[classification]} accessible={false} contentFit="contain" style={{ width: 28, height: 28 }} />
      <View className="min-w-0 flex-1 gap-1"><InvText bold color="#102342">{classificationLabel}</InvText><InvText size={10}>{assetDescriptions[classification]}</InvText></View>
      <InvText bold size={9} color={categoryColor}>{category}</InvText>
    </View>

    <InvText bold color="#245399">Asset Value to Be Recorded</InvText>
    <InvCard><Text className="font-poppins-bold text-[24px] text-brand">{value}</Text></InvCard>
  </>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <View className="flex-row flex-wrap items-start justify-between gap-3 py-1">
    <View className="min-w-[100px] flex-1"><InvText size={11}>{label}</InvText></View>
    <View className="min-w-[100px] flex-1"><Text className="text-right font-poppins-bold text-[11px] text-[#102342]">{value}</Text></View>
  </View>;
}
