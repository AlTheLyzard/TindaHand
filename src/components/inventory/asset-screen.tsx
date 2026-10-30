import type { TextInputInstance } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { InvCard, InvDanger, InvField, InventoryFrame, InvSelect, InvText } from './inventory-ui';
import { useInventory } from '@/state/inventory';
import type { AssetClassification } from '@/types/inventory';
import { assetLabels, todayInManila } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

export function AssetScreen() {
  useTranslation();
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { store, dispatch, setFeedback } = useInventory();
  const preview = useContentPreview();
  const asset = store.assets.find(a => a.id === id);
  const [name, setName] = useState(asset?.name ?? '');
  const [value, setValue] = useState(asset ? (asset.valueCentavos / 100).toFixed(2) : '');
  const [life, setLife] = useState(asset ? String(asset.usefulLifeYears) : '');
  const [classification, setClassification] = useState<AssetClassification | ''>(asset?.classification ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newId] = useState(() => `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const submitted = useRef(false);
  const valueInput = useRef<TextInputInstance>(null);
  const lifeInput = useRef<TextInputInstance>(null);
  const adding = mode === 'add', deleting = mode === 'delete';
  function leave(message?: string) { Keyboard.dismiss(); if (message) setFeedback(message); if (router.canGoBack()) router.back(); else router.replace({ pathname: '/owner-inventory', params: { tab: 'assets' } }); }
  function save() {
    if (submitted.current) return;
    Keyboard.dismiss();
    const next: Record<string, string> = {};
    const amount = parsePaymentAmount(value);
    if (!name.trim()) next.name = t("inventory.asset.name.is.required");
    if (amount === null || amount <= 0) next.value = t("inventory.enter.a.value.greater.than.zero.with");
    if (!Object.prototype.hasOwnProperty.call(assetLabels, classification)) next.classification = t("inventory.select.an.asset.classification");
    if (classification !== 'current' && (!/^\d+$/.test(life) || Number(life) < 1 || Number(life) > 100)) next.life = t("inventory.enter.a.whole.useful.life.from.1");
    setErrors(next);
    if (Object.keys(next).length) return;
    submitted.current = true;
    if (dispatch({ type: 'saveAsset', asset: { id: asset?.id ?? newId, name: name.trim(), valueCentavos: amount!, usefulLifeYears: classification === 'current' ? 0 : Number(life), classification: classification as AssetClassification, recordedDate: asset?.recordedDate ?? todayInManila() } })) leave(t(adding ? 'inventory.asset.added' : 'inventory.asset.updated', { name: name.trim(), amount: formatPesos(amount!) }));
    else { submitted.current = false; setErrors({ form: t("inventory.asset.could.not.be.saved.please.sign") }); }
  }
  function remove() {
    if (!asset || submitted.current) return;
    submitted.current = true;
    if (dispatch({ type: 'deleteAsset', id: asset.id })) leave(t('inventory.asset.deleted', { name: asset.name }));
    else { submitted.current = false; setErrors({ form: t("inventory.asset.could.not.be.deleted") }); }
  }
  if (!adding && preview.loading) return <InventoryFrame title={deleting ? t('inventory.delete.asset') : t('inventory.edit.asset')} back>{preview.control}<RecordSkeleton kind={deleting ? 'asset' : 'form'} form="asset" count={1} deleting={deleting} /></InventoryFrame>;
  if ((!adding && (!asset || preview.empty)) || !['add', 'edit', 'delete'].includes(mode ?? '')) return <InventoryFrame title={t("inventory.asset.unavailable")} back>{preview.control}<EmptyState title="Asset unavailable" description="This asset is no longer available. Return to your asset records to choose another." action="Return to Assets" onAction={() => { preview.reset(); router.replace({ pathname: '/owner-inventory', params: { tab: 'assets' } }); }} /></InventoryFrame>;
  return <InventoryFrame title={deleting ? t("inventory.delete.asset") : adding ? t("inventory.add.asset2") : t("inventory.edit.asset")} back>
    {!adding && preview.control}
    <InvText>{deleting ? t("inventory.are.you.sure.you.want.to.remove2") : t("inventory.record.your.business.asset.details")}</InvText>
    {deleting && asset ? <><InvCard><InvText bold size={20}>{asset.name}</InvText><InvText>{assetLabels[asset.classification]}</InvText><InvText bold>{formatPesos(asset.valueCentavos)}</InvText></InvCard><View className="rounded-control bg-[#FFEBEE] p-4"><InvText color="#972020">{t("inventory.this.will.remove")}{asset.name} {t("inventory.from.your.asset.records.this.action.cannot")}</InvText></View><Button variant="secondary" onPress={() => leave()}>{t("inventory.cancel")}</Button><InvDanger label={t("inventory.delete.asset")} onPress={remove} /></> : <>
      <InvField label={t("inventory.asset.name.required")} value={name} onChangeText={setName} error={errors.name} placeholder={t("inventory.enter.asset.name")} maxLength={120} returnKeyType="next" onSubmitEditing={() => valueInput.current?.focus()} />
      <InvField label={t("inventory.amount.value.required")} inputRef={valueInput} value={value} onChangeText={setValue} error={errors.value} placeholder="0.00" keyboardType="decimal-pad" returnKeyType={classification === 'current' ? 'done' : 'next'} onSubmitEditing={() => classification === 'current' ? Keyboard.dismiss() : lifeInput.current?.focus()} />
      <InvSelect label={t("inventory.asset.classification.required")} value={classification} options={assetLabels} onChange={v => setClassification(v as AssetClassification)} error={errors.classification} />
      {classification !== 'current' ? <InvField label={t("inventory.estimated.useful.life.in.years.required")} inputRef={lifeInput} value={life} onChangeText={setLife} error={errors.life} placeholder={t("inventory.years2")} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /> : <InvText>{t("inventory.estimated.useful.life.does.not.apply.to")}</InvText>}
      <View className="mt-6 gap-3"><Button onPress={save}>{adding ? t("inventory.save.asset") : t("inventory.save.changes")}</Button><Button variant="secondary" onPress={() => leave()}>{t("inventory.cancel")}</Button></View>
    </>}
    {!!errors.form && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{errors.form}</Text>}
  </InventoryFrame>;
}
