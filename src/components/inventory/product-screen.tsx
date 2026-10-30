import type { TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { usePushOnce } from '@/hooks/use-push-once';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Keyboard, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import { InvCard, InvDanger, InvDateField, InvField, InventoryFrame, InvText, InvSelect } from './inventory-ui';
import { useInventory } from '@/state/inventory';
import type { InventoryProduct, ProductDraft } from '@/types/inventory';
import { categoryLabels, emptyProductDraft, expiryStatus, productDraft, stockLabels, stockStatus, todayInManila, validateProduct } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

export function ProductScreen() {
  const push = usePushOnce();
  useTranslation();
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { store, dispatch, setFeedback } = useInventory();
  const preview = useContentPreview();
  const mode = ['add', 'edit', 'restock', 'delete', 'details'].includes(params.mode ?? '') ? params.mode! : 'details';
  const product = store.products.find(p => p.id === params.id);
  const [draft, setDraft] = useState<ProductDraft>(() => product ? { ...productDraft(product), ...(mode === 'restock' ? { quantity: '', expirationDate: '' } : {}) } : emptyProductDraft());
  const initial = useRef({ ...draft });
  const sellingInput = useRef<TextInputInstance>(null);
  const costInput = useRef<TextInputInstance>(null);
  const quantityInput = useRef<TextInputInstance>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductDraft, string>>>({});
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const submitted = useRef(false);
  const [id] = useState(() => `product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const [restockId] = useState(() => `restock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const today = todayInManila();
  const readonly = mode === 'details' || mode === 'delete';
  const title = mode === 'add' ? t("inventory.add.product2") : mode === 'edit' ? t("inventory.edit.product") : mode === 'restock' ? t("inventory.restock.product") : mode === 'delete' ? t("inventory.delete.product") : t("inventory.product.details");
  const update = (key: keyof ProductDraft, value: string) => { setDraft(d => ({ ...d, [key]: value })); setErrors(e => ({ ...e, [key]: undefined })); setError(''); };
  function leave(message?: string) {
    Keyboard.dismiss();
    if (message) setFeedback(message);
    if (router.canGoBack()) router.back(); else router.replace('/owner-inventory');
  }
  async function pickPhoto() {
    if (picking) return;
    setPicking(true); setError('');
    try {
      // The system image-only picker needs no broad library permission on either platform.
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (result.canceled) return;
      const photo = result.assets[0];
      const format = photo.mimeType?.toLowerCase();
      const supported = format ? ['image/jpeg', 'image/png'].includes(format) : /\.(jpe?g|png)$/i.test(photo.fileName ?? photo.uri);
      if (!supported) { setError(t("inventory.choose.a.jpg.or.png.photo")); return; }
      if (photo.fileSize == null || photo.fileSize > 2 * 1024 * 1024) { setError(photo.fileSize == null ? t("inventory.the.photo.size.could.not.be.verified") : t("inventory.photo.must.be.2.mb.or.smaller")); return; }
      update('photoUri', photo.uri);
    } catch {
      setError(t("inventory.the.photo.picker.could.not.open.check"));
    } finally { setPicking(false); }
  }
  function save() {
    if (submitted.current || picking) return;
    Keyboard.dismiss();
    const validation = validateProduct(draft, mode === 'restock' ? 'restock' : mode === 'edit' ? 'edit' : 'add', today);
    setErrors(validation);
    if (Object.keys(validation).length) { setError(t("inventory.please.correct.the.highlighted.fields")); return; }
    const quantity = Number(draft.quantity);
    submitted.current = true;
    if (mode === 'restock' && product) {
      if (!dispatch({ type: 'restock', record: { id: restockId, productId: product.id, itemName: product.name, quantity, stockDate: draft.stockDate, expirationDate: draft.expirationDate, recordedAt: new Date().toISOString() }, photoUri: draft.photoUri })) {
        submitted.current = false; setError(t("inventory.restock.could.not.be.saved.the.total")); return;
      }
      leave(t("inventory.added.units.to.stock.date", { quantity: quantity, name: product.name, stockDate: draft.stockDate }));
    } else {
      const next: InventoryProduct = { id: product?.id ?? id, name: draft.name.trim(), category: draft.category as InventoryProduct['category'], stock: quantity, unitPriceCentavos: parsePaymentAmount(draft.sellingPrice)!, costCentavos: parsePaymentAmount(draft.cost)!, expirationDate: draft.expirationDate, photoUri: draft.photoUri };
      if (!dispatch({ type: 'saveProduct', product: next })) { submitted.current = false; setError(t("inventory.product.could.not.be.saved.please.sign")); return; }
      leave(t(mode === 'edit' ? 'inventory.product.updated' : 'inventory.product.added', { name: next.name }));
    }
  }
  function remove() {
    if (submitted.current || !product) return;
    submitted.current = true;
    if (dispatch({ type: 'deleteProduct', id: product.id })) leave(t('inventory.product.deleted', { name: product.name }));
    else { submitted.current = false; setError(t("inventory.product.could.not.be.deleted")); }
  }
  if (mode !== 'add' && preview.loading) return <InventoryFrame title={title} back>{preview.control}<RecordSkeleton kind={readonly ? 'details' : 'form'} form={mode === 'restock' ? 'restock' : 'product'} deleting={mode === 'delete'} /></InventoryFrame>;
  if (mode !== 'add' && (!product || preview.empty)) return <InventoryFrame title={t("inventory.product.unavailable")} back>{preview.control}<EmptyState title="Product unavailable" description="This product is no longer available. Return to Inventory to choose another product." action="Return to Inventory" onAction={() => { preview.reset(); router.replace('/owner-inventory'); }} /></InventoryFrame>;
  const restocks = store.restocks.filter(r => r.productId === product?.id).slice().reverse();
  return <InventoryFrame title={title} back>
    {mode !== 'add' && preview.control}
    <InvText>{mode === 'delete' ? t("inventory.are.you.sure.you.want.to.remove") : mode === 'restock' ? t("inventory.record.incoming.stock.for.your.store") : t("inventory.product.details.for.your.store")}</InvText>
    {readonly && product ? <>
      <InvCard><View className="self-center rounded-control bg-[#D9E7F4] p-5">{product.photoUri ? <Image source={{ uri: product.photoUri }} style={{ width: 100, height: 100 }} /> : <PosIcon name="image" size={64} />}</View>
        <InvText bold size={20} color="#102342">{product.name}</InvText><InvText>{categoryLabels[product.category]}</InvText>
        <InvText>{t("inventory.selling.price")}{formatPesos(product.unitPriceCentavos)}</InvText><InvText>{t("inventory.cost.capital.price")}{formatPesos(product.costCentavos)}</InvText>
        <InvText>{product.stock}{t("inventory.pcs2")}{stockLabels[stockStatus(product.stock)]}</InvText><InvText>{t("inventory.expiration.date")}{product.expirationDate}</InvText>
        {expiryStatus(product.expirationDate, today) !== 'fresh' && <InvText color="#972020">{expiryStatus(product.expirationDate, today) === 'expired' ? t("inventory.this.product.is.expired") : t("inventory.this.product.expires.within.30.days")}</InvText>}
      </InvCard>
      {mode === 'delete' ? <><View className="rounded-control bg-[#FFEBEE] p-4"><InvText color="#972020">{t("inventory.this.will.remove")}{product.name} {t("inventory.from.your.product.list.this.action.cannot")}</InvText></View><Button variant="secondary" onPress={() => leave()}>{t("inventory.cancel")}</Button><InvDanger label={t("inventory.delete.product")} onPress={remove} /></> : <>
        <Button onPress={() => push({ pathname: '/owner-inventory/product', params: { id: product.id, mode: 'edit' } })}>{t("inventory.edit.product")}</Button>
        <Button onPress={() => push({ pathname: '/owner-inventory/product', params: { id: product.id, mode: 'restock' } })}>{t("inventory.restock2")}</Button>
        <InvText bold size={18} color="#112F6F">{t("inventory.restock.history")}</InvText>
        {restocks.length === 0 ? <EmptyState title="No restocks yet" description="Restocks recorded in this session will appear here." action="Restock" onAction={() => push({ pathname: '/owner-inventory/product', params: { id: product.id, mode: 'restock' } })} /> : restocks.map(r => <InvCard key={r.id}><InvText bold>+{r.quantity}{t("inventory.pcs2")}{r.stockDate}</InvText><InvText>{t("inventory.expires2")}{r.expirationDate}</InvText><InvText>{t("inventory.recorded")}{new Date(r.recordedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</InvText></InvCard>)}
      </>}
    </> : <>
      <InvField label={t("inventory.product.name.required")} value={draft.name} onChangeText={v => update('name', v)} error={errors.name} placeholder={t("inventory.enter.product.name")} editable={mode !== 'restock'} returnKeyType="next" onSubmitEditing={() => sellingInput.current?.focus()} maxLength={120} />
      <View className="flex-row flex-wrap items-start gap-4"><View className="min-w-[130px] flex-1">{mode === 'restock' ? <InvCard><InvText bold>{t("inventory.category")}</InvText><InvText>{categoryLabels[product!.category]}</InvText></InvCard> : <InvSelect label={t("inventory.category.required")} value={draft.category} options={categoryLabels} onChange={v => update('category', v)} error={errors.category} />}</View><View className="min-w-[130px] flex-1"><InvDateField label={t("inventory.expiration.date.required")} value={draft.expirationDate} onChange={v => update('expirationDate', v)} error={errors.expirationDate} /></View></View>
      <View className="flex-row flex-wrap gap-4"><View className="min-w-[130px] flex-1"><InvField label={t("inventory.selling.price.required")} inputRef={sellingInput} value={draft.sellingPrice} onChangeText={v => update('sellingPrice', v)} error={errors.sellingPrice} placeholder="0.00" keyboardType="decimal-pad" editable={mode !== 'restock'} returnKeyType="next" onSubmitEditing={() => costInput.current?.focus()} /></View><View className="min-w-[130px] flex-1"><InvField label={t("inventory.cost.capital.price.required")} inputRef={costInput} value={draft.cost} onChangeText={v => update('cost', v)} error={errors.cost} placeholder="0.00" keyboardType="decimal-pad" editable={mode !== 'restock'} returnKeyType="next" onSubmitEditing={() => quantityInput.current?.focus()} /></View></View>
      <InvField label={mode === 'restock' ? t("inventory.incoming.quantity.required") : mode === 'add' ? t("inventory.initial.stock.quantity.required") : t("inventory.stock.quantity.required")} inputRef={quantityInput} value={draft.quantity} onChangeText={v => update('quantity', v)} error={errors.quantity} placeholder="0" keyboardType="number-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} maxLength={7} />
      {mode === 'restock' && <><InvText>{t("inventory.current.stock")}{product!.stock}{t("inventory.pcs")}</InvText><InvDateField label={t("inventory.stock.date.required")} value={draft.stockDate} onChange={v => update('stockDate', v)} error={errors.stockDate} /></>}
      <Pressable accessibilityRole="button" accessibilityLabel={t("inventory.choose.a.product.photo.optional")} accessibilityState={{ disabled: picking }} disabled={picking} onPress={pickPhoto} className="min-h-[136px] items-center justify-center gap-2 rounded-surface border border-[#B0C8E3] bg-white p-5" style={{ boxShadow: '0 3px 3px #B0C8E3' }}>
        {draft.photoUri ? <Image source={{ uri: draft.photoUri }} style={{ width: 100, height: 100 }} /> : <View className="h-10 w-10 items-center justify-center rounded-pill bg-brand"><InvText size={24} bold color="#FFFFFF">+</InvText></View>}
        <InvText bold color="#102342">{picking ? t("inventory.opening.photo.picker") : t("inventory.choose.or.upload.a.photo.optional")}</InvText><InvText size={10}>{t("inventory.max.file.size.2.mb.supported.formats")}</InvText>
      </Pressable>
      {!!draft.photoUri && <Button variant="secondary" onPress={() => setDraft(d => ({ ...d, photoUri: undefined }))}>{t("inventory.remove.photo")}</Button>}
      <View className="mt-6 gap-3"><Button disabled={picking} onPress={save}>{mode === 'restock' ? t("inventory.restock2") : mode === 'edit' ? t("inventory.save.changes") : t("inventory.save.product")}</Button>
        {mode === 'add' && <Button variant="secondary" onPress={() => { setDraft({ ...initial.current }); setErrors({}); setError(''); }}>{t("inventory.clear")}</Button>}
        <Button variant="secondary" onPress={() => leave()}>{t("inventory.cancel")}</Button>
      </View>
    </>}
    {!!error && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{error}</Text>}
  </InventoryFrame>;
}
