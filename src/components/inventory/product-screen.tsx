import type { TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { usePushOnce } from '@/hooks/use-push-once';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Keyboard, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { MotionModal } from '@/components/ui/motion-modal';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { SuccessContent } from '@/components/ui/success-content';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { PosDialog } from '@/components/pos/pos-dialog';
import { PosIcon } from '@/components/pos/pos-icon';
import { quickAddColors } from '@/components/dashboard/quick-add-ui';
import { InvCard, InvField, InventoryFrame, InvText, InvSelect, inventoryIllustrations } from './inventory-ui';
import { BatchCard, ExistingBatchCard, batchExpiryLabel } from './batch-card';
import { useInventory } from '@/state/inventory';
import type { BatchDraft, BatchErrors, InventoryProduct, ProductDraft } from '@/types/inventory';
import { categoryLabels, earliestExpiry, productBatches, productExpiry, productStock, stockCategory, todayInManila } from '@/utils/inventory';
import { batchDraftsChanged, batchErrors, buildDraftProduct, clearInventoryStep, createInventoryDraft, detailsErrors, draftQuantity, newBatch, toStockBatches } from '@/utils/inventory-draft';
import { inventoryRules } from '@/constants/inventory-rules';
import { formatPesos } from '@/utils/dashboard';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

type Step = 'details' | 'stock' | 'review';
type Confirmation = { kind: 'clear' | 'discard' | 'batchDelete' | 'productDelete' | 'restock'; batchId?: string; action?: () => void };
const makeId = () => 'inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

export function ProductScreen() {
  const push = usePushOnce();
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { store, getStore, dispatch, setFeedback } = useInventory();
  const preview = useContentPreview();
  const mode = ['add', 'edit', 'restock', 'delete', 'details'].includes(params.mode ?? '') ? params.mode! : 'details';
  const liveProduct = store.products.find(p => p.id === params.id);
  const [originalProduct] = useState(liveProduct);
  const product = liveProduct ?? originalProduct;
  const [baseline] = useState(() => createInventoryDraft(makeId(), product));
  const [draft, setDraft] = useState(() => mode === 'restock' ? { ...baseline, batches: [newBatch(makeId())] } : baseline);
  const [initial] = useState(draft);
  const [baselineProduct] = useState(() => product ? JSON.stringify(product) : '');
  const [step, setStep] = useState<Step>('details');
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  const costInput = useRef<TextInputInstance>(null);
  const sellingInput = useRef<TextInputInstance>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductDraft, string>>>({});
  const [batchValidation, setBatchValidation] = useState<Record<string, BatchErrors>>({});
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [savedProduct, setSavedProduct] = useState<{ eventKey: string; value: string; message: string } | null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const busy = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  const restockPending = useRef<(() => void) | null>(null);
  const insets = useSafeAreaInsets();
  const [id] = useState(makeId);
  const [restockId] = useState(makeId);
  const today = todayInManila();
  const readonly = mode === 'details' || mode === 'delete';
  const restockDirty = mode === 'restock' && batchDraftsChanged(draft.batches, initial.batches);
  const dirty = mode === 'restock' ? restockDirty : !readonly && JSON.stringify(draft) !== JSON.stringify(initial);
  const title = mode === 'add' ? step === 'review' ? 'Review Product Details' : step === 'stock' ? 'Stock & Expiry' : 'Add Product' : mode === 'edit' ? 'Edit Product' : mode === 'restock' ? 'Restock Product' : mode === 'delete' ? 'Delete Product' : 'Product Details';
  const total = draftQuantity(draft.batches);
  const disablePrevention = usePreventRemove(!leaving && !readonly && (dirty || (mode === 'add' && step !== 'details')), ({ repeat }) => {
    if (busy.current || confirmation) return;
    if (mode === 'add' && step !== 'details') { setStep(step === 'review' ? 'stock' : 'details'); return; }
    setConfirmation({ kind: 'discard', action: repeat });
  });
  function navigate(action: () => void) {
    if (busy.current || picking || confirmation) return;
    Keyboard.dismiss();
    if (dirty) setConfirmation({ kind: 'discard', action }); else { disablePrevention(); action(); }
  }
  function back() {
    if (busy.current || picking) return;
    Keyboard.dismiss();
    if (mode === 'add' && step !== 'details') { setStep(step === 'review' ? 'stock' : 'details'); setError(''); return; }
    navigate(() => router.canGoBack() ? router.back() : router.replace('/owner-inventory'));
  }
  function finish(message: string) {
    disablePrevention(); setLeaving(true);
    const action = () => { setFeedback(message); router.dismissTo('/owner-inventory'); };
    if (confirmation) { pending.current = action; setConfirmation(null); } else action();
  }
  function showSavedSuccess(success: { eventKey: string; value: string; message: string }) {
    disablePrevention(); setLeaving(true);
    const present = () => { setSavedProduct(success); setSuccessVisible(true); };
    if (confirmation?.kind === 'restock') { restockPending.current = present; setConfirmation(null); }
    else if (confirmation) { pending.current = present; setConfirmation(null); }
    else present();
  }
  const update = (key: keyof ProductDraft, value: string | undefined) => {
    setDraft(d => ({ ...d, details: { ...d.details, [key]: value } }));
    setErrors(e => ({ ...e, [key]: undefined })); setError('');
  };
  function updateBatch(batch: BatchDraft) {
    setDraft(d => ({ ...d, batches: d.batches.map(b => b.id === batch.id ? batch : b) }));
    setBatchValidation(e => ({ ...e, [batch.id]: {} })); setError('');
  }
  function clearStep() {
    const populated = mode === 'restock' || step === 'stock'
      ? draft.batches.some(b => b.quantity || b.expirationDate || b.noExpiry) || draft.batches.length > 1
      : Object.entries(draft.details).some(([key, value]) => !['stockDate', 'quantity', 'expirationDate'].includes(key) && !!value);
    if (populated) setConfirmation({ kind: 'clear' }); else resetStep();
  }
  function resetStep() {
    setDraft(d => clearInventoryStep(d, mode === 'restock' || step === 'stock' ? 'stock' : 'details', makeId()));
    setErrors({}); setBatchValidation({}); setError('');
  }
  async function pickPhoto() {
    if (picking || busy.current) return;
    setPicking(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (result.canceled) return;
      const photo = result.assets[0];
      const format = photo.mimeType?.toLowerCase();
      const supported = format ? ['image/jpeg', 'image/png'].includes(format) : /\.(jpe?g|png)$/i.test(photo.fileName ?? photo.uri);
      if (!supported) { setError('Choose a JPG or PNG photo.'); return; }
      if (photo.fileSize == null || photo.fileSize > 2 * 1024 * 1024) { setError(photo.fileSize == null ? 'The photo size could not be verified. Choose another photo.' : 'Photo must be 2 MB or smaller.'); return; }
      update('photoUri', photo.uri);
    } catch { setError('The photo picker could not open. Check access in Settings and try again.'); }
    finally { setPicking(false); }
  }
  function validateDetails() {
    const validation = detailsErrors(draft.details, today); setErrors(validation);
    if (Object.keys(validation).length) { setError('Please correct the highlighted fields.'); return false; }
    return true;
  }
  function validateBatches() {
    const validation = Object.fromEntries(draft.batches.map(b => [b.id, batchErrors(b, mode === 'edit' && baseline.batches.some(original => original.id === b.id))]));
    setBatchValidation(validation);
    const invalid = draft.batches.find(b => Object.keys(validation[b.id]).length > 0);
    if (invalid || total > inventoryRules.maxStock || (mode !== 'edit' && !draft.batches.length)) {
      if (invalid) setExpandedBatch(invalid.id);
      setError(total > inventoryRules.maxStock ? 'Total stock cannot exceed 1,000,000 units.' : 'Please correct the highlighted batch fields.'); return false;
    }
    return true;
  }
  function advance() {
    Keyboard.dismiss(); setError('');
    if (step === 'details') { if (validateDetails()) setStep('stock'); }
    else if (validateBatches()) setStep('review');
  }
  function save() {
    if (busy.current || picking || leaving) return;
    Keyboard.dismiss();
    if (mode !== 'restock' && !validateDetails()) { if (mode === 'add') setStep('details'); return; }
    if (!validateBatches()) { if (mode === 'add') setStep('stock'); return; }
    if (mode === 'restock' && confirmation?.kind !== 'restock') { setConfirmation({ kind: 'restock' }); return; }
    const currentProduct = getStore().products.find(p => p.id === product?.id);
    if (mode === 'edit' && JSON.stringify(currentProduct) !== baselineProduct) { setError('This product changed while you were editing. Cancel and reopen it to use the latest stock.'); return; }
    busy.current = true; setSaving(true);
    let saved = false;
    if (mode === 'restock' && product) {
      saved = dispatch({ type: 'restock', record: { id: restockId, productId: product.id, itemName: product.name,
        quantity: total, stockDate: today, expirationDate: '', batches: toStockBatches(draft.batches), recordedAt: new Date().toISOString() } });
    } else saved = dispatch({ type: 'saveProduct', product: buildDraftProduct(product?.id ?? id, draft) });
    if (!saved) { busy.current = false; setSaving(false); setConfirmation(null); setError('Changes could not be saved. Check total stock and values, then try again.'); return; }
    const savedName = mode === 'restock' ? product!.name : draft.details.name.trim();
    const savedStock = mode === 'restock' && product ? productStock(product) + total : total;
    const message = mode === 'restock' ? `Added ${total} PCS to ${savedName}.` : `${savedName} ${mode === 'edit' ? 'updated' : 'added'} successfully.`;
    showSavedSuccess({ eventKey: makeId(), value: `${savedStock} PCS`, message });
  }
  function removeProduct() {
    if (busy.current || !product) return;
    busy.current = true; setSaving(true);
    if (dispatch({ type: 'deleteProduct', id: product.id })) finish(product.name + ' deleted.');
    else { busy.current = false; setSaving(false); setConfirmation(null); setError('Product could not be deleted.'); }
  }
  function confirm() {
    if (!confirmation || busy.current) return;
    if (confirmation.kind === 'productDelete') { removeProduct(); return; }
    if (confirmation.kind === 'clear') resetStep();
    if (confirmation.kind === 'batchDelete') { setDraft(d => ({ ...d, batches: d.batches.filter(b => b.id !== confirmation.batchId) })); setExpandedBatch(null); }
    if (confirmation.kind === 'discard') { disablePrevention(); setLeaving(true); pending.current = confirmation.action ?? null; }
    setConfirmation(null);
  }
  const productHeader = (p: Pick<InventoryProduct, 'name' | 'category' | 'photoUri' | 'unitPriceCentavos'>) => <View className="flex-row items-center gap-4"><ProductPhoto uri={p.photoUri} /><View className="min-w-0 flex-1 gap-1"><InvText bold size={15} color="#102342">{p.name || 'Product Name'}</InvText><InvText>{categoryLabels[p.category]} · {formatPesos(p.unitPriceCentavos)}</InvText></View></View>;
  const photoControl = <Pressable accessibilityRole="button" accessibilityLabel="Choose a product photo, optional" accessibilityState={{ disabled: picking }} disabled={picking} onPress={pickPhoto} className="min-h-[130px] items-center justify-center gap-2 rounded-control border border-[#B0C8E3] bg-white p-4">
    {draft.details.photoUri ? <ProductPhoto uri={draft.details.photoUri} /> : <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand"><InvText size={22} color="#FFFFFF">+</InvText></View>}
    <InvText bold color="#102342">{picking ? 'Opening photo picker...' : 'Choose or upload a photo'}</InvText><InvText size={10}>Max file size: 2 MB. Supported formats: JPG & PNG</InvText>
  </Pressable>;
  const detailsFields = <>
    <InvField label="Product Name *" value={draft.details.name} onChangeText={v => update('name', v)} error={errors.name} placeholder="Enter product name" returnKeyType="next" onSubmitEditing={() => costInput.current?.focus()} maxLength={120} />
    <InvSelect label="Category *" value={draft.details.category} options={categoryLabels} onChange={v => update('category', v)} error={errors.category} anchored />
    <InvText bold color="#245399">Pricing Details</InvText>
    <View className="flex-row flex-wrap gap-3"><View className="min-w-[130px] flex-1"><InvField money label="Cost / Capital Price *" inputRef={costInput} value={draft.details.cost} onChangeText={v => update('cost', v)} error={errors.cost} placeholder="₱0.00" keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => sellingInput.current?.focus()} /></View><View className="min-w-[130px] flex-1"><InvField money label="Selling Price *" inputRef={sellingInput} value={draft.details.sellingPrice} onChangeText={v => update('sellingPrice', v)} error={errors.sellingPrice} placeholder="₱0.00" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View></View>
    <View className="gap-2 rounded-control border border-[#6B9CE0] bg-[#D9E7F4] p-3"><InvText bold color="#245399">Estimated profit per item</InvText><InvText bold color="#102342">{parsePaymentAmount(draft.details.sellingPrice) !== null && parsePaymentAmount(draft.details.cost) !== null ? formatPesos(parsePaymentAmount(draft.details.sellingPrice)! - parsePaymentAmount(draft.details.cost)!) : '₱0.00'}</InvText><InvText size={10}>Calculated from selling price minus cost price.</InvText></View>
  </>;
  const batchCards = <>
    {draft.batches.map((batch, index) => <BatchCard key={batch.id} batch={batch} index={index} errors={batchValidation[batch.id]} expanded={mode !== 'edit' || expandedBatch === batch.id} onChange={updateBatch} onExpand={() => setExpandedBatch(batch.id)} onUpdate={mode === 'edit' ? () => { const validation = batchErrors(batch, baseline.batches.some(b => b.id === batch.id)); setBatchValidation(v => ({ ...v, [batch.id]: validation })); if (!Object.keys(validation).length) setExpandedBatch(null); } : undefined} onRemove={() => setConfirmation({ kind: 'batchDelete', batchId: batch.id })} />)}
    <Button compact variant="text" fullWidth={false} onPress={() => { const batch = newBatch(makeId()); setDraft(d => ({ ...d, batches: [...d.batches, batch] })); setExpandedBatch(batch.id); }}>+ Add Another Batch</Button>
    {mode === 'restock' ? <View className="min-h-12 flex-row items-center justify-between gap-3 rounded-control bg-[#E7F4E8] px-4 py-3"><InvText bold color="#286B2C">After Restock</InvText><InvText bold size={18} color="#286B2C">{total} PCS</InvText></View>
      : mode !== 'edit' && <View className="min-h-12 flex-row flex-wrap items-center justify-between gap-2 rounded-control bg-[#E7F4E8] px-4 py-3"><InvText bold color="#286B2C">Total Initial Stock</InvText><InvText bold size={18} color="#286B2C">{total} PCS</InvText></View>}
  </>;
    const footer = !readonly ? mode === 'edit' ? <View className="flex-row gap-3"><View className="min-w-0 flex-1"><Button style={{ flexGrow: 1 }} variant="secondary" disabled={saving || picking} onPress={() => navigate(() => router.canGoBack() ? router.back() : router.replace('/owner-inventory'))}>Cancel</Button></View><View className="min-w-0 flex-1"><Button style={{ flexGrow: 1 }} loading={saving} disabled={!dirty || picking} onPress={save}>Save Changes</Button></View></View>
    : <><Button loading={saving} disabled={picking || (mode === 'restock' && !dirty)} onPress={mode === 'restock' || step === 'review' ? save : advance}>{mode === 'restock' ? 'Confirm Restock' : step === 'review' ? 'Confirm & Save' : step === 'stock' ? 'Review Product' : 'Stock & Expiry'}</Button><Button variant="secondary" disabled={saving || picking || (mode === 'restock' && !dirty)} onPress={step === 'review' ? () => setStep('details') : clearStep}>{step === 'review' ? 'Edit Details' : 'Clear'}</Button></> : undefined;
  if (mode !== 'add' && preview.loading) return <InventoryFrame title={title} back hideNavigation inlineTitle background>{preview.control}<RecordSkeleton kind={readonly ? 'details' : 'form'} form={mode === 'restock' ? 'restock' : 'product'} deleting={mode === 'delete'} /></InventoryFrame>;
  // Keep the confirmation mounted after our own delete until onHidden completes
  // navigation/feedback. External deletions still show the unavailable state.
  if (mode !== 'add' && (!liveProduct || preview.empty) && !leaving) return <InventoryFrame title="Product unavailable" back hideNavigation inlineTitle background>{preview.control}<EmptyState title="Product unavailable" description="This product is no longer available. Return to Inventory to choose another product." action="Return to Inventory" onAction={() => { preview.reset(); router.replace('/owner-inventory'); }} /></InventoryFrame>;
  const restocks = store.restocks.filter(r => r.productId === product?.id).slice().reverse();
  const reviewProduct = step === 'review' ? buildDraftProduct(id, draft) : null;
  return <InventoryFrame title={title} back inlineTitle hideNavigation background subtitle="Product details for your store." illustration={mode === 'edit' ? inventoryIllustrations.editProduct : mode === 'restock' ? inventoryIllustrations.restock : mode === 'add' && step !== 'review' ? step === 'stock' ? inventoryIllustrations.expiry : inventoryIllustrations.addProduct : undefined} onBack={back} onNavigate={navigate} footer={footer} overlay={<>
    <MotionModal visible={!!confirmation && confirmation.kind !== 'restock'} onRequestClose={() => { if (!busy.current) setConfirmation(null); }} onHidden={() => { const action = pending.current; pending.current = null; action?.(); }}>
      <View className="flex-1 justify-center px-5">
        {confirmation?.kind === 'productDelete' && <Pressable accessible={false} focusable={false} tabIndex={-1} onPress={() => { if (!busy.current) setConfirmation(null); }} style={{ position: 'absolute', inset: 0 }} />}
        {confirmation && confirmation.kind !== 'restock' && <ConfirmationContent stackedActions title={confirmation.kind === 'clear' ? 'Clear All Fields?' : confirmation.kind === 'discard' ? 'Discard Changes?' : confirmation.kind === 'batchDelete' ? 'Delete Batch ' + (draft.batches.findIndex(b => b.id === confirmation.batchId) + 1) + '?' : 'Delete Product?'}
          message={confirmation.kind === 'clear' ? 'Clear the inputs in this step? Your other product details will be kept.' : confirmation.kind === 'discard' ? 'Your unsaved changes will be discarded.' : confirmation.kind === 'batchDelete' ? 'Remove this batch from the draft? Inventory changes only when you save the product.' : 'Delete ' + product?.name + ' from inventory? This cannot be undone. Historical transactions will be kept.'}
          confirmLabel={confirmation.kind === 'clear' ? 'Clear' : confirmation.kind === 'discard' ? 'Discard Changes' : confirmation.kind === 'batchDelete' ? 'Delete Batch' : 'Delete'} cancelLabel={confirmation.kind === 'discard' ? 'Keep Editing' : 'Cancel'} onCancel={() => setConfirmation(null)} onConfirm={confirm} />}
      </View>
    </MotionModal>
    <PosDialog visible={confirmation?.kind === 'restock'} title="Confirm Restock?" message="Review the stock change before confirming." confirmLabel="Confirm" cancelLabel="Cancel" actionLayout="row" busy={saving}
      onClose={() => { if (!busy.current) setConfirmation(null); }} onConfirm={save} onHidden={() => { const action = restockPending.current; restockPending.current = null; action?.(); }}>
      <View className="gap-3">
        <RestockConfirmationRow label="Product" value={product?.name ?? ''} />
        <RestockConfirmationRow label="Current stock" value={`${product ? productStock(product) : 0} PCS`} />
        <RestockConfirmationRow label="Incoming stock" value={`${total} PCS`} />
        <RestockConfirmationRow label="After restock" value={`${(product ? productStock(product) : 0) + total} PCS`} emphasize />
        <InvText size={10}>Existing batches keep their quantities and expiry dates.</InvText>
      </View>
    </PosDialog>
    <MotionModal visible={successVisible} backdropColor={quickAddColors.backdrop} onRequestClose={() => setSuccessVisible(false)} onHidden={() => { if (savedProduct) router.dismissTo('/owner-inventory'); }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <KeyboardAwareScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}>
          {savedProduct && <SuccessContent testID="inventory-product-success" title="Changes Saved" value={savedProduct.value} message={savedProduct.message} eventKey={savedProduct.eventKey} visible={successVisible} onClose={() => setSuccessVisible(false)} />}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </MotionModal>
  </>}>
    {!!error && <Text accessibilityRole="alert" className="font-poppins text-[12px] text-[#972020]">{error}</Text>}
    {readonly && product ? <>
      <ProductReview product={product} />
      {mode === 'delete' ? <><Button variant="destructiveOutline" onPress={() => setConfirmation({ kind: 'productDelete' })}>Delete Product</Button><Button variant="secondary" onPress={back}>Cancel</Button></> : <>
        <Button onPress={() => push({ pathname: '/owner-inventory/product', params: { id: product.id, mode: 'edit' } })}>Edit Product</Button><Button variant="secondary" onPress={() => push({ pathname: '/owner-inventory/product', params: { id: product.id, mode: 'restock' } })}>Restock</Button>
        <InvText bold color="#112F6F">Restock history</InvText>
        {!restocks.length ? <InvText>No restocks yet.</InvText> : restocks.map(r => <InvCard key={r.id}><InvText bold>+{r.quantity} PCS · {r.stockDate}</InvText>{r.batches ? r.batches.map(b => <InvText key={b.id}>{b.quantity} PCS | {batchExpiryLabel(b)}</InvText>) : <InvText>Expires {r.expirationDate}</InvText>}<InvText size={11}>Recorded {new Date(r.recordedAt).toLocaleString('en-PH', { timeZone: inventoryRules.timeZone })}</InvText></InvCard>)}
      </>}
    </> : mode === 'restock' && product ? <>
      {productHeader(product)}
      <ProductAddedStatus />
      <View className="min-h-20 flex-row items-stretch rounded-control border border-[#6B9CE0] bg-[#D9E7F4] px-4 py-3">
        <View className="min-w-0 flex-1 justify-center gap-2"><InvText size={11}>Available</InvText><InvText bold size={20} color="#245399">{productStock(product)} PCS</InvText></View>
        <View className="mx-3 w-px self-stretch bg-[#8CAED5]" />
        <View className="min-w-0 flex-1 justify-center gap-2"><InvText size={11}>Earliest Expiry</InvText><InvText bold color="#245399">{earliestExpiry(product) ? batchExpiryLabel({ noExpiry: false, expirationDate: earliestExpiry(product) }) : 'No expiry date'}</InvText></View>
      </View>
      <InvText bold color="#245399">Stock Batches ({productBatches(product).length})</InvText>{productBatches(product).map((batch, index) => <ExistingBatchCard key={batch.id} batch={batch} index={index} />)}
      <InvText bold color="#245399">Restock Product</InvText>{batchCards}
      <InvText size={10}>Existing batch dates stay unchanged.</InvText>
    </> : mode === 'add' && step === 'review' && reviewProduct ? <><ProductReview product={reviewProduct} /><View className="gap-1"><View className="flex-row items-center gap-2"><View accessible={false} className="h-4 w-4 items-center justify-center rounded-pill border border-[#245399] bg-[#D9E7F4]"><Text className="font-poppins-bold text-[9px] leading-[12px] text-brand">i</Text></View><InvText bold color="#245399">Before saving</InvText></View><InvText size={11}>Review product details, prices, and batch information.</InvText></View></>
    : mode === 'add' && step === 'stock' ? <>{productHeader({ name: draft.details.name, category: draft.details.category as InventoryProduct['category'], unitPriceCentavos: parsePaymentAmount(draft.details.sellingPrice) ?? 0, photoUri: draft.details.photoUri })}{batchCards}</>
    : <>
      {mode === 'edit' && <View className="items-center gap-2 pb-2"><View className="relative"><ProductPhoto uri={draft.details.photoUri} /><Pressable accessibilityRole="button" accessibilityLabel="Edit product photo" accessibilityState={{ disabled: picking }} disabled={picking} onPress={pickPhoto} className="absolute bottom-0 right-0 min-h-12 min-w-12 items-center justify-center rounded-pill border border-[#B0C8E3] bg-white"><ExpoImage source={require('@/assets/images/inventory/edit.svg')} contentFit="contain" style={{ width: 18, height: 18 }} /></Pressable></View>{!!draft.details.photoUri && <Button compact fullWidth={false} variant="text" onPress={() => update('photoUri', undefined)}>Remove photo</Button>}</View>}
      {detailsFields}
      {mode === 'add' ? <><InvText bold color="#245399">Product Photo</InvText>{photoControl}{!!draft.details.photoUri && <Button variant="text" onPress={() => update('photoUri', undefined)}>Remove photo</Button>}</>
      : <><View className="flex-row items-center justify-between gap-2"><InvText bold color="#245399">Stock Batches</InvText>{mode === 'edit' && <InvText bold color="#102342">{total} PCS</InvText>}</View>{batchCards}<View className="mt-8 gap-2 border-t border-[#B0C8E3] pt-4"><InvText size={10}>This action cannot be undone.</InvText><Button variant="destructiveOutline" disabled={saving || picking} onPress={() => setConfirmation({ kind: 'productDelete' })}>Delete Product</Button></View></>}
    </>}
    {mode !== 'add' && preview.control}
  </InventoryFrame>;
}
function ProductPhoto({ uri, size = 128 }: { uri?: string; size?: number }) {
  return <View className="overflow-hidden rounded-control bg-[#D9E7F4]" style={{ width: size, height: size }}>{uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>;
}
function ProductAddedStatus() {
  return <View testID="product-added-status" accessible accessibilityLabel="Product Added" accessibilityLiveRegion="polite" className="min-h-10 flex-row items-center gap-2 rounded-control border border-[#78A77C] bg-[#E7F4E8] px-3 py-2">
    <PosIcon name="checkCircle" size={22} color="#286B2C" /><InvText bold color="#286B2C">Product Added</InvText>
  </View>;
}
function RestockConfirmationRow({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return <View className={`flex-row items-start justify-between gap-3 ${emphasize ? '' : 'border-b border-[#ADC9EE] pb-2'}`}>
    <InvText bold={emphasize} color={emphasize ? '#245399' : undefined} size={11}>{label}</InvText><View className="min-w-0 flex-1"><Text className={`text-right text-[12px] ${emphasize ? 'font-poppins-bold text-brand' : 'font-poppins text-text-secondary'}`}>{value}</Text></View>
  </View>;
}
function ProductReview({ product }: { product: InventoryProduct }) {
  const status = stockCategory(productStock(product));
  const expiry = productExpiry(product, todayInManila());
  return <>
    <View className="items-center gap-2 py-2"><ProductPhoto uri={product.photoUri} size={88} /><Text className="text-center font-poppins-bold text-[18px] text-brand">{product.name}</Text><InvText>{categoryLabels[product.category]}</InvText></View>
    <InvText bold color="#245399">Product Information</InvText><InvCard><ReviewRow label="Product Name" value={product.name} /><ReviewRow label="Category" value={categoryLabels[product.category]} /></InvCard>
    <InvText bold color="#245399">Pricing Details</InvText><InvCard><ReviewRow label="Cost / Capital Price" value={formatPesos(product.costCentavos)} /><ReviewRow label="Selling Price" value={formatPesos(product.unitPriceCentavos)} /><View className="border-t border-[#B0C8E3] pt-3"><ReviewRow label="Estimated profit per item" value={formatPesos(product.unitPriceCentavos - product.costCentavos)} /></View></InvCard>
    <InvText bold color="#245399">Initial Stock & Batches</InvText><InvCard><ReviewRow label="Total Stock" value={productStock(product) + ' PCS'} /><ReviewRow label="Stock status" value={status === 'good' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Out of Stock'} /></InvCard>
    {expiry.expired && <InvText bold color="#972020">This product has expired stock.</InvText>}
    {expiry.nearExpiry && <InvText bold color="#805000">This product has stock nearing expiry.</InvText>}
    {productBatches(product).map((batch, index) => <View key={batch.id} className="w-full overflow-hidden rounded-control border border-[#B0C8E3] bg-white"><View className="min-h-9 justify-center bg-brand px-3 py-2"><InvText bold color="#FFFFFF">Batch {index + 1}</InvText></View><View className="min-h-20 justify-center gap-1 p-3"><InvText bold>{batch.quantity} PCS</InvText><InvText>{batch.noExpiry ? 'No expiry date' : 'Expires ' + batchExpiryLabel(batch)}</InvText></View></View>)}
  </>;
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  return <View className="flex-row flex-wrap items-start justify-between gap-3 py-1"><View className="min-w-[100px] flex-1"><InvText size={11}>{label}</InvText></View><View className="min-w-[100px] flex-1"><Text className="text-right font-poppins-bold text-[11px] text-[#102342]">{value}</Text></View></View>;
}
