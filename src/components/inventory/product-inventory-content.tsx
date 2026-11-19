import { KeyboardInput as TextInput } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionContent, MotionRegion } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useRef, useState } from 'react';
import { Image, Keyboard, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Button, IconButton } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import { InvCard, InvModal, InvSelect, InvText } from './inventory-ui';
import { getInventorySales } from '@/services/inventory';
import { useInventory } from '@/state/inventory';
import type { InventoryFilters } from '@/types/inventory';
import { categoryLabels, defaultFilters, filterInventory, inventorySummary, productExpiry, productStock, stockCategory, todayInManila } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { EmptyState, LoadingSlot, Skeleton, listPreviewStates, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import { inventoryStatusAppearance } from './inventory-status';
import { InventoryFilterControl } from './inventory-filter-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import tokens from '@/constants/design-tokens.json';

const sorting = { stockDesc: 'High-to-Low Stock', stockAsc: 'Low-to-High Stock', fast: 'Fast-selling', slow: 'Slow-selling', expiry: 'Expiring Soon' } as const;
const statuses = { good: 'In Stock', low: 'Low Stock', out: 'Out of Stock' } as const;
const productPageSize = 5;
type InventoryRouteBase = '/owner-inventory' | '/operator-inventory';

/** Shared product-only inventory list used by Owner and Operator routes. */
export function ProductInventoryContent({
  visible = true,
  routeBase = '/owner-inventory',
  initialStatus,
  canAdd = true,
  canEdit = true,
  canRestock = true,
  animate = true,
}: {
  visible?: boolean;
  routeBase?: InventoryRouteBase;
  initialStatus?: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canRestock?: boolean;
  animate?: boolean;
}) {
  const push = usePushOnce();
  const { store: liveStore } = useInventory();
  const { fontScale } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const preview = useContentPreview(listPreviewStates);
  const store = preview.empty ? { ...liveStore, products: [] } : liveStore;
  const [searchState, setSearchState] = useState({ visible, query: '', focused: false });
  if (searchState.visible !== visible) setSearchState({ visible, query: '', focused: false });
  const { query, focused } = searchState;
  const [filters, setFilters] = useState<InventoryFilters>({ ...defaultFilters, status: initialStatus === 'out' || initialStatus === 'low' ? initialStatus : 'all' });
  const [draft, setDraft] = useState<InventoryFilters>({ ...defaultFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockQuery, setRestockQuery] = useState('');
  const today = todayInManila();
  const summary = inventorySummary(store.products, today);
  const resultPreview = preview.mode === 'search' || preview.mode === 'filtered';
  const visibleProducts = resultPreview ? [] : filterInventory(store.products, query, filters, today, getInventorySales(store.pos?.sales ?? []));
  const pageKey = JSON.stringify([query, filters, preview.mode, visibleProducts.map(product => product.id)]);
  const [pageState, setPageState] = useState<{ key: string; index: number }>({ key: '', index: 0 });
  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / productPageSize));
  const pageIndex = pageState.key === pageKey ? Math.min(pageState.index, pageCount - 1) : 0;
  const pageProducts = visibleProducts.slice(pageIndex * productPageSize, (pageIndex + 1) * productPageSize);
  const productPath = routeBase === '/owner-inventory' ? '/owner-inventory/product' : '/operator-inventory/product';
  const productRoute = (id: string, mode: string) => push({ pathname: productPath, params: { id, mode } });
  const filtered = JSON.stringify(filters) !== JSON.stringify(defaultFilters) || !!query;
  const restockProducts = store.products.filter(product => product.name.toLowerCase().includes(restockQuery.trim().toLowerCase()));

  function goToPage(index: number) {
    setPageState({ key: pageKey, index });
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }
  function resetResults() {
    preview.reset();
    setSearchState(state => ({ ...state, query: '' }));
    setFilters({ ...defaultFilters });
  }
  function openFilters() {
    Keyboard.dismiss();
    setDraft({ ...filters });
    setFilterOpen(true);
  }

  const searching = preview.mode === 'search' || (preview.mode !== 'filtered' && !!query.trim());
  const search = <View className="min-h-12 flex-row items-center gap-2 rounded-control border border-[#E2EDF9] bg-white px-3" style={{ boxShadow: 'inset 0 2px 3px #D9E7F4' }}>
    <PosIcon name="search" size={18} /><TextInput accessibilityLabel="Search products" placeholder="Search Products" placeholderTextColor={tokens.color.textSecondary} underlineColorAndroid="transparent" value={query} onChangeText={value => setSearchState(state => ({ ...state, query: value }))} onFocus={() => setSearchState(state => ({ ...state, focused: true }))} onBlur={() => setSearchState(state => ({ ...state, focused: false }))} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} className="min-w-0 flex-1 font-poppins text-[12px]" style={{ minHeight: Math.max(tokens.size.touchTarget, Math.ceil(fontScale * 18) + 24), paddingVertical: 12, textAlignVertical: 'center', color: tokens.color.textPrimary, opacity: 1 }} />
    {!!query && <IconButton accessibilityLabel="Clear search" onPress={() => setSearchState(state => ({ ...state, query: '' }))} icon={props => <PosIcon name="close" {...props} />} />}
  </View>;
  const suggestions = !preview.loading && !resultPreview && focused && query.trim()
    ? store.products.filter(product => product.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 3)
    : [];
  const emptyList = () => <EmptyState icon={searching ? 'search' : 'inventory'}
    title={!store.products.length ? 'No products yet' : searching ? 'No products match your search' : 'No products in these filters'}
    description={!store.products.length ? canAdd ? 'Add your first product to start tracking stock.' : 'Ask the store owner to add products to inventory.' : 'Try another name or reset search and filters.'}
    action={store.products.length ? 'Reset search and filters' : canAdd ? 'Add Product' : undefined}
    onAction={store.products.length ? resetResults : canAdd ? () => push({ pathname: productPath, params: { mode: 'add' } }) : undefined} />;
  const showTopActions = canAdd || canRestock;
  const topActionRow = canAdd && canRestock ? <View className="flex-row gap-3"><View className="flex-1"><Button compact onPress={() => push({ pathname: productPath, params: { mode: 'add' } })}>Add Product</Button></View><View className="flex-1"><Button compact variant="secondary" disabled={preview.loading || !store.products.length} onPress={() => { Keyboard.dismiss(); setRestockQuery(''); setRestockOpen(true); }}>Restock</Button></View></View>
    : canAdd ? <Button compact onPress={() => push({ pathname: productPath, params: { mode: 'add' } })}>Add Product</Button>
      : canRestock ? <Button compact disabled={preview.loading || !store.products.length} onPress={() => { Keyboard.dismiss(); setRestockQuery(''); setRestockOpen(true); }}>Restock</Button>
        : null;

  if (!visible) return null;
  return <ProductContentWrapper animate={animate} changeKey={preview.mode}>
    <View className="flex-row gap-4 rounded-card border border-[#6B9CE0] bg-[#D9E7F4] p-3">
      <View className="min-w-0 flex-1 gap-2"><InvText bold size={11} color="#245399">Total products</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={26} color="#245399">{summary.total}</InvText></SkeletonMetric></View>
      <View className="min-w-0 flex-[1.65] items-end gap-2"><InvText bold size={11} color="#245399">Total inventory value</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={26} color="#245399">{formatPesos(summary.valueCentavos)}</InvText></SkeletonMetric></View>
    </View>
    <View className="flex-row flex-wrap gap-x-2">{(['good', 'low', 'out', 'nearExpiry'] as const).map(status => <Pressable key={status} accessibilityRole="button" accessibilityLabel={'Filter ' + (status === 'good' ? 'In Stock' : status === 'low' ? 'Low Stock' : status === 'out' ? 'Out of Stock' : 'Nearing Expiry')} accessibilityState={{ selected: filters.status === status }} onPress={() => setFilters({ ...filters, status: filters.status === status ? 'all' : status })} className="min-h-12 min-w-[44%] flex-1 justify-center">
      <View className="rounded-md border px-2 py-1" style={inventoryStatusAppearance(status)}><InvText size={11} color={inventoryStatusAppearance(status).color}>● {preview.loading ? '…' : status === 'low' ? summary.low + summary.critical : summary[status]} {status === 'good' ? 'Good' : status === 'nearExpiry' ? 'Nearing expiry' : statuses[status]}</InvText></View>
    </Pressable>)}</View>
    {showTopActions && topActionRow}
    <View className="mt-1 flex-row items-center justify-between"><InvText bold color="#102342">Products</InvText><InventoryFilterControl onPress={openFilters} /></View>
    {search}
    {suggestions.length > 0 && <MotionRegion><InvCard>{suggestions.map(product => <Pressable key={product.id} accessibilityRole="button" onPress={() => { setSearchState(state => ({ ...state, query: product.name, focused: false })); Keyboard.dismiss(); }} className="min-h-12 justify-center"><InvText>{product.name}</InvText></Pressable>)}</InvCard></MotionRegion>}
    {filtered && <View className="flex-row items-center"><InvText>{visibleProducts.length} matching products</InvText></View>}
    {preview.loading ? <RecordSkeleton kind="product" /> : !visibleProducts.length ? emptyList() : pageProducts.map(product => {
      const status = stockCategory(productStock(product)), expiry = productExpiry(product, today);
      return <InvCard key={product.id}>
        <Pressable accessibilityRole="button" accessibilityLabel={'View ' + product.name} onPress={() => productRoute(product.id, 'details')} className="flex-row items-center gap-3">
          <View className="h-20 w-20 overflow-hidden rounded-control bg-[#D9E7F4]">{product.photoUri && <Image source={{ uri: product.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>
          <View className="min-w-0 flex-1 gap-2"><InvText bold size={13} color="#102342">{product.name}</InvText><View className="flex-row flex-wrap items-start justify-between gap-x-2 gap-y-1"><View className="min-w-[60px] flex-1"><InvText size={11}>{categoryLabels[product.category]}</InvText></View><InvText size={11}>{productStock(product)} PCS</InvText></View><View className="flex-row flex-wrap items-center gap-x-2 gap-y-1"><InvText bold color="#112F6F">{formatPesos(product.unitPriceCentavos)}</InvText><InvText bold size={11} color="#4A607A">|</InvText><InvText bold size={11} color={inventoryStatusAppearance(status).color}>{statuses[status]}</InvText></View></View>
        </Pressable>
        {(expiry.expired || expiry.nearExpiry) && <View className="flex-row flex-wrap gap-2">{expiry.expired && <InvText size={11} color="#972020">● Expired stock</InvText>}{expiry.nearExpiry && <InvText size={11} color="#805000">● Nearing expiry</InvText>}</View>}
        {(canEdit || canRestock) && <View className="flex-row gap-3">{canEdit && <View className="min-w-0 flex-1"><Button compact variant="secondary" onPress={() => productRoute(product.id, 'edit')}>Edit</Button></View>}{canRestock && <View className="min-w-0 flex-1"><Button compact onPress={() => productRoute(product.id, 'restock')}>Restock</Button></View>}</View>}
      </InvCard>;
    })}
    {!preview.loading && visibleProducts.length > productPageSize && <PaginationControls pageIndex={pageIndex} pageCount={pageCount} itemName="product" onPageChange={goToPage} />}
    {preview.control}
    <InvModal visible={filterOpen} sheet title="Sort & Filter" subtitle="Choose how to sort and filter your products." onClose={() => setFilterOpen(false)} footer={<View className="flex-row gap-3"><View className="flex-1"><Button compact variant="secondary" onPress={() => setDraft({ ...defaultFilters })}>Reset</Button></View><View className="flex-[2]"><Button compact onPress={() => { setFilters({ ...draft }); setFilterOpen(false); }}>Apply Filter</Button></View></View>}>
      <InvSelect key={String(filterOpen)} anchored label="Category" value={draft.category} options={{ all: 'All Categories', ...categoryLabels }} onChange={category => setDraft({ ...draft, category })} />
      {Object.entries(sorting).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === key }} aria-checked={draft.sort === key} onPress={() => setDraft({ ...draft, sort: key as InventoryFilters['sort'] })} className="min-h-12 flex-row items-center gap-3 rounded-control bg-white px-3 py-3" style={{ boxShadow: '0 2px 3px #00000030' }}><InvText size={22} color="#245399">{draft.sort === key ? '◉' : '○'}</InvText><InvText color="#102342">{label}</InvText></Pressable>)}
      <InvText bold color="#112F6F">Stock Status</InvText><View className="flex-row flex-wrap gap-2">{Object.entries(statuses).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: draft.status === key }} aria-checked={draft.status === key} onPress={() => setDraft({ ...draft, status: draft.status === key ? 'all' : key as InventoryFilters['status'] })} className="min-h-12 min-w-[88px] flex-1 flex-row items-center justify-center gap-1 rounded-control border p-2" style={inventoryStatusAppearance(key)}><InvText color={inventoryStatusAppearance(key).color}>{draft.status === key ? '◉' : '○'}</InvText><View className="min-w-0 flex-shrink"><InvText size={11} color={inventoryStatusAppearance(key).color}>{label}</InvText></View></Pressable>)}</View>
      {(draft.status === 'expired' || draft.status === 'nearExpiry') && <Button compact variant="text" onPress={() => setDraft({ ...draft, status: 'all' })}>{'Clear ' + (draft.status === 'expired' ? 'expired' : 'nearing expiry') + ' alert filter'}</Button>}
    </InvModal>
    {canRestock && <InvModal visible={restockOpen} sheet title="Choose a product to restock" subtitle="Select a product to add stock batches." onClose={() => setRestockOpen(false)}>
      <InvFieldSearch value={restockQuery} onChange={setRestockQuery} />
      <View className="flex-row items-center justify-between gap-2"><InvText bold color="#245399">Products</InvText><InvText size={10}>{restockProducts.length} {restockProducts.length === 1 ? 'product' : 'products'}</InvText></View>
      {!restockProducts.length && <InvText>No products match your search.</InvText>}
      {restockProducts.map(product => {
        const status = stockCategory(productStock(product));
        return <Pressable key={product.id} accessibilityRole="button" accessibilityLabel={'Restock ' + product.name} onPress={() => { Keyboard.dismiss(); setRestockOpen(false); productRoute(product.id, 'restock'); }} className="min-h-20 flex-row items-center gap-3 rounded-control border border-[#B0C8E3] bg-white p-3">
          <View className="h-14 w-14 overflow-hidden rounded-control bg-[#D9E7F4]">{product.photoUri && <Image source={{ uri: product.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>
          <View className="min-w-0 flex-1 gap-1"><View className="min-h-6 flex-row items-center gap-2"><View className="min-w-0 flex-1"><InvText bold color="#102342">{product.name}</InvText></View><PosIcon name="chevronRight" size={18} color="#245399" /></View><InvText size={10}>{categoryLabels[product.category]}</InvText><View className="flex-row items-center gap-2"><View className="min-w-0 flex-1"><InvText size={10}>{productStock(product)} PCS available</InvText></View><View className="min-w-[88px] items-end"><InvText bold size={10} color={inventoryStatusAppearance(status).color}>{statuses[status]}</InvText></View></View></View>
        </Pressable>;
      })}
    </InvModal>}
  </ProductContentWrapper>;
}

function ProductContentWrapper({ animate, changeKey, children }: { animate: boolean; changeKey: string | boolean; children: React.ReactNode }) {
  return animate ? <MotionContent changeKey={changeKey} className="gap-3">{children}</MotionContent> : <View className="gap-3">{children}</View>;
}

function InvFieldSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <View className="min-h-12 flex-row items-center gap-2 rounded-control border border-[#B0C8E3] bg-white px-3">
    <PosIcon name="search" size={18} />
    <TextInput accessibilityLabel="Search products to restock" placeholder="Search Product..." placeholderTextColor={tokens.color.textSecondary} underlineColorAndroid="transparent" value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} returnKeyType="search" className="min-w-0 flex-1 font-poppins text-[12px] text-brand" />
    {!!value && <IconButton accessibilityLabel="Clear product search" onPress={() => onChange('')} icon={props => <PosIcon name="close" {...props} />} />}
  </View>;
}
function SkeletonMetric({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return loading ? <Skeleton><LoadingSlot loading>{children}</LoadingSlot></Skeleton> : <>{children}</>;
}
