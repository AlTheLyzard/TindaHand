import tokens from '@/constants/design-tokens.json';
import { SearchBar } from '@/components/ui/search-bar';
import { MotionContent, MotionRegion } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Keyboard, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { InvCard, InventoryFrame, InvModal, InvText } from './inventory-ui';
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
import { InventoryFilterSheet } from './inventory-filter-sheet';

const statuses = { good: 'In Stock', low: 'Low Stock', out: 'Out of Stock' } as const;

type InventoryRouteBase = '/owner-inventory' | '/operator-inventory';

export function InventoryScreen({
  readOnly = false,
  showAssets = true,
  routeBase = '/owner-inventory',
  initialStatus,
  canAdd = !readOnly,
  canEdit = !readOnly,
  canRestock = true,
}: {
  readOnly?: boolean;
  showAssets?: boolean;
  routeBase?: InventoryRouteBase;
  initialStatus?: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canRestock?: boolean;
}) {
  const push = usePushOnce();
  const { tab, status: routeStatus } = useLocalSearchParams<{ tab?: string; status?: string }>();
  const { store: liveStore, refetchProducts, refetchAssets } = useInventory();
  // Re-sync with the backend whenever this screen comes into focus.
  // This ensures May-Ari sees Kahera's restocks, and Kahera sees May-Ari's edits.
  useFocusEffect(useCallback(() => { void refetchProducts(); void refetchAssets(); }, [refetchProducts, refetchAssets]));
  const preview = useContentPreview(listPreviewStates);
  const store = preview.empty ? { ...liveStore, products: [], assets: [] } : liveStore;
  const [assets, setAssets] = useState(showAssets && tab === 'assets');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const status = initialStatus ?? routeStatus;
  const [filters, setFilters] = useState<InventoryFilters>({ ...defaultFilters, status: status === 'out' || status === 'low' ? status : 'all' });
  const [draft, setDraft] = useState<InventoryFilters>({ ...defaultFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockQuery, setRestockQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState('all');
  const today = todayInManila();
  const summary = inventorySummary(store.products, today);
  const resultPreview = preview.mode === 'search' || preview.mode === 'filtered';
  const visible = resultPreview ? [] : filterInventory(store.products, query, filters, today, getInventorySales(store.pos?.sales ?? []));
  const matchingAssets = resultPreview ? [] : store.assets.filter(a => a.name.toLowerCase().includes(query.trim().toLowerCase()) && (assetFilter === 'all' || a.classification === assetFilter));
  const assetTotals = store.assets.reduce((sum, a) => ({ ...sum, total: sum.total + a.valueCentavos, [a.classification]: sum[a.classification] + a.valueCentavos }), { total: 0, current: 0, equipment: 0, furniture: 0 });
  const suggestions = !preview.loading && !resultPreview && !assets && focused && query.trim() ? store.products.filter(p => p.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 3) : [];
  const resetResults = () => { preview.reset(); setQuery(''); setFilters({ ...defaultFilters }); setAssetFilter('all'); };
  const searching = preview.mode === 'search' || (preview.mode !== 'filtered' && !!query.trim());
  const productPath = routeBase === '/owner-inventory' ? '/owner-inventory/product' : '/operator-inventory/product';
  const productRoute = (id: string, mode: string) => push({ pathname: productPath, params: { id, mode } });
  const filtered = JSON.stringify(filters) !== JSON.stringify(defaultFilters) || !!query;
  const restockProducts = store.products.filter(p => p.name.toLowerCase().includes(restockQuery.trim().toLowerCase()));
  function openFilters() { Keyboard.dismiss(); setDraft({ ...filters }); setFilterOpen(true); }
  const search = <SearchBar label={assets ? 'Search assets' : 'Search products'} placeholder={assets ? 'Search Assets' : 'Search Products'}
    value={query} onChangeText={setQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSubmitEditing={Keyboard.dismiss}
    onClear={() => setQuery('')} clearLabel="Clear search"
    results={suggestions.length > 0 ? <MotionRegion>{suggestions.map(product => <Pressable key={product.id} accessibilityRole="button"
      onPress={() => { setQuery(product.name); setFocused(false); Keyboard.dismiss(); }} className="min-h-12 justify-center px-3"><InvText>{product.name}</InvText></Pressable>)}</MotionRegion> : undefined} />;
  const emptyList = (isAsset: boolean) => { const hasItems = !!(isAsset ? store.assets.length : store.products.length); return <EmptyState icon={searching ? 'search' : 'inventory'}
    title={!hasItems ? isAsset ? 'No assets yet' : 'No products yet' : searching ? isAsset ? 'No assets match your search' : 'No products match your search' : isAsset ? 'No assets in this filter' : 'No products in these filters'}
    description={!hasItems ? isAsset ? 'Add your first business asset to track its value.' : 'Add your first product to start tracking stock.' : 'Try another name or reset search and filters.'}
    action={hasItems ? 'Reset search and filters' : isAsset ? undefined : canAdd ? 'Add Product' : undefined}
    actionVariant={hasItems ? 'text' : undefined} actionTextColor={hasItems ? tokens.color.royalBlue : undefined}
    onAction={() => { if (hasItems) resetResults(); else if (canAdd && !isAsset) { preview.reset(); push({ pathname: productPath, params: { mode: 'add' } }); } }} />; };
  return <InventoryFrame title="Inventory" background><MotionContent changeKey={assets + ':' + preview.mode} className="gap-3">
    {showAssets && <SegmentedSelector tone="subtle" options={[{ label: 'Products', value: 'products' }, { label: 'Assets', value: 'assets' }]} value={assets ? 'assets' : 'products'} onChange={value => { setAssets(value === 'assets'); setQuery(''); }} />}
    {!assets ? <>
      <View className="flex-row gap-4 rounded-card border border-accent bg-ice-container p-4">
        <View className="min-w-0 flex-1 gap-2"><InvText bold size={11} color={tokens.color.royalBlue}>Total products</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={26} color={tokens.color.royalBlue}>{summary.total}</InvText></SkeletonMetric></View>
        <View className="min-w-0 flex-[1.65] items-end gap-2"><InvText bold size={11} color={tokens.color.royalBlue}>Total inventory value</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={26} color={tokens.color.royalBlue}>{formatPesos(summary.valueCentavos)}</InvText></SkeletonMetric></View>
      </View>
      <View className="flex-row flex-wrap gap-x-2">{(['good', 'low', 'out', 'nearExpiry'] as const).map(status => <Pressable key={status} accessibilityRole="button" accessibilityLabel={'Filter ' + (status === 'good' ? 'In Stock' : status === 'low' ? 'Low Stock' : status === 'out' ? 'Out of Stock' : 'Nearing Expiry')} accessibilityState={{ selected: filters.status === status }} onPress={() => setFilters({ ...filters, status: filters.status === status ? 'all' : status })} className="min-h-12 min-w-[44%] flex-1 justify-center">
        <View className="rounded-md border px-2 py-1" style={inventoryStatusAppearance(status)}><InvText size={11} color={inventoryStatusAppearance(status).color}>● {preview.loading ? '…' : status === 'low' ? summary.low + summary.critical : summary[status]} {status === 'good' ? 'Good' : status === 'nearExpiry' ? 'Nearing expiry' : statuses[status]}</InvText></View>
      </Pressable>)}</View>
      {canAdd && canRestock ? <View className="flex-row gap-3"><View className="flex-1"><Button compact onPress={() => push({ pathname: productPath, params: { mode: 'add' } })}>Add Product</Button></View><View className="flex-1"><Button compact variant="secondary" disabled={preview.loading || !store.products.length} onPress={() => { Keyboard.dismiss(); setRestockQuery(''); setRestockOpen(true); }}>Restock</Button></View></View>
        : canAdd ? <Button compact onPress={() => push({ pathname: productPath, params: { mode: 'add' } })}>Add Product</Button>
          : canRestock ? <Button compact variant={readOnly ? 'primary' : 'secondary'} disabled={preview.loading || !store.products.length} onPress={() => { Keyboard.dismiss(); setRestockQuery(''); setRestockOpen(true); }}>Restock</Button> : null}
      <View className="mt-1 flex-row items-center justify-between"><InvText bold color={tokens.color.textPrimary}>Products</InvText><InventoryFilterControl onPress={openFilters} /></View>
      {search}
      {filtered && <View className="flex-row items-center justify-between gap-2"><InvText>{visible.length} matching products</InvText><Button compact variant="text" textColor={tokens.color.royalBlue} fullWidth={false} onPress={resetResults}>Reset search and filters</Button></View>}
      {preview.loading ? <RecordSkeleton kind="product" /> : !visible.length ? emptyList(false) : visible.map(p => {
        const status = stockCategory(productStock(p)), expiry = productExpiry(p, today);
        return <InvCard key={p.id}>
          <Pressable accessibilityRole="button" accessibilityLabel={'View ' + p.name} onPress={() => productRoute(p.id, 'details')} className="flex-row items-center gap-3">
            <View className="h-20 w-20 overflow-hidden rounded-control bg-ice-container">{p.photoUri && <Image source={{ uri: p.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}</View>
            <View className="min-w-0 flex-1 gap-1"><InvText bold size={16} color={tokens.color.textPrimary}>{p.name}</InvText><InvText size={14}>{categoryLabels[p.category]}</InvText><View className="flex-row flex-wrap items-center gap-x-1"><InvText bold size={16} color={tokens.color.darkNavy}>{formatPesos(p.unitPriceCentavos)}</InvText><InvText size={14} color={tokens.color.textSecondary}>|</InvText><InvText size={14} color={inventoryStatusAppearance(status).color}>{statuses[status]}</InvText></View></View>
            <View className="min-w-[56px] items-center justify-center"><InvText size={14} color={tokens.color.textPrimary}>{productStock(p)} PCS</InvText></View>
          </Pressable>
          {(expiry.expired || expiry.nearExpiry) && <View className="flex-row flex-wrap gap-2">{expiry.expired && <InvText size={11} color={tokens.color.errorBase}>● Expired stock</InvText>}{expiry.nearExpiry && <InvText size={11} color={tokens.color.warningText}>● Nearing expiry</InvText>}</View>}
          {(canEdit || canRestock) && <View className="flex-row gap-3">{canEdit && <View className="min-w-0 flex-1"><Button compact variant="secondary" onPress={() => productRoute(p.id, 'edit')}>Edit</Button></View>}{canRestock && <View className="min-w-0 flex-1"><Button compact onPress={() => productRoute(p.id, 'restock')}>Restock</Button></View>}</View>}
        </InvCard>;
      })}
      {summary.expired > 0 && <Button compact variant="text" onPress={() => setFilters({ ...filters, status: filters.status === 'expired' ? 'all' : 'expired' })}>{summary.expired + ' products with expired stock'}</Button>}
    </> : <>
      <View style={{ marginTop: tokens.spacing.two, gap: tokens.spacing.three, borderRadius: tokens.radius.card, backgroundColor: tokens.color.royalBlue, padding: tokens.spacing.four }}>
        <InvText bold size={24} color={tokens.color.surfaceCard}>Total Business Asset Value</InvText>
        <View className="flex-row flex-wrap items-end justify-between gap-2">
          <SkeletonMetric loading={preview.loading}><InvText bold size={30} color={tokens.color.surfaceCard}>{formatPesos(assetTotals.total)}</InvText></SkeletonMetric>
          <InvText bold size={14} color={tokens.color.surfaceCard}>{store.assets.length} asset entries</InvText>
        </View>
      </View>
      <View className="flex-row flex-wrap gap-3">{[['Current', assetTotals.current], ['Non-current', assetTotals.equipment + assetTotals.furniture]].map(([label, amount]) => <View key={label} className="min-w-[130px] flex-1"><InvCard><InvText bold size={18} color={tokens.color.textSecondary}>{label}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={24} color={tokens.color.darkNavy}>{formatAssetSummaryPesos(Number(amount))}</InvText></SkeletonMetric></InvCard></View>)}</View>
      <View style={{ borderWidth: 1, borderColor: tokens.color.navigationBorder, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard, paddingHorizontal: tokens.spacing.three, paddingVertical: tokens.spacing.two }}>
        {[["Equipment", assetTotals.equipment], ["Furniture & Fixtures", assetTotals.furniture]].map(([label, amount], index) => <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.two,
          paddingVertical: tokens.spacing.two, borderBottomWidth: index === 0 ? 1 : 0, borderBottomColor: tokens.color.navigationBorder }}>
          <InvText size={14} color={tokens.color.textPrimary}>{label}</InvText>
          <InvText bold size={12} color={tokens.color.darkNavy}>{formatAssetSummaryPesos(Number(amount))}</InvText>
        </View>)}
      </View>
      {!readOnly && <View className="py-3"><Button onPress={() => push({ pathname: '/owner-inventory/asset', params: { mode: 'add' } })}>Add Asset</Button></View>}
      <View testID="business-assets-heading" className="flex-row items-center gap-2"><View className="min-w-0 flex-1"><InvText bold size={24} color={tokens.color.darkNavy}>Business assets</InvText></View>
        <InventoryFilterControl onPress={openFilters} />
      </View><AssetCategoryChips value={assetFilter} onChange={setAssetFilter} />
      {search}
      {preview.loading ? <RecordSkeleton kind="asset" /> : !matchingAssets.length ? emptyList(true) : matchingAssets.map(asset => <AssetCard key={asset.id} asset={asset}
        onEdit={() => push({ pathname: '/owner-inventory/asset', params: { id: asset.id, mode: 'edit' } })} />)}
    </>}
    {preview.control}
    <InventoryFilterSheet visible={filterOpen} draft={draft} onChange={setDraft} onClose={() => setFilterOpen(false)}
      onApply={() => { setFilters({ ...draft }); setFilterOpen(false); }} />
    {canRestock && <InvModal visible={restockOpen} sheet title="Choose a product to restock" onClose={() => setRestockOpen(false)} footer={<Button variant="secondary" onPress={() => setRestockOpen(false)}>Cancel</Button>}>
      <SearchBar label="Search products to restock" placeholder="Search Product..." value={restockQuery} onChangeText={setRestockQuery}
        onClear={() => setRestockQuery('')} clearLabel="Clear restock search" />
      {!restockProducts.length && <InvText>No products match your search.</InvText>}
      {restockProducts.map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={'Restock ' + p.name} onPress={() => { Keyboard.dismiss(); setRestockOpen(false); productRoute(p.id, 'restock'); }} className="min-h-16 gap-1 border-b border-ice-container py-3"><InvText bold color={tokens.color.textPrimary}>{p.name}</InvText><InvText>{productStock(p)} PCS available · {categoryLabels[p.category]}</InvText></Pressable>)}
    </InvModal>}
  </MotionContent></InventoryFrame>;
}
function SkeletonMetric({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return loading ? <Skeleton><LoadingSlot loading>{children}</LoadingSlot></Skeleton> : <>{children}</>;
}

function formatAssetSummaryPesos(centavos: number) {
  const amount = formatPesos(centavos);
  return centavos % 100 === 0 ? amount.slice(0, -3) : amount;
}
