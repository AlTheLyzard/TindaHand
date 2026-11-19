import { KeyboardInput as TextInput } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionContent } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, View, useWindowDimensions } from 'react-native';
import { Button, IconButton } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import { AssetCard } from './asset-card';
import { AssetCategoryChips } from './asset-category-chips';
import { InvCard, InventoryFrame, InvModal, InvSelect, InvText } from './inventory-ui';
import { InventoryFilterControl } from './inventory-filter-control';
import { SegmentedSelector } from '@/components/ui/segmented-selector';
import { useInventory } from '@/state/inventory';
import type { InventoryFilters } from '@/types/inventory';
import { categoryLabels, defaultFilters } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { EmptyState, LoadingSlot, Skeleton, listPreviewStates, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import tokens from '@/constants/design-tokens.json';
import { inventoryStatusAppearance } from './inventory-status';
import { ProductInventoryContent } from './product-inventory-content';

const sorting = { stockDesc: 'High-to-Low Stock', stockAsc: 'Low-to-High Stock', fast: 'Fast-selling', slow: 'Slow-selling', expiry: 'Expiring Soon' } as const;
const statuses = { good: 'In Stock', low: 'Low Stock', out: 'Out of Stock' } as const;

/** Owner inventory shell. The shared product flow is independent of Assets. */
export function InventoryScreen() {
  const { tab, status: routeStatus } = useLocalSearchParams<{ tab?: string; status?: string }>();
  const { store: liveStore } = useInventory();
  const { fontScale } = useWindowDimensions();
  const preview = useContentPreview(listPreviewStates);
  const store = preview.empty ? { ...liveStore, assets: [] } : liveStore;
  const [assets, setAssets] = useState(tab === 'assets');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<InventoryFilters>({ ...defaultFilters, status: routeStatus === 'out' || routeStatus === 'low' ? routeStatus : 'all' });
  const [draft, setDraft] = useState<InventoryFilters>({ ...defaultFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [assetFilter, setAssetFilter] = useState('all');
  const resultPreview = preview.mode === 'search' || preview.mode === 'filtered';
  const matchingAssets = resultPreview ? [] : store.assets.filter(asset => asset.name.toLowerCase().includes(query.trim().toLowerCase()) && (assetFilter === 'all' || asset.classification === assetFilter));
  const assetTotals = store.assets.reduce((sum, asset) => ({ ...sum, total: sum.total + asset.valueCentavos, [asset.classification]: sum[asset.classification] + asset.valueCentavos }), { total: 0, current: 0, equipment: 0, furniture: 0 });

  function resetResults() { preview.reset(); setQuery(''); setFilters({ ...defaultFilters }); setAssetFilter('all'); }
  function openFilters() { Keyboard.dismiss(); setDraft({ ...filters }); setFilterOpen(true); }
  const search = <View className="min-h-12 flex-row items-center gap-2 rounded-control border border-[#E2EDF9] bg-white px-3" style={{ boxShadow: 'inset 0 2px 3px #D9E7F4' }}>
    <PosIcon name="search" size={18} /><TextInput accessibilityLabel="Search assets" placeholder="Search Assets" placeholderTextColor={tokens.color.textSecondary} underlineColorAndroid="transparent" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} className="min-w-0 flex-1 font-poppins text-[12px]" style={{ minHeight: Math.max(tokens.size.touchTarget, Math.ceil(fontScale * 18) + 24), paddingVertical: 12, textAlignVertical: 'center', color: tokens.color.textPrimary, opacity: 1 }} />
    {!!query && <IconButton accessibilityLabel="Clear search" onPress={() => setQuery('')} icon={props => <PosIcon name="close" {...props} />} />}
  </View>;
  const emptyAssets = <EmptyState icon={query.trim() ? 'search' : 'inventory'}
    title={!store.assets.length ? 'No assets yet' : query.trim() ? 'No assets match your search' : 'No assets in this filter'}
    description={!store.assets.length ? 'Add your first business asset to track its value.' : 'Try another name or reset search and filters.'}
    action={!store.assets.length ? 'Add Asset' : 'Reset search and filters'}
    onAction={() => { if (store.assets.length) resetResults(); else { preview.reset(); router.push({ pathname: '/owner-inventory/asset', params: { mode: 'add' } }); } }} />;

  return <InventoryFrame title="Inventory" background><MotionContent changeKey={assets + ':' + preview.mode} className="gap-3">
    <SegmentedSelector tone="subtle" options={[{ label: 'Products', value: 'products' }, { label: 'Assets', value: 'assets' }]} value={assets ? 'assets' : 'products'} onChange={value => { setAssets(value === 'assets'); setQuery(''); }} />
    <ProductInventoryContent visible={!assets} routeBase="/owner-inventory" initialStatus={routeStatus} animate={false} />
    {assets && <>
      <View className="mt-3 gap-3 rounded-card bg-action p-4"><InvText size={12} color="#FFFFFF">Total business asset value</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={28} color="#FFFFFF">{formatPesos(assetTotals.total)}</InvText></SkeletonMetric><View className="items-end"><InvText bold size={11} color="#FFFFFF">{store.assets.length} asset entries</InvText></View></View>
      <View className="flex-row flex-wrap gap-3">{[['Current assets', assetTotals.current], ['Non-current assets', assetTotals.equipment + assetTotals.furniture]].map(([label, amount]) => <View key={label} className="min-w-[130px] flex-1"><InvCard><InvText>{label}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={18} color="#112F6F">{formatPesos(Number(amount))}</InvText></SkeletonMetric></InvCard></View>)}</View>
      <InvCard>{[['Equipment', assetTotals.equipment], ['Furniture & Fixtures', assetTotals.furniture]].map(([label, amount]) => <View key={label} className="flex-row flex-wrap items-start justify-between gap-3 py-2"><View className="min-w-[120px] flex-1"><InvText color="#102342">{label}</InvText></View><InvText bold color="#112F6F">{formatPesos(Number(amount))}</InvText></View>)}</InvCard>
      <View className="py-3"><Button onPress={() => router.push({ pathname: '/owner-inventory/asset', params: { mode: 'add' } })}>Add Asset</Button></View>
      <View testID="business-assets-heading" className="flex-row items-center gap-2"><View className="min-w-0 flex-1"><InvText bold color="#112F6F">Business assets</InvText></View><InventoryFilterControl onPress={openFilters} /></View>
      <AssetCategoryChips value={assetFilter} onChange={setAssetFilter} />
      {search}
      {preview.loading ? <RecordSkeleton kind="asset" /> : !matchingAssets.length ? emptyAssets : matchingAssets.map(asset => <AssetCard key={asset.id} asset={asset}
        onEdit={() => router.push({ pathname: '/owner-inventory/asset', params: { id: asset.id, mode: 'edit' } })} />)}
      {preview.control}
    </>}
    <InvModal visible={assets && filterOpen} sheet title="Sort & Filter" subtitle="Choose how to sort and filter your products." onClose={() => setFilterOpen(false)} footer={<View className="flex-row gap-3"><View className="flex-1"><Button compact variant="secondary" onPress={() => setDraft({ ...defaultFilters })}>Reset</Button></View><View className="flex-[2]"><Button compact onPress={() => { setFilters({ ...draft }); setFilterOpen(false); }}>Apply Filter</Button></View></View>}>
      <InvSelect key={String(filterOpen)} anchored label="Category" value={draft.category} options={{ all: 'All Categories', ...categoryLabels }} onChange={category => setDraft({ ...draft, category })} />
      {Object.entries(sorting).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === key }} aria-checked={draft.sort === key} onPress={() => setDraft({ ...draft, sort: key as InventoryFilters['sort'] })} className="min-h-12 flex-row items-center gap-3 rounded-control bg-white px-3 py-3" style={{ boxShadow: '0 2px 3px #00000030' }}><InvText size={22} color="#245399">{draft.sort === key ? '◉' : '○'}</InvText><InvText color="#102342">{label}</InvText></Pressable>)}
      <InvText bold color="#112F6F">Stock Status</InvText><View className="flex-row flex-wrap gap-2">{Object.entries(statuses).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: draft.status === key }} aria-checked={draft.status === key} onPress={() => setDraft({ ...draft, status: draft.status === key ? 'all' : key as InventoryFilters['status'] })} className="min-h-12 min-w-[88px] flex-1 flex-row items-center justify-center gap-1 rounded-control border p-2" style={inventoryStatusAppearance(key)}><InvText color={inventoryStatusAppearance(key).color}>{draft.status === key ? '◉' : '○'}</InvText><View className="min-w-0 flex-shrink"><InvText size={11} color={inventoryStatusAppearance(key).color}>{label}</InvText></View></Pressable>)}</View>
      {(draft.status === 'expired' || draft.status === 'nearExpiry') && <Button compact variant="text" onPress={() => setDraft({ ...draft, status: 'all' })}>{'Clear ' + (draft.status === 'expired' ? 'expired' : 'nearing expiry') + ' alert filter'}</Button>}
    </InvModal>
  </MotionContent></InventoryFrame>;
}

function SkeletonMetric({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return loading ? <Skeleton><LoadingSlot loading>{children}</LoadingSlot></Skeleton> : <>{children}</>;
}
