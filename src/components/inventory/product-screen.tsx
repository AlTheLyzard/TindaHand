import type { TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { usePushOnce } from '@/hooks/use-push-once';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Keyboard, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { MotionModal } from '@/components/ui/motion-modal';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { InvCard, InvDateField, InvField, InventoryFrame, InvText, InvSelect } from './inventory-ui';
import { BatchCard, ExistingBatchCard, batchExpiryLabel } from './batch-card';
import { useInventory } from '@/state/inventory';
import type { BatchDraft, BatchErrors, InventoryProduct, ProductDraft } from '@/types/inventory';
import { categoryLabels, earliestExpiry, productBatches, productExpiry, productStock, stockCategory, todayInManila, validDate } from '@/utils/inventory';
import { batchErrors, buildDraftProduct, clearInventoryStep, createInventoryDraft, detailsErrors, draftQuantity, newBatch, toStockBatches } from '@/utils/inventory-draft';
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
  const busy = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  const [id] = useState(makeId);
  const [restockId] = useState(makeId);
  const today = todayInManila();
  const readonly = mode === 'details' || mode === 'delete';
  const dirty = !readonly && JSON.stringify(draft) !== JSON.stringify(initial);
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
    if (mode === 'restock' && (!validDate(draft.details.stockDate) || draft.details.stockDate > today)) {
      setErrors({ stockDate: 'Enter a valid stock date no later than today.' }); return false;
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
        quantity: total, stockDate: draft.details.stockDate, expirationDate: '', batches: toStockBatches(draft.batches), recordedAt: new Date().toISOString() } });
    } else saved = dispatch({ type: 'saveProduct', product: buildDraftProduct(product?.id ?? id, draft) });
    if (!saved) { busy.current = false; setSaving(false); setConfirmation(null); setError('Changes could not be saved. Check total stock and values, then try again.'); return; }
    finish(mode === 'restock' ? 'Added ' + total + ' units to ' + product!.name + '.' : draft.details.name.trim() + (mode === 'edit' ? ' updated successfully.' : ' added successfully.'));
  }
  function removeProduct() {
    if (busy.current || !product) return;
    busy.current = true; setSaving(true);
    if (dispatch({ type: 'deleteProduct', id: product.id })) finish(product.name + ' deleted.');
    else { busy.current = false; setSaving(false); setConfirmation(null); setError('Product could not be deleted.'); }
  }
  function confirm() {
    if (!confirmation || busy.current) return;
    if (confirmation.kind === 'restock') { save(); return; }
    if (confirmation.kind === 'productDelete') { removeProduct(); return; }
    if (confirmation.kind === 'clear') resetStep();
    if (confirmation.kind === 'batchDelete') { setDraft(d => ({ ...d, batches: d.batches.filter(b => b.id !== confirmation.batchId) })); setExpandedBatch(null); }
    if (confirmation.kind === 'discard') { disablePrevention(); setLeaving(true); pending.current = confirmation.action ?? null; }
    setConfirmation(null);
  }
  const productHeader = (p: Pick<InventoryProduct, 'name' | 'category' | 'photoUri' | 'unitPriceCentavos'>) => <View className="flex-row items-center gap-4"><ProductPhoto uri={p.photoUri} /><View className="min-w-0 flex-1 gap-1"><InvText bold size={15} color="#102342">{p.name || 'Product Name'}</InvText><InvText>{categoryLabels[p.category]} · {formatPesos(p.unitPriceCentavos)}</InvText></View></View>;
  const photoControl = <Pressable accessibilityRole="button" accessibilityLabel="Choose a product photo, optional" accessibilityState={{ disabled: picking }} disabled={picking} onPress={pickPhoto} className="min-h-[130px] items-center justify-center gap-2 rounded-control border border-[#B0C8E3] bg-white p-4">
    {draft.details.photoUri ? <ProductPhoto uri={draft.details.photoUri} /> : <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand"><InvText size={22} color="#FFFFFF">+</InvText></View>}
    <InvText bold color="#102342">{picking ? 'Opening photo picker...' : 'Choose or upload a photo (Optional)'}</InvText><InvText size={10}>Max file size: 2 MB. Supported formats: JPG & PNG</InvText>
  </Pressable>;
  const detailsFields = <>
    <InvText bold color="#245399">Product Information</InvText>
    <InvField label="Product Name *" value={draft.details.name} onChangeText={v => update('name', v)} error={errors.name} placeholder="Enter product name" returnKeyType="next" onSubmitEditing={() => costInput.current?.focus()} maxLength={120} />
    <InvSelect label="Category *" value={draft.details.category} options={categoryLabels} onChange={v => update('category', v)} error={errors.category} />
    <InvText bold color="#245399">Pricing Details</InvText>
    <View className="flex-row flex-wrap gap-3"><View className="min-w-[130px] flex-1"><InvField label="Cost / Capital Price *" inputRef={costInput} value={draft.details.cost} onChangeText={v => update('cost', v)} error={errors.cost} placeholder="₱0.00" keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => sellingInput.current?.focus()} /></View><View className="min-w-[130px] flex-1"><InvField label="Selling Price *" inputRef={sellingInput} value={draft.details.sellingPrice} onChangeText={v => update('sellingPrice', v)} error={errors.sellingPrice} placeholder="₱0.00" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View></View>
    <View className="gap-2 rounded-control border border-[#6B9CE0] bg-[#D9E7F4] p-3"><InvText bold color="#245399">Estimated profit per item</InvText><InvText bold color="#102342">{parsePaymentAmount(draft.details.sellingPrice) !== null && parsePaymentAmount(draft.details.cost) !== null ? formatPesos(parsePaymentAmount(draft.details.sellingPrice)! - parsePaymentAmount(draft.details.cost)!) : '₱0.00'}</InvText><InvText size={10}>Calculated from selling price minus cost price.</InvText></View>
  </>;
  const batchCards = <>
    {draft.batches.map((batch, index) => <BatchCard key={batch.id} batch={batch} index={index} errors={batchValidation[batch.id]} expanded={mode !== 'edit' || expandedBatch === batch.id} onChange={updateBatch} onExpand={() => setExpandedBatch(batch.id)} onUpdate={mode === 'edit' ? () => { const validation = batchErrors(batch, baseline.batches.some(b => b.id === batch.id)); setBatchValidation(v => ({ ...v, [batch.id]: validation })); if (!Object.keys(validation).length) setExpandedBatch(null); } : undefined} onRemove={() => setConfirmation({ kind: 'batchDelete', batchId: batch.id })} />)}
    <Button compact variant="text" fullWidth={false} onPress={() => { const batch = newBatch(makeId()); setDraft(d => ({ ...d, batches: [...d.batches, batch] })); setExpandedBatch(batch.id); }}>+ Add Another Batch</Button>
    <View className="flex-row flex-wrap justify-between gap-2 rounded-control bg-[#D9E7F4] p-3"><InvText bold>{mode === 'restock' ? 'Quantity to add' : mode === 'edit' ? 'Total Stock' : 'Total Initial Stock'}</InvText><InvText bold>{total} PCS</InvText></View>
  </>;
  const footer = !readonly ? mode === 'edit' ? <View className="flex-row gap-3"><View className="flex-1"><Button variant="secondary" disabled={saving || picking} onPress={() => navigate(() => router.canGoBack() ? router.back() : router.replace('/owner-inventory'))}>Cancel</Button></View><View className="flex-1"><Button loading={saving} disabled={picking} onPress={save}>Save Changes</Button></View></View>
    : <><Button loading={saving} disabled={picking} onPress={mode === 'restock' || step === 'review' ? save : advance}>{mode === 'restock' ? 'Confirm Restock' : step === 'review' ? 'Confirm & Save' : step === 'stock' ? 'Review Product' : 'Stock & Expiry'}</Button><Button variant="secondary" disabled={saving || picking} onPress={step === 'review' ? () => setStep('details') : clearStep}>{step === 'review' ? 'Edit Details' : 'Clear'}</Button></> : undefined;
  if (mode !== 'add' && preview.loading) return <InventoryFrame title={title} back hideNavigation inlineTitle background>{preview.control}<RecordSkeleton kind={readonly ? 'details' : 'form'} form={mode === 'restock' ? 'restock' : 'product'} deleting={mode === 'delete'} /></InventoryFrame>;
  // Keep the confirmation mounted after our own delete until onHidden completes
  // navigation/feedback. External deletions still show the unavailable state.
  if (mode !== 'add' && (!liveProduct || preview.empty) && !leaving) return <InventoryFrame title="Product unavailable" back hideNavigation inlineTitle background>{preview.control}<EmptyState title="Product unavailable" description="This product is no longer available. Return to Inventory to choose another product." action="Return to Inventory" onAction={() => { preview.reset(); router.replace('/owner-inventory'); }} /></InventoryFrame>;
  const restocks = store.restocks.filter(r => r.productId === product?.id).slice().reverse();
  const reviewProduct = step === 'review' ? buildDraftProduct(id, draft) : null;
  return <InventoryFrame title={title} back inlineTitle hideNavigation background onBack={back} onNavigate={navigate} footer={footer} overlay={<MotionModal visible={!!confirmation} onRequestClose={() => { if (!busy.current) setConfirmation(null); }} onHidden={() => { const action = pending.current; pending.current = null; action?.(); }}>
    <View className="flex-1 justify-center px-5">
      {confirmation?.kind === 'restock' ? <View accessibilityViewIsModal className="w-full max-w-[412px] gap-4 self-center rounded-control bg-white p-5"><InvText bold size={18} color="#112F6F">Confirm Restock?</InvText><InvText>Add {total} PCS to {product?.name}?</InvText><InvText>Resulting total: {(product ? productStock(product) : 0) + total} PCS</InvText><InvText size={11}>Existing batches keep their quantities and expiry dates.</InvText><Button loading={saving} onPress={save}>Confirm</Button><Button variant="secondary" disabled={saving} onPress={() => setConfirmation(null)}>Cancel</Button></View>
      : confirmation && <ConfirmationContent stackedActions title={confirmation.kind === 'clear' ? 'Clear All Fields?' : confirmation.kind === 'discard' ? 'Discard Changes?' : confirmation.kind === 'batchDelete' ? 'Delete Batch ' + (draft.batches.findIndex(b => b.id === confirmation.batchId) + 1) + '?' : 'Delete Product?'}
        message={confirmation.kind === 'clear' ? 'Clear the inputs in this step? Your other product details will be kept.' : confirmation.kind === 'discard' ? 'Your unsaved changes will be discarded.' : confirmation.kind === 'batchDelete' ? 'Remove this batch from the draft? Inventory changes only when you save the product.' : 'Delete ' + product?.name + ' from inventory? This cannot be undone. Historical transactions will be kept.'}
        confirmLabel={confirmation.kind === 'clear' ? 'Clear' : confirmation.kind === 'discard' ? 'Discard Changes' : confirmation.kind === 'batchDelete' ? 'Delete Batch' : 'Delete'} cancelLabel="Cancel" onCancel={() => setConfirmation(null)} onConfirm={confirm} />}
    </View>
  </MotionModal>}>
    <InvText>Product details for your store.</InvText>
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
      <View className="flex-row flex-wrap gap-4 rounded-control border border-[#6B9CE0] bg-[#D9E7F4] p-4"><View className="flex-1 gap-2"><InvText size={11}>Available</InvText><InvText bold size={20} color="#245399">{productStock(product)} PCS</InvText></View><View className="min-w-[120px] flex-1 gap-2"><InvText size={11}>Earliest Expiry</InvText><InvText bold color="#245399">{earliestExpiry(product) ? batchExpiryLabel({ noExpiry: false, expirationDate: earliestExpiry(product) }) : 'No expiry date'}</InvText></View></View>
      <InvText bold color="#245399">Stock Batches ({productBatches(product).length})</InvText>{productBatches(product).map((batch, index) => <ExistingBatchCard key={batch.id} batch={batch} index={index} />)}
      <InvText bold color="#245399">Restock Product</InvText>{batchCards}
      <InvDateField compact label="Stock date" value={draft.details.stockDate} onChange={v => update('stockDate', v)} error={errors.stockDate} />
      <InvText size={10}>Existing batch dates stay unchanged.</InvText>
    </> : mode === 'add' && step === 'review' && reviewProduct ? <><ProductReview product={reviewProduct} /><InvCard><InvText bold color="#245399">Before saving</InvText><InvText size={11}>Review product details, prices, and batch information.</InvText></InvCard></>
    : mode === 'add' && step === 'stock' ? <>{productHeader({ name: draft.details.name, category: draft.details.category as InventoryProduct['category'], unitPriceCentavos: parsePaymentAmount(draft.details.sellingPrice) ?? 0, photoUri: draft.details.photoUri })}{batchCards}</>
    : <>
      {mode === 'edit' && <View className="items-center gap-2"><Pressable accessibilityRole="button" accessibilityLabel="Edit product photo" disabled={picking} onPress={pickPhoto}><ProductPhoto uri={draft.details.photoUri} /><View className="absolute bottom-1 right-1 rounded bg-white px-1"><InvText bold color="#245399">Edit</InvText></View></Pressable>{!!draft.details.photoUri && <Button compact fullWidth={false} variant="text" onPress={() => update('photoUri', undefined)}>Remove photo</Button>}</View>}
      {detailsFields}
      {mode === 'add' ? <><InvText bold color="#245399">Product Photo</InvText>{photoControl}{!!draft.details.photoUri && <Button variant="text" onPress={() => update('photoUri', undefined)}>Remove photo</Button>}</>
      : <><InvText bold color="#245399">Stock Batches</InvText>{batchCards}<View className="mt-8 gap-2 border-t border-[#B0C8E3] pt-4"><InvText size={10}>This action cannot be undone.</InvText><Button variant="destructiveOutline" disabled={saving || picking} onPress={() => setConfirmation({ kind: 'productDelete' })}>Delete Product</Button></View></>}
    </>}
    {mode !== 'add' && preview.control}
  </InventoryFrame>;
}
function ProductPhoto({ uri }: { uri?: string }) {
  return <View className="h-24 w-24 overflow-hidden rounded-control bg-[#D9E7F4]">{uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>;
}
function ProductReview({ product }: { product: InventoryProduct }) {
  const status = stockCategory(productStock(product));
  const expiry = productExpiry(product, todayInManila());
  return <>
    <View className="items-center gap-2"><ProductPhoto uri={product.photoUri} /><InvText bold size={18} color="#112F6F">{product.name}</InvText><InvText>{categoryLabels[product.category]}</InvText></View>
    <InvText bold color="#245399">Product Information</InvText><InvCard><ReviewRow label="Product Name" value={product.name} /><ReviewRow label="Category" value={categoryLabels[product.category]} /></InvCard>
    <InvText bold color="#245399">Pricing Details</InvText><InvCard><ReviewRow label="Cost / Capital Price" value={formatPesos(product.costCentavos)} /><ReviewRow label="Selling Price" value={formatPesos(product.unitPriceCentavos)} /><ReviewRow label="Estimated profit per item" value={formatPesos(product.unitPriceCentavos - product.costCentavos)} /></InvCard>
    <InvText bold color="#245399">Initial Stock & Batches</InvText><InvCard><ReviewRow label="Total Stock" value={productStock(product) + ' PCS'} /><ReviewRow label="Stock status" value={status === 'good' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Out of Stock'} /></InvCard>
    {expiry.expired && <InvText bold color="#972020">This product has expired stock.</InvText>}
    {expiry.nearExpiry && <InvText bold color="#805000">This product has stock nearing expiry.</InvText>}
    {productBatches(product).map((batch, index) => <View key={batch.id} className="overflow-hidden rounded-control border border-[#B0C8E3] bg-white"><View className="bg-brand px-3 py-2"><InvText bold color="#FFFFFF">Batch {index + 1}</InvText></View><View className="p-3"><InvText>{batch.quantity} PCS | {batch.noExpiry ? 'No expiry date' : 'Expires ' + batchExpiryLabel(batch)}</InvText></View></View>)}
  </>;
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  return <View className="flex-row flex-wrap justify-between gap-2"><View className="min-w-[110px] flex-1"><InvText size={11}>{label}</InvText></View><View className="min-w-[100px] flex-1 items-end"><InvText bold size={11} color="#102342">{value}</InvText></View></View>;
}
