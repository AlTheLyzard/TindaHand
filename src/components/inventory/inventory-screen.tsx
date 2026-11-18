import { KeyboardInput as TextInput } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionContent, MotionRegion } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Image, Keyboard, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { Button, IconButton } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import { InvCard, InventoryFrame, InvModal, InvSelect, InvText } from './inventory-ui';
import { getInventorySales } from '@/services/inventory';
import { useInventory } from '@/state/inventory';
import type { InventoryFilters } from '@/types/inventory';
import { categoryLabels, defaultFilters, filterInventory, inventorySummary, productExpiry, productStock, stockCategory, todayInManila } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { EmptyState, LoadingSlot, Skeleton, listPreviewStates, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import { SegmentedSelector } from '@/components/ui/segmented-selector';
import { inventoryStatusAppearance } from './inventory-status';
import { AssetCategoryChips } from './asset-category-chips';
import { AssetCard } from './asset-card';
import { InventoryFilterControl } from './inventory-filter-control';
import { PaginationControls } from '@/components/ui/pagination-controls';
import tokens from '@/constants/design-tokens.json';

const sorting = { stockDesc: 'High-to-Low Stock', stockAsc: 'Low-to-High Stock', fast: 'Fast-selling', slow: 'Slow-selling', expiry: 'Expiring Soon' } as const;
const statuses = { good: 'In Stock', low: 'Low Stock', out: 'Out of Stock' } as const;
const productPageSize = 5;

export function InventoryScreen() {
  const push = usePushOnce();
  const { tab, status: routeStatus } = useLocalSearchParams<{ tab?: string; status?: string }>();
  const { store: liveStore } = useInventory();
  const { fontScale } = useWindowDimensions();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const preview = useContentPreview(listPreviewStates);
  const store = preview.empty ? { ...liveStore, products: [], assets: [] } : liveStore;
  const [assets, setAssets] = useState(tab === 'assets');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>({ ...defaultFilters, status: routeStatus === 'out' || routeStatus === 'low' ? routeStatus : 'all' });
  const [draft, setDraft] = useState<InventoryFilters>({ ...defaultFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockQuery, setRestockQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState('all');
  const today = todayInManila();
  const summary = inventorySummary(store.products, today);
  const resultPreview = preview.mode === 'search' || preview.mode === 'filtered';
  const visible = resultPreview ? [] : filterInventory(store.products, query, filters, today, getInventorySales(store.pos?.sales ?? []));
  const pageKey = JSON.stringify([assets, query, filters, preview.mode, visible.map(product => product.id)]);
  const [pageState, setPageState] = useState<{ key: string; index: number }>({ key: '', index: 0 });
  const pageCount = Math.max(1, Math.ceil(visible.length / productPageSize));
  const pageIndex = pageState.key === pageKey ? Math.min(pageState.index, pageCount - 1) : 0;
  const pageProducts = visible.slice(pageIndex * productPageSize, (pageIndex + 1) * productPageSize);
  function goToPage(index: number) {
    setPageState({ key: pageKey, index });
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }
  const matchingAssets = resultPreview ? [] : store.assets.filter(a => a.name.toLowerCase().includes(query.trim().toLowerCase()) && (assetFilter === 'all' || a.classification === assetFilter));
  const assetTotals = store.assets.reduce((sum, a) => ({ ...sum, total: sum.total + a.valueCentavos, [a.classification]: sum[a.classification] + a.valueCentavos }), { total: 0, current: 0, equipment: 0, furniture: 0 });
  const suggestions = !preview.loading && !resultPreview && !assets && focused && query.trim() ? store.products.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 3) : [];
  const resetResults = () => { preview.reset(); setQuery(''); setFilters({ ...defaultFilters }); setAssetFilter('all'); };
  const searching = preview.mode === 'search' || (preview.mode !== 'filtered' && !!query.trim());
  const productRoute = (id: string, mode: string) => push({ pathname: '/owner-inventory/product', params: { id, mode } });
  const filtered = JSON.stringify(filters) !== JSON.stringify(defaultFilters) || !!query;
  const restockProducts = store.products.filter(p => p.name.toLowerCase().includes(restockQuery.trim().toLowerCase()));
  function openFilters() { Keyboard.dismiss(); setDraft({ ...filters }); setFilterOpen(true); }
  const search = <View className="min-h-12 flex-row items-center gap-2 rounded-control border border-[#E2EDF9] bg-white px-3" style={{ boxShadow: 'inset 0 2px 3px #D9E7F4' }}>
    <PosIcon name="search" size={18} /><TextInput accessibilityLabel={assets ? 'Search assets' : 'Search products'} placeholder={assets ? 'Search Assets' : 'Search Products'} placeholderTextColor={tokens.color.textSecondary} underlineColorAndroid="transparent" value={query} onChangeText={setQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} className="min-w-0 flex-1 font-poppins text-[12px]" style={{ minHeight: Math.max(tokens.size.touchTarget, Math.ceil(fontScale * 18) + 24), paddingVertical: 12, textAlignVertical: 'center', color: tokens.color.textPrimary, opacity: 1 }} />
    {!!query && <IconButton accessibilityLabel="Clear search" onPress={() => setQuery('')} icon={props => <PosIcon name="close" {...props} />} />}
  </View>;
  const emptyList = (isAsset: boolean) => <EmptyState icon={searching ? 'search' : 'inventory'}
    title={!(isAsset ? store.assets.length : store.products.length) ? isAsset ? 'No assets yet' : 'No products yet' : searching ? isAsset ? 'No assets match your search' : 'No products match your search' : isAsset ? 'No assets in this filter' : 'No products in these filters'}
    description={!(isAsset ? store.assets.length : store.products.length) ? isAsset ? 'Add your first business asset to track its value.' : 'Add your first product to start tracking stock.' : 'Try another name or reset search and filters.'}
    action={!(isAsset ? store.assets.length : store.products.length) ? isAsset ? 'Add Asset' : 'Add Product' : 'Reset search and filters'}
    onAction={() => { if ((isAsset ? store.assets.length : store.products.length)) resetResults(); else { preview.reset(); push(isAsset ? { pathname: '/owner-inventory/asset', params: { mode: 'add' } } : { pathname: '/owner-inventory/product', params: { mode: 'add' } }); } }} />;
  return <InventoryFrame title="Inventory" background scrollRef={scrollRef}><MotionContent changeKey={assets + ':' + preview.mode} className="gap-3">
    <SegmentedSelector tone="subtle" options={[{ label: 'Products', value: 'products' }, { label: 'Assets', value: 'assets' }]} value={assets ? 'assets' : 'products'} onChange={value => { setAssets(value === 'assets'); setQuery(''); }} />
    {!assets ? <>
      <View className="flex-row gap-4 rounded-card border border-[#6B9CE0] bg-[#D9E7F4] p-3">
        <View className="min-w-0 flex-1 gap-2"><InvText bold size={11} color="#245399">Total products</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={26} color="#245399">{summary.total}</InvText></SkeletonMetric></View>
        <View className="min-w-0 flex-[1.65] items-end gap-2"><InvText bold size={11} color="#245399">Total inventory value</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={26} color="#245399">{formatPesos(summary.valueCentavos)}</InvText></SkeletonMetric></View>
      </View>
      <View className="flex-row flex-wrap gap-x-2">{(['good', 'low', 'out', 'nearExpiry'] as const).map(status => <Pressable key={status} accessibilityRole="button" accessibilityLabel={'Filter ' + (status === 'good' ? 'In Stock' : status === 'low' ? 'Low Stock' : status === 'out' ? 'Out of Stock' : 'Nearing Expiry')} accessibilityState={{ selected: filters.status === status }} onPress={() => setFilters({ ...filters, status: filters.status === status ? 'all' : status })} className="min-h-12 min-w-[44%] flex-1 justify-center">
        <View className="rounded-md border px-2 py-1" style={inventoryStatusAppearance(status)}><InvText size={11} color={inventoryStatusAppearance(status).color}>● {preview.loading ? '…' : status === 'low' ? summary.low + summary.critical : summary[status]} {status === 'good' ? 'Good' : status === 'nearExpiry' ? 'Nearing expiry' : statuses[status]}</InvText></View>
      </Pressable>)}</View>
      <View className="flex-row gap-3"><View className="flex-1"><Button compact onPress={() => push({ pathname: '/owner-inventory/product', params: { mode: 'add' } })}>Add Product</Button></View><View className="flex-1"><Button compact variant="secondary" disabled={preview.loading || !store.products.length} onPress={() => { Keyboard.dismiss(); setRestockQuery(''); setRestockOpen(true); }}>Restock</Button></View></View>
      <View className="mt-1 flex-row items-center justify-between"><InvText bold color="#102342">Products</InvText><InventoryFilterControl onPress={openFilters} /></View>
      {search}
      {suggestions.length > 0 && <MotionRegion><InvCard>{suggestions.map(p => <Pressable key={p.id} accessibilityRole="button" onPress={() => { setQuery(p.name); setFocused(false); Keyboard.dismiss(); }} className="min-h-12 justify-center"><InvText>{p.name}</InvText></Pressable>)}</InvCard></MotionRegion>}
      {filtered && <View className="flex-row items-center justify-between gap-2"><InvText>{visible.length} matching products</InvText><Button compact variant="text" fullWidth={false} onPress={resetResults}>Reset search and filters</Button></View>}
      {preview.loading ? <RecordSkeleton kind="product" /> : !visible.length ? emptyList(false) : pageProducts.map(p => {
        const status = stockCategory(productStock(p)), expiry = productExpiry(p, today);
        return <InvCard key={p.id}>
          <Pressable accessibilityRole="button" accessibilityLabel={'View ' + p.name} onPress={() => productRoute(p.id, 'details')} className="flex-row items-center gap-3">
            <View className="h-20 w-20 overflow-hidden rounded-control bg-[#D9E7F4]">{p.photoUri && <Image source={{ uri: p.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>
            <View className="min-w-0 flex-1 gap-2"><InvText bold size={13} color="#102342">{p.name}</InvText><View className="flex-row flex-wrap items-start justify-between gap-x-2 gap-y-1"><View className="min-w-[60px] flex-1"><InvText size={11}>{categoryLabels[p.category]}</InvText></View><InvText size={11}>{productStock(p)} PCS</InvText></View><View className="flex-row flex-wrap items-center gap-x-2 gap-y-1"><InvText bold color="#112F6F">{formatPesos(p.unitPriceCentavos)}</InvText><InvText bold size={11} color="#4A607A">|</InvText><InvText bold size={11} color={inventoryStatusAppearance(status).color}>{statuses[status]}</InvText></View></View>
          </Pressable>
          {(expiry.expired || expiry.nearExpiry) && <View className="flex-row flex-wrap gap-2">{expiry.expired && <InvText size={11} color="#972020">● Expired stock</InvText>}{expiry.nearExpiry && <InvText size={11} color="#805000">● Nearing expiry</InvText>}</View>}
          <View className="flex-row gap-3"><View className="min-w-0 flex-1"><Button compact variant="secondary" onPress={() => productRoute(p.id, 'edit')}>Edit</Button></View><View className="min-w-0 flex-1"><Button compact onPress={() => productRoute(p.id, 'restock')}>Restock</Button></View></View>
        </InvCard>;
      })}
      {!preview.loading && visible.length > productPageSize && <PaginationControls pageIndex={pageIndex} pageCount={pageCount} itemName="product" onPageChange={goToPage} />}
    </> : <>
      <View className="mt-3 gap-3 rounded-card bg-action p-4"><InvText size={12} color="#FFFFFF">Total business asset value</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={28} color="#FFFFFF">{formatPesos(assetTotals.total)}</InvText></SkeletonMetric><View className="items-end"><InvText bold size={11} color="#FFFFFF">{store.assets.length} asset entries</InvText></View></View>
      <View className="flex-row flex-wrap gap-3">{[['Current assets', assetTotals.current], ['Non-current assets', assetTotals.equipment + assetTotals.furniture]].map(([label, amount]) => <View key={label} className="min-w-[130px] flex-1"><InvCard><InvText>{label}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={18} color="#112F6F">{formatPesos(Number(amount))}</InvText></SkeletonMetric></InvCard></View>)}</View>
      <InvCard>{[['Equipment', assetTotals.equipment], ['Furniture & Fixtures', assetTotals.furniture]].map(([label, amount]) => <View key={label} className="flex-row flex-wrap items-start justify-between gap-3 py-2"><View className="min-w-[120px] flex-1"><InvText color="#102342">{label}</InvText></View><InvText bold color="#112F6F">{formatPesos(Number(amount))}</InvText></View>)}</InvCard>
      <View className="py-3"><Button onPress={() => push({ pathname: '/owner-inventory/asset', params: { mode: 'add' } })}>Add Asset</Button></View>
      <View testID="business-assets-heading" className="flex-row items-center gap-2"><View className="min-w-0 flex-1"><InvText bold color="#112F6F">Business assets</InvText></View>
        <InventoryFilterControl onPress={openFilters} />
      </View><AssetCategoryChips value={assetFilter} onChange={setAssetFilter} />
      {search}
      {preview.loading ? <RecordSkeleton kind="asset" /> : !matchingAssets.length ? emptyList(true) : matchingAssets.map(asset => <AssetCard key={asset.id} asset={asset}
        onEdit={() => push({ pathname: '/owner-inventory/asset', params: { id: asset.id, mode: 'edit' } })} />)}
    </>}
    {preview.control}
    <InvModal visible={filterOpen} sheet title="Sort & Filter" subtitle="Choose how to sort and filter your products." onClose={() => setFilterOpen(false)} footer={<View className="flex-row gap-3"><View className="flex-1"><Button compact variant="secondary" onPress={() => setDraft({ ...defaultFilters })}>Reset</Button></View><View className="flex-[2]"><Button compact onPress={() => { setFilters({ ...draft }); setFilterOpen(false); }}>Apply Filter</Button></View></View>}>
      <InvSelect key={String(filterOpen)} anchored label="Category" value={draft.category} options={{ all: 'All Categories', ...categoryLabels }} onChange={category => setDraft({ ...draft, category })} />
      {Object.entries(sorting).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === key }} aria-checked={draft.sort === key} onPress={() => setDraft({ ...draft, sort: key as InventoryFilters['sort'] })} className="min-h-12 flex-row items-center gap-3 rounded-control bg-white px-3 py-3" style={{ boxShadow: '0 2px 3px #00000030' }}><InvText size={22} color="#245399">{draft.sort === key ? '◉' : '○'}</InvText><InvText color="#102342">{label}</InvText></Pressable>)}
      <InvText bold color="#112F6F">Stock Status</InvText><View className="flex-row flex-wrap gap-2">{Object.entries(statuses).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: draft.status === key }} aria-checked={draft.status === key} onPress={() => setDraft({ ...draft, status: draft.status === key ? 'all' : key as InventoryFilters['status'] })} className="min-h-12 min-w-[88px] flex-1 flex-row items-center justify-center gap-1 rounded-control border p-2" style={inventoryStatusAppearance(key)}><InvText color={inventoryStatusAppearance(key).color}>{draft.status === key ? '◉' : '○'}</InvText><View className="min-w-0 flex-shrink"><InvText size={11} color={inventoryStatusAppearance(key).color}>{label}</InvText></View></Pressable>)}</View>
      {(draft.status === 'expired' || draft.status === 'nearExpiry') && <Button compact variant="text" onPress={() => setDraft({ ...draft, status: 'all' })}>{'Clear ' + (draft.status === 'expired' ? 'expired' : 'nearing expiry') + ' alert filter'}</Button>}
    </InvModal>
    <InvModal visible={restockOpen} sheet title="Choose a product to restock" subtitle="Select a product to add stock batches." onClose={() => setRestockOpen(false)}>
      <InvFieldSearch value={restockQuery} onChange={setRestockQuery} />
      <View className="flex-row items-center justify-between gap-2"><InvText bold color="#245399">Products</InvText><InvText size={10}>{restockProducts.length} {restockProducts.length === 1 ? 'product' : 'products'}</InvText></View>
      {!restockProducts.length && <InvText>No products match your search.</InvText>}
      {restockProducts.map(p => {
        const status = stockCategory(productStock(p));
        return <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={'Restock ' + p.name} onPress={() => { Keyboard.dismiss(); setRestockOpen(false); productRoute(p.id, 'restock'); }} className="min-h-20 flex-row items-center gap-3 rounded-control border border-[#B0C8E3] bg-white p-3">
          <View className="h-14 w-14 overflow-hidden rounded-control bg-[#D9E7F4]">{p.photoUri && <Image source={{ uri: p.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>
          <View className="min-w-0 flex-1 gap-1"><View className="min-h-6 flex-row items-center gap-2"><View className="min-w-0 flex-1"><InvText bold color="#102342">{p.name}</InvText></View><PosIcon name="chevronRight" size={18} color="#245399" /></View><InvText size={10}>{categoryLabels[p.category]}</InvText><View className="flex-row items-center gap-2"><View className="min-w-0 flex-1"><InvText size={10}>{productStock(p)} PCS available</InvText></View><View className="min-w-[88px] items-end"><InvText bold size={10} color={inventoryStatusAppearance(status).color}>{statuses[status]}</InvText></View></View></View>
        </Pressable>;
      })}
    </InvModal>
  </MotionContent></InventoryFrame>;
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
