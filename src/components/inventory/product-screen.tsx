import tokens from '@/constants/design-tokens.json';
import type { TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { usePushOnce } from '@/hooks/use-push-once';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Keyboard, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import { MotionModal } from '@/components/ui/motion-modal';
import { ConfirmationContent } from '@/components/ui/confirmation-content';
import { InvCard, InvDateField, InvField, InventoryFrame, InvText, InvSelect, inventoryIllustrations } from './inventory-ui';
import { BatchCard, ExistingBatchCard, batchExpiryLabel } from './batch-card';
import { useInventory } from '@/state/inventory';
import { suppressAuthLock, releaseAuthLock, useAuthFlow } from '@/state/auth-flow';
import { createProduct, updateProduct, deleteProduct as deleteProductApi, deleteBatch as deleteBatchApi, addRestock as addRestockApi } from '@/services/inventory';
import type { BatchDraft, BatchErrors, InventoryProduct, ProductDraft } from '@/types/inventory';
import { categoryLabels, earliestExpiry, productBatches, productExpiry, productStock, stockCategory, todayInManila, validDate } from '@/utils/inventory';
import { batchErrors, buildDraftProduct, clearInventoryStep, createInventoryDraft, detailsErrors, draftQuantity, newBatch, toStockBatches } from '@/utils/inventory-draft';
import { inventoryRules } from '@/constants/inventory-rules';
import { formatPesos } from '@/utils/dashboard';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { hasCapability } from '@/utils/operator-access';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

type Step = 'details' | 'stock' | 'review';
type Confirmation = { kind: 'clear' | 'discard' | 'batchDelete' | 'productDelete' | 'restock'; batchId?: string; action?: () => void };
const makeId = () => 'inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);

export function ProductScreen() {
  const push = usePushOnce();
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { store, getStore, dispatch, setFeedback } = useInventory();
  const { owner, deviceSession } = useAuthFlow();
  const operatorSession = deviceSession?.role === 'operator' ? deviceSession : null;
  const canEditProduct = !!owner || hasCapability(operatorSession, 'inventory-edit');
  const canRestockProduct = !!owner || hasCapability(operatorSession, 'restock');
  // Route roots differ by role — always derive from `owner` so Kahera never
  // lands on an owner-only route that guards her back to choose-account.
  const inventoryRoot = owner ? '/owner-inventory' : '/operator-inventory';
  const productRoot = (owner ? '/owner-inventory/product' : '/operator-inventory/product') as `/owner-inventory/product` | `/operator-inventory/product`;
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
  const [restockCost, setRestockCost] = useState(() =>
    // Pre-fill with the product's unit cost × 0 so the field starts blank but ready
    product ? (product.costCentavos / 100).toFixed(2) : ''
  );
  const today = todayInManila();
  const readonly = mode === 'details' || mode === 'delete';
  const dirty = !readonly && JSON.stringify(draft) !== JSON.stringify(initial);
  const title = mode === 'add' ? step === 'review' ? 'Review Details' : step === 'stock' ? 'Add Expiry Date' : 'Add Product' : mode === 'edit' ? 'Edit Product' : mode === 'restock' ? 'Restock Product' : mode === 'delete' ? 'Delete Product' : 'Product Details';
  const subtitle = mode === 'add' && step === 'review' ? 'Please review the details before saving.' : 'Product details for your store.';
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
    navigate(() => router.canGoBack() ? router.back() : router.replace(inventoryRoot));
  }
  function finish(message: string) {
    disablePrevention(); setLeaving(true);
    const action = () => { setFeedback(message); router.dismissTo(inventoryRoot); };
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
    // The system photo picker sends the app to the background temporarily.
    // Suppress auto-lock so the session stays alive while the picker is open.
    suppressAuthLock();
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
    finally { releaseAuthLock(); setPicking(false); }
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
  async function save() {
    if (busy.current || picking || leaving) return;
    Keyboard.dismiss();
    if (mode !== 'restock' && !validateDetails()) { if (mode === 'add') setStep('details'); return; }
    if (!validateBatches()) { if (mode === 'add') setStep('stock'); return; }
    if (mode === 'restock' && confirmation?.kind !== 'restock') { setConfirmation({ kind: 'restock' }); return; }
    const currentProduct = getStore().products.find(p => p.id === product?.id);
    if (mode === 'edit' && JSON.stringify(currentProduct) !== baselineProduct) { setError('This product changed while you were editing. Cancel and reopen it to use the latest stock.'); return; }
    busy.current = true; setSaving(true);

    // ── Restock ──────────────────────────────────────────────────────────────
    if (mode === 'restock' && product) {
      // If the product has a real API id (starts with "prod-"), call the backend.
      if (product.id.startsWith('prod-')) {
        try {
          const expiryBatch = draft.batches.find(b => !b.noExpiry && b.expirationDate);
          const parsedCost = parsePaymentAmount(restockCost);
          await addRestockApi(product.id, {
            quantity: total,
            stockDate: draft.details.stockDate || today,
            expirationDate: expiryBatch?.expirationDate ?? 'noExpiry',
            costCentavos: parsedCost != null && parsedCost > 0 ? parsedCost : null,
          });
        } catch {
          // Offline or server error — fall through and dispatch locally anyway.
        }
      }
      const parsedCostLocal = parsePaymentAmount(restockCost);
      const saved = dispatch({ type: 'restock', record: { id: restockId, productId: product.id, itemName: product.name,
        quantity: total, costCentavos: parsedCostLocal != null && parsedCostLocal > 0 ? parsedCostLocal : null,
        stockDate: draft.details.stockDate, expirationDate: '', batches: toStockBatches(draft.batches), recordedAt: new Date().toISOString() } });
      if (!saved) { busy.current = false; setSaving(false); setConfirmation(null); setError('Changes could not be saved. Check total stock and values, then try again.'); return; }
      finish('Added ' + total + ' units to ' + product!.name + '.');
      return;
    }

    // ── Add or Edit product ───────────────────────────────────────────────────
    const builtProduct = buildDraftProduct(product?.id ?? id, draft);
    if (mode === 'add') {
      try {
        // Map the draft batches to the shape the backend expects.
        const apiBatches = (builtProduct.batches ?? []).map(b => ({
          id: b.id,
          quantity: b.quantity,
          noExpiry: b.noExpiry,
          expirationDate: b.noExpiry ? undefined : b.expirationDate ?? undefined,
        }));
        const created = await createProduct({
          name: builtProduct.name,
          category: builtProduct.category,
          unitPriceCentavos: builtProduct.unitPriceCentavos,
          costCentavos: builtProduct.costCentavos,
          photoUri: builtProduct.photoUri,
          batches: apiBatches.length > 0 ? apiBatches : undefined,
        });
        // Use the real API id so future checkout/restock calls reference the right record.
        builtProduct.id = String(created.id);
      } catch {
        // Offline — the product will be saved locally with its temporary id.
        // On the next session start, getProducts() will replace mock/local products
        // with the real server list, so this draft will be lost until reconnected.
      }
    } else if (mode === 'edit' && product) {
      if (product.id.startsWith('prod-')) {
        // updateProduct requires owner role — Kahera (operator) skips this call.
        if (owner) {
          try {
            await updateProduct(product.id, {
              name: builtProduct.name,
              category: builtProduct.category,
              unitPriceCentavos: builtProduct.unitPriceCentavos,
              costCentavos: builtProduct.costCentavos,
              photoUri: builtProduct.photoUri,
            });
          } catch {
            // Offline — keep the local edit.
          }
        }
        // Delete any batches that were removed during this edit.
        // Compare the original product's batches against the saved draft's batches
        // and call the backend for each one that was removed.
        const originalBatchIds = new Set(productBatches(product).map(b => b.id));
        const remainingBatchIds = new Set((builtProduct.batches ?? []).map(b => b.id));
        const deletedBatchIds = [...originalBatchIds].filter(id => !remainingBatchIds.has(id));
        await Promise.allSettled(
          deletedBatchIds.map(batchId => deleteBatchApi(product.id, batchId))
        );
      }
    }
    const saved = dispatch({ type: 'saveProduct', product: builtProduct });
    if (!saved) { busy.current = false; setSaving(false); setConfirmation(null); setError('Changes could not be saved. Check total stock and values, then try again.'); return; }
    finish(draft.details.name.trim() + (mode === 'edit' ? ' updated successfully.' : ' added successfully.'));
  }
  async function removeProduct() {
    if (busy.current || !product) return;
    busy.current = true; setSaving(true);
    if (product.id.startsWith('prod-')) {
      try {
        await deleteProductApi(product.id);
      } catch {
        // Offline — allow local delete anyway so the owner's view stays clean.
      }
    }
    if (dispatch({ type: 'deleteProduct', id: product.id })) finish(product.name + ' deleted.');
    else { busy.current = false; setSaving(false); setConfirmation(null); setError('Product could not be deleted.'); }
  }
  function confirm() {
    if (!confirmation || busy.current) return;
    if (confirmation.kind === 'restock') { save(); return; }
    if (confirmation.kind === 'productDelete') { removeProduct(); return; }
    if (confirmation.kind === 'clear') resetStep();
    if (confirmation.kind === 'batchDelete') setDraft(d => ({ ...d, batches: d.batches.filter(b => b.id !== confirmation.batchId) }));
    if (confirmation.kind === 'discard') { disablePrevention(); setLeaving(true); pending.current = confirmation.action ?? null; }
    setConfirmation(null);
  }
  const productHeader = (p: Pick<InventoryProduct, 'name' | 'category' | 'photoUri' | 'unitPriceCentavos'>) => <View className="flex-row items-center gap-4"><ProductPhoto uri={p.photoUri} size={96} /><View className="min-w-0 flex-1 gap-1"><InvText bold size={15} color={tokens.color.textPrimary}>{p.name || 'Product Name'}</InvText><InvText>{categoryLabels[p.category]} · {formatPesos(p.unitPriceCentavos)}</InvText></View></View>;
  const photoControl = <Pressable accessibilityRole="button" accessibilityLabel="Choose a product photo, optional" accessibilityState={{ disabled: picking }} disabled={picking} onPress={pickPhoto} className="min-h-[150px] items-center justify-center gap-2 rounded-control border border-outline bg-white p-4">
    {draft.details.photoUri ? <ProductPhoto uri={draft.details.photoUri} size={72} /> : <View className="h-9 w-9 items-center justify-center rounded-pill bg-brand"><InvText size={22} color={tokens.color.surfaceCard}>+</InvText></View>}
    <InvText bold color={tokens.color.textPrimary}>{picking ? 'Opening photo picker...' : 'Choose or upload a photo'}</InvText><InvText size={10}>Max file size: 2 MB. Supported formats: JPG & PNG</InvText>
  </Pressable>;
  const detailsFields = <>
    <InvField label="Product Name *" value={draft.details.name} onChangeText={v => update('name', v)} error={errors.name} placeholder="Enter product name" returnKeyType="next" onSubmitEditing={() => costInput.current?.focus()} maxLength={120} />
    <InvSelect label="Category *" value={draft.details.category} options={categoryLabels} onChange={v => update('category', v)} error={errors.category} />
    <InvText bold size={11} color={tokens.color.textSecondary}>PRICING DETAILS</InvText>
    <View className="flex-row flex-wrap gap-3"><View className="min-w-[130px] flex-1"><InvField money label="Cost / Capital Price *" inputRef={costInput} value={draft.details.cost} onChangeText={v => update('cost', v)} error={errors.cost} placeholder="0.00" keyboardType="decimal-pad" returnKeyType="next" onSubmitEditing={() => sellingInput.current?.focus()} /></View><View className="min-w-[130px] flex-1"><InvField money label="Selling Price *" inputRef={sellingInput} value={draft.details.sellingPrice} onChangeText={v => update('sellingPrice', v)} error={errors.sellingPrice} placeholder="0.00" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} /></View></View>
    <View className="flex-row flex-wrap items-center justify-between gap-3 rounded-control border border-accent bg-ice-container p-3"><InvText bold color={tokens.color.royalBlue}>Estimated profit per item</InvText><InvText bold color={tokens.color.textPrimary}>{parsePaymentAmount(draft.details.sellingPrice) !== null && parsePaymentAmount(draft.details.cost) !== null ? formatPesos(parsePaymentAmount(draft.details.sellingPrice)! - parsePaymentAmount(draft.details.cost)!) : '₱0.00'}</InvText></View>
  </>;
  const batchCards = <>
    {draft.batches.map((batch, index) => <BatchCard key={batch.id} batch={batch} index={index} errors={batchValidation[batch.id]} expanded onChange={updateBatch} onRemove={() => setConfirmation({ kind: 'batchDelete', batchId: batch.id })} />)}
    <Button compact variant="text" fullWidth={false} onPress={() => { const batch = newBatch(makeId()); setDraft(d => ({ ...d, batches: [...d.batches, batch] })); }}>+ Add Another Batch</Button>
    <View className="flex-row flex-wrap justify-between gap-2 rounded-control border border-accent bg-ice-container p-3"><InvText bold color={tokens.color.royalBlue}>{mode === 'restock' ? 'Quantity to add' : mode === 'edit' ? 'Total Stock' : 'Total Initial Stock'}</InvText><InvText bold color={tokens.color.textPrimary}>{total} PCS</InvText></View>
  </>;
  const actions = !readonly ? mode === 'edit' ? <View className="gap-3"><Button loading={saving} disabled={picking} onPress={save}>Save Changes</Button><Button variant="secondary" disabled={saving || picking} onPress={() => navigate(() => router.canGoBack() ? router.back() : router.replace(inventoryRoot))}>Cancel</Button></View>
    : <><Button loading={saving} disabled={picking} onPress={mode === 'restock' || step === 'review' ? save : advance}>{mode === 'restock' ? 'Confirm Restock' : step === 'review' ? 'Confirm & Save' : step === 'stock' ? 'Review Product' : 'Add Expiration'}</Button><Button variant="secondary" disabled={saving || picking} onPress={step === 'review' ? () => setStep('details') : clearStep}>{step === 'review' ? 'Edit Details' : 'Clear'}</Button></> : undefined;
  if (mode !== 'add' && preview.loading) return <InventoryFrame title={title} back hideNavigation inlineTitle background>{preview.control}<RecordSkeleton kind={readonly ? 'details' : 'form'} form={mode === 'restock' ? 'restock' : 'product'} deleting={mode === 'delete'} /></InventoryFrame>;
  // Keep the confirmation mounted after our own delete until onHidden completes
  // navigation/feedback. External deletions still show the unavailable state.
  if (mode !== 'add' && (!liveProduct || preview.empty) && !leaving) return <InventoryFrame title="Product unavailable" back hideNavigation inlineTitle background>{preview.control}<EmptyState title="Product unavailable" description="This product is no longer available. Return to Inventory to choose another product." action="Return to Inventory" onAction={() => { preview.reset(); router.replace(inventoryRoot); }} /></InventoryFrame>;
  const restocks = store.restocks.filter(r => r.productId === product?.id).slice().reverse();
  const reviewProduct = step === 'review' ? buildDraftProduct(id, draft) : null;
  return <InventoryFrame title={title} back inlineTitle hideNavigation background subtitle={subtitle} illustration={mode === 'edit' ? inventoryIllustrations.editProduct : mode === 'restock' ? inventoryIllustrations.restock : mode === 'add' && step !== 'review' ? step === 'stock' ? inventoryIllustrations.expiry : inventoryIllustrations.addProduct : undefined} onBack={back} onNavigate={navigate} overlay={<MotionModal visible={!!confirmation} onRequestClose={() => { if (!busy.current) setConfirmation(null); }} onHidden={() => { const action = pending.current; pending.current = null; action?.(); }}>
    <View className="flex-1 justify-center px-5">
      {confirmation?.kind === 'productDelete' && <Pressable accessible={false} focusable={false} tabIndex={-1} onPress={() => { if (!busy.current) setConfirmation(null); }} style={{ position: 'absolute', inset: 0 }} />}
      {confirmation?.kind === 'restock' ? <ConfirmationContent stackedActions title="Confirm Restock?"
        message="Are you sure you want to add these new stock batches to your inventory? Your product's total stock will be updated."
        leadingIcon={<PosIcon name="alert" size={24} color={tokens.color.brightBlue} />} titleColor={tokens.color.darkNavy} iconTone="blue"
        destructive={false} cancelVariant="secondary" confirmLabel="Confirm" cancelLabel="Cancel" busy={saving} onCancel={() => setConfirmation(null)} onConfirm={confirm} />
      : confirmation && <ConfirmationContent stackedActions title={confirmation.kind === 'clear' ? 'Clear All Fields?' : confirmation.kind === 'discard' ? 'Discard Changes?' : confirmation.kind === 'batchDelete' ? 'Delete Batch ' + (draft.batches.findIndex(b => b.id === confirmation.batchId) + 1) + '?' : 'Delete Product?'}
        message={confirmation.kind === 'clear' ? 'Are you sure you want to clear all information? This action cannot be undone.' : confirmation.kind === 'discard' ? 'Your unsaved changes will be discarded.' : confirmation.kind === 'batchDelete' ? 'Are you sure you want to delete batch ' + (draft.batches.findIndex(b => b.id === confirmation.batchId) + 1) + '? This action cannot be undone.' : 'Are you sure you want to delete this product from your inventory? This action cannot be undone.'}
        confirmLabel={confirmation.kind === 'discard' ? 'Discard Changes' : 'Remove'} cancelLabel={confirmation.kind === 'discard' ? 'Keep Editing' : 'Cancel'} onCancel={() => setConfirmation(null)} onConfirm={confirm} />}
    </View>
  </MotionModal>}>
    {!!error && <Text accessibilityRole="alert" className=" type-micro-caption text-error-base">{error}</Text>}
    {readonly && product ? <>
      <ProductReview product={product} />
      {mode === 'delete' ? <><Button variant="destructiveOutline" onPress={() => setConfirmation({ kind: 'productDelete' })}>Delete Product</Button><Button variant="secondary" onPress={back}>Cancel</Button></> : <>
        <InvText bold color={tokens.color.darkNavy}>Restock history</InvText>
        {!restocks.length ? <InvText>No restocks yet.</InvText> : restocks.map(r => <InvCard key={r.id}><InvText bold>+{r.quantity} PCS · {r.stockDate}</InvText>{r.batches ? r.batches.map(b => <InvText key={b.id}>{b.quantity} PCS | {batchExpiryLabel(b)}</InvText>) : <InvText>Expires {r.expirationDate}</InvText>}{r.costCentavos != null && <InvText size={11}>Cost: {formatPesos(r.costCentavos)}</InvText>}<InvText size={11}>Recorded {new Date(r.recordedAt).toLocaleString('en-PH', { timeZone: inventoryRules.timeZone })}</InvText></InvCard>)}
        {canEditProduct && <Button onPress={() => push({ pathname: productRoot, params: { id: product.id, mode: 'edit' } })}>Edit Product</Button>}{canRestockProduct && <Button variant="secondary" onPress={() => push({ pathname: productRoot, params: { id: product.id, mode: 'restock' } })}>Restock</Button>}
      </>}
    </> : mode === 'restock' && product ? <>
      {productHeader(product)}
      <View className="flex-row flex-wrap items-center rounded-control border border-accent bg-ice-container p-3"><View className="min-w-[120px] flex-1 items-center gap-1"><InvText size={11}>Available</InvText><InvText size={20} color={tokens.color.royalBlue}>{productStock(product)} PCS</InvText></View><View className="h-12 w-px bg-outline" /><View className="min-w-[120px] flex-1 items-center gap-1"><InvText size={11}>Earliest Expiry</InvText><InvText color={tokens.color.royalBlue}>{earliestExpiry(product) ? batchExpiryLabel({ noExpiry: false, expirationDate: earliestExpiry(product) }) : 'No expiry date'}</InvText></View></View>
      <InvText bold size={11} color={tokens.color.textSecondary}>STOCK BATCHES</InvText>{productBatches(product).map((batch, index) => <ExistingBatchCard key={batch.id} batch={batch} index={index} />)}
      {batchCards}
      <InvDateField compact label="Stock date" value={draft.details.stockDate} onChange={v => update('stockDate', v)} error={errors.stockDate} />
      <InvField money label="Total Restock Cost (optional)" value={restockCost} onChangeText={setRestockCost}
        placeholder="0.00" keyboardType="decimal-pad" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
      <InvText size={10}>Halaga ng biniling paninda — ibabawas sa Pera sa Kaha.</InvText>
      <InvText size={10}>Existing batch dates stay unchanged.</InvText>
    </> : mode === 'add' && step === 'review' && reviewProduct ? <ProductReview product={reviewProduct} />
    : mode === 'add' && step === 'stock' ? <>{productHeader({ name: draft.details.name, category: draft.details.category as InventoryProduct['category'], unitPriceCentavos: parsePaymentAmount(draft.details.sellingPrice) ?? 0, photoUri: draft.details.photoUri })}{batchCards}</>
    : <>
      {mode === 'edit' && <View className="items-center gap-2 pb-2"><Pressable accessibilityRole="button" accessibilityLabel="Edit product photo" disabled={picking} onPress={pickPhoto}><ProductPhoto uri={draft.details.photoUri} size={112} /><View className="absolute bottom-1 right-1 rounded-pill bg-white p-1"><PosIcon name="edit" size={20} color={tokens.color.textPrimary} /></View></Pressable>{!!draft.details.photoUri && <Button compact fullWidth={false} variant="text" onPress={() => update('photoUri', undefined)}>Remove photo</Button>}</View>}
      {mode === 'edit' && <InvText bold size={11} color={tokens.color.textSecondary}>PRODUCT INFORMATION</InvText>}
      {detailsFields}
      {mode === 'add' ? <><InvText bold size={11} color={tokens.color.textSecondary}>PRODUCT PHOTO</InvText>{photoControl}{!!draft.details.photoUri && <Button variant="text" onPress={() => update('photoUri', undefined)}>Remove photo</Button>}</>
      : <><InvText bold size={11} color={tokens.color.textSecondary}>STOCK BATCHES</InvText>{batchCards}<View className="mt-8 gap-2 border-t border-outline pt-4"><InvText size={10}>This action cannot be undone.</InvText><Button variant="destructiveOutline" disabled={saving || picking} onPress={() => setConfirmation({ kind: 'productDelete' })}>Delete Product</Button></View></>}
    </>}
    {mode !== 'add' && preview.control}
    {actions && <View className="mt-2 gap-3">{actions}</View>}
  </InventoryFrame>;
}
function ProductPhoto({ uri, size = 96 }: { uri?: string; size?: number }) {
  return <View className="overflow-hidden rounded-control bg-ice-container" style={{ width: size, height: size, flexShrink: 0 }}>{uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>;
}
function ProductReview({ product }: { product: InventoryProduct }) {
  const status = stockCategory(productStock(product));
  const expiry = productExpiry(product, todayInManila());
  return <>
    <View className="flex-row items-center gap-4 rounded-control border border-outline bg-white p-3"><ProductPhoto uri={product.photoUri} size={84} /><View className="min-w-0 flex-1 gap-1"><InvText bold size={15} color={tokens.color.textPrimary}>{product.name}</InvText><InvText>{categoryLabels[product.category]} · {formatPesos(product.unitPriceCentavos)}</InvText></View></View>
    <InvText bold size={11} color={tokens.color.textSecondary}>PRODUCT INFORMATION</InvText><InvCard><ReviewRow label="Product Name" value={product.name} /><ReviewRow label="Category" value={categoryLabels[product.category]} /></InvCard>
    <InvText bold size={11} color={tokens.color.textSecondary}>PRICING DETAILS</InvText><InvCard><ReviewRow label="Cost / Capital Price" value={formatPesos(product.costCentavos)} /><ReviewRow label="Selling Price" value={formatPesos(product.unitPriceCentavos)} /><View className="flex-row flex-wrap justify-between gap-3 border-t border-outline pt-3"><View className="min-w-[120px] flex-1"><InvText size={11}>Estimated profit per item</InvText></View><Text className="text-right type-label-nav text-text-primary">{formatPesos(product.unitPriceCentavos - product.costCentavos)}</Text></View></InvCard>
    <InvText bold size={11} color={tokens.color.textSecondary}>INITIAL STOCK &amp; BATCHES</InvText><InvCard><ReviewRow label="Total Stock" value={productStock(product) + ' PCS'} /><ReviewRow label="Stock status" value={status === 'good' ? 'In Stock' : status === 'low' ? 'Low Stock' : 'Out of Stock'} /></InvCard>
    {expiry.expired && <InvText bold color={tokens.color.errorBase}>This product has expired stock.</InvText>}
    {expiry.nearExpiry && <InvText bold color={tokens.color.warningText}>This product has stock nearing expiry.</InvText>}
    {productBatches(product).map((batch, index) => <View key={batch.id} className="w-full overflow-hidden rounded-control border border-outline bg-white"><View className="min-h-9 justify-center px-3 py-2" style={{ backgroundColor: tokens.color.darkNavy }}><InvText bold color={tokens.color.surfaceCard}>Batch {index + 1}</InvText></View><View className="min-h-16 flex-row flex-wrap items-center justify-between gap-2 p-3"><InvText bold>{batch.quantity} PCS</InvText><InvText>{batch.noExpiry ? 'No expiry date' : 'Expires ' + batchExpiryLabel(batch)}</InvText></View></View>)}
  </>;
}
function ReviewRow({ label, value }: { label: string; value: string }) {
  return <View className="flex-row flex-wrap items-start justify-between gap-3 py-1"><View className="min-w-[100px] flex-1"><InvText size={11}>{label}</InvText></View><View className="min-w-[100px] flex-1"><Text className="text-right type-label-nav text-text-primary">{value}</Text></View></View>;
}
