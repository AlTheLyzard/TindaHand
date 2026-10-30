import { MotionContent, MotionRegion } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useTranslation } from '@/i18n/use-translation';
import { t } from '@/i18n';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Keyboard, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';
import { InvCard, InvChip, InvDanger, InventoryFrame, InvModal, InvText } from './inventory-ui';
import { getInventorySales } from '@/services/inventory';
import { useInventory } from '@/state/inventory';
import type { InventoryFilters } from '@/types/inventory';
import { assetLabels, categoryLabels, defaultFilters, expiryStatus, filterInventory, inventorySummary, sortLabels, stockLabels, stockStatus, todayInManila } from '@/utils/inventory';
import { formatPesos } from '@/utils/dashboard';
import { EmptyState, LoadingSlot, Skeleton, listPreviewStates, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

export function InventoryScreen() {
  const push = usePushOnce();
  useTranslation();
  const { tab, status: routeStatus } = useLocalSearchParams<{ tab?: string; status?: string }>();
  const { store: liveStore } = useInventory();
  const preview = useContentPreview(listPreviewStates);
  const store = preview.empty ? { ...liveStore, products: [], assets: [] } : liveStore;
  const [assets, setAssets] = useState(tab === 'assets');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>({ ...defaultFilters, status: routeStatus === 'out' || routeStatus === 'low' ? routeStatus : 'all' });
  const [draft, setDraft] = useState<InventoryFilters>({ ...defaultFilters });
  const [filterOpen, setFilterOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);
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
  const emptyList = (isAsset: boolean) => <EmptyState icon={searching ? 'search' : 'inventory'}
    title={!(isAsset ? store.assets.length : store.products.length) ? isAsset ? 'No assets yet' : 'No products yet' : searching ? isAsset ? 'No assets match your search' : 'No products match your search' : isAsset ? 'No assets in this filter' : 'No products in these filters'}
    description={!(isAsset ? store.assets.length : store.products.length) ? isAsset ? 'Add your first business asset to track its value.' : 'Add your first product to start tracking stock.' : searching ? 'Try another name or reset search and filters.' : 'Change or reset your filters to see more records.'}
    action={!(isAsset ? store.assets.length : store.products.length) ? isAsset ? 'Add Asset' : 'Add Product' : 'Reset search and filters'}
    onAction={() => { if ((isAsset ? store.assets.length : store.products.length)) resetResults(); else { preview.reset(); push(isAsset ? { pathname: '/owner-inventory/asset', params: { mode: 'add' } } : { pathname: '/owner-inventory/product', params: { mode: 'add' } }); } }} />;
  const productRoute = (id: string, mode: string) => push({ pathname: '/owner-inventory/product', params: { id, mode } });
  const statusColor = (status: string) => status === 'good' ? { color: '#1D5D21', backgroundColor: '#E8F5E9', borderColor: '#36833C' } : ['out', 'expired'].includes(status) ? { color: '#972020', backgroundColor: '#FFEBEE', borderColor: '#D32F2F' } : { color: '#805000', backgroundColor: '#FFF8E1', borderColor: '#F9A825' };
  return <InventoryFrame title={t("inventory.inventory")}><MotionContent changeKey={`${assets}:${preview.mode}`} className="gap-4">
    {preview.control}
    <View className="min-h-12 flex-row items-center gap-3 rounded-control bg-white px-3" style={{ boxShadow: '0 3px 3px #B0C8E3' }}><PosIcon name="search" size={20} /><TextInput accessibilityLabel={assets ? t("inventory.search.assets") : t("inventory.search.products")} placeholder={assets ? t("inventory.search.assets2") : t("inventory.search.products2")} value={query} onChangeText={setQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCapitalize="none" autoCorrect={false} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} className="min-h-12 min-w-0 flex-1 font-poppins text-[12px] text-brand" />{!!query && <Pressable accessibilityRole="button" accessibilityLabel={t("inventory.clear.search")} onPress={() => setQuery('')} className="min-h-12 min-w-12 items-center justify-center"><PosIcon name="close" size={18} /></Pressable>}</View>
    {suggestions.length > 0 && <MotionRegion><InvCard>{suggestions.map(p => <Pressable key={p.id} accessibilityRole="button" onPress={() => { setQuery(p.name); setFocused(false); Keyboard.dismiss(); }} className="min-h-12 justify-center"><InvText>{p.name}</InvText></Pressable>)}</InvCard></MotionRegion>}
    <View className="flex-row gap-1 rounded-surface border-2 border-[#D9E7F4] bg-white p-1">{[[t("inventory.products"), false], [t("inventory.assets"), true]].map(([label, value]) => <Pressable key={String(label)} accessibilityRole="tab" accessibilityState={{ selected: assets === value }} onPress={() => { setAssets(Boolean(value)); setQuery(''); }} className="min-h-12 flex-1 items-center justify-center rounded-control px-2" style={{ backgroundColor: assets === value ? '#245399' : '#FFFFFF' }}><InvText size={16} color={assets === value ? '#FFFFFF' : '#245399'}>{String(label)}</InvText></Pressable>)}</View>
    <InvText size={10}>{t("inventory.demo.records.changes.last.for.this.session")}</InvText>
    {!assets ? <>
      <View className="flex-row flex-wrap justify-between gap-4 rounded-card border border-[#2F6CC9] bg-[#D9E7F4] p-4"><View><InvText bold color="#245399">{t("inventory.total.products")}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={28} color="#245399">{summary.total}</InvText></SkeletonMetric></View><View><InvText bold color="#245399">{t("inventory.total.inventory.value")}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={26} color="#245399">{formatPesos(summary.valueCentavos)}</InvText></SkeletonMetric></View></View>
      <View className="flex-row flex-wrap gap-2">{(['good', 'nearExpiry', 'out', 'low', 'critical', 'expired'] as const).map(status => <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: filters.status === status }} onPress={() => setFilters({ ...filters, status: filters.status === status ? 'all' : status })} className="min-h-12 min-w-[44%] flex-1 justify-center rounded-control border px-2 py-2" style={statusColor(status)}><InvText color={statusColor(status).color}>● {preview.loading ? '…' : status === 'low' ? summary.low + summary.critical : summary[status]} {status === 'nearExpiry' ? t("inventory.nearing.expiry") : status === 'expired' ? t("inventory.expired") : stockLabels[status]}</InvText></Pressable>)}</View>
      <View className="flex-row flex-wrap gap-3"><View className="min-w-[130px] flex-1"><Button onPress={() => push({ pathname: '/owner-inventory/product', params: { mode: 'add' } })}>{t("inventory.add.product")}</Button></View><View className="min-w-[130px] flex-1"><Button disabled={preview.loading || !store.products.length} onPress={() => setRestockOpen(true)}>{t("inventory.restock")}</Button></View></View>
      <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setDraft({ ...filters }); setFilterOpen(true); }} className="min-h-12 flex-row items-center justify-end gap-2"><InvText bold color="#102342">{t("inventory.sort.filter")}</InvText><PosIcon name="filter" /></Pressable>
      {(JSON.stringify(filters) !== JSON.stringify(defaultFilters) || query) && <View className="gap-2"><InvText>{preview.loading ? "Loading" : visible.length} {t("inventory.matching.products")}{sortLabels[filters.sort]}</InvText><Button variant="secondary" onPress={() => { resetResults(); }}>{t("inventory.reset.search.and.filters")}</Button></View>}
      {preview.loading ? <RecordSkeleton kind="product" /> : visible.length === 0 ? emptyList(false) : visible.map(p => { const status = stockStatus(p.stock), expiry = expiryStatus(p.expirationDate, today); return <InvCard key={p.id}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("inventory.view", { name: p.name })} onPress={() => productRoute(p.id, 'details')} className="min-h-12 flex-row items-center gap-3"><View className="h-14 w-14 items-center justify-center overflow-hidden rounded-control bg-[#D9E7F4]">{p.photoUri ? <Image source={{ uri: p.photoUri }} style={{ width: 56, height: 56 }} /> : <PosIcon name="image" color="#1D5D21" />}</View><View className="flex-1"><InvText bold size={15} color="#102342">{p.name}</InvText><InvText>{categoryLabels[p.category]}</InvText></View></Pressable>
        <View className="flex-row flex-wrap justify-between gap-2"><InvText bold color="#112F6F">{formatPesos(p.unitPriceCentavos)}</InvText><InvText color="#102342">{p.stock}{t("inventory.pcs")}</InvText></View>
        <View className="self-start rounded border px-2 py-1" style={statusColor(status)}><InvText color={statusColor(status).color}>● {stockLabels[status]}</InvText></View>
        <InvText color={expiry === 'fresh' ? '#4A607A' : statusColor(expiry).color}>{expiry === 'expired' ? t("inventory.expired") : expiry === 'nearExpiry' ? t("inventory.nearing.expiry") : t("inventory.expires")}: {p.expirationDate}</InvText>
        <View className="flex-row flex-wrap gap-2"><View className="min-w-[85px] flex-1"><Button onPress={() => productRoute(p.id, 'restock')}>{t("inventory.restock2")}</Button></View><View className="min-w-[70px] flex-1"><Button variant="secondary" onPress={() => productRoute(p.id, 'edit')}>{t("inventory.edit")}</Button></View><View className="min-w-[70px] flex-1"><InvDanger label={t("inventory.delete")} onPress={() => productRoute(p.id, 'delete')} /></View></View>
      </InvCard>; })}
    </> : <>
      <View className="gap-3 rounded-card bg-action p-4"><InvText color="#FFFFFF">{t("inventory.total.business.asset.value")}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={28} color="#FFFFFF">{formatPesos(assetTotals.total)}</InvText></SkeletonMetric><SkeletonMetric loading={preview.loading}><InvText color="#FFFFFF">{store.assets.length} {t("inventory.asset.entries")}</InvText></SkeletonMetric></View>
      <View className="flex-row flex-wrap gap-3"><View className="min-w-[120px] flex-1"><InvCard><InvText>{t("inventory.current.assets")}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={20} color="#112F6F">{formatPesos(assetTotals.current)}</InvText></SkeletonMetric></InvCard></View><View className="min-w-[120px] flex-1"><InvCard><InvText>{t("inventory.non.current.assets")}</InvText><SkeletonMetric loading={preview.loading}><InvText bold size={20} color="#112F6F">{formatPesos(assetTotals.equipment + assetTotals.furniture)}</InvText></SkeletonMetric></InvCard></View></View>
      <InvCard><SkeletonMetric loading={preview.loading}><InvText>{t("inventory.equipment")}{formatPesos(assetTotals.equipment)}</InvText></SkeletonMetric><SkeletonMetric loading={preview.loading}><InvText>{t("inventory.furniture.fixtures")}{formatPesos(assetTotals.furniture)}</InvText></SkeletonMetric></InvCard>
      <Button onPress={() => push({ pathname: '/owner-inventory/asset', params: { mode: 'add' } })}>{t("inventory.add.asset")}</Button>
      <InvText bold size={18} color="#112F6F">{t("inventory.business.assets")}</InvText><View className="flex-row flex-wrap gap-2">{Object.entries({ all: t("inventory.all"), ...assetLabels }).map(([key, label]) => <InvChip key={key} label={label} selected={assetFilter === key} onPress={() => setAssetFilter(key)} />)}</View>
      {preview.loading ? <RecordSkeleton kind="asset" /> : matchingAssets.length === 0 ? emptyList(true) : matchingAssets.map(a => <InvCard key={a.id}><InvText bold size={20} color="#102342">{a.name}</InvText><InvText>{assetLabels[a.classification]}{a.classification !== 'current' ? t('inventory.nonCurrentSuffix') : ''}</InvText><InvText bold size={20} color="#112F6F">{formatPesos(a.valueCentavos)}</InvText><InvText>{t("inventory.recorded")}{a.recordedDate}</InvText>{a.classification !== 'current' && <InvText>{t("inventory.estimated.useful.life")}{a.usefulLifeYears} {t("inventory.years")}</InvText>}<View className="flex-row gap-3"><View className="flex-1"><Button onPress={() => push({ pathname: '/owner-inventory/asset', params: { id: a.id, mode: 'edit' } })}>{t("inventory.edit")}</Button></View><View className="flex-1"><InvDanger label={t("inventory.delete")} onPress={() => push({ pathname: '/owner-inventory/asset', params: { id: a.id, mode: 'delete' } })} /></View></View></InvCard>)}
    </>}
    <InvModal visible={filterOpen} sheet title={t("inventory.sort.filter2")} onClose={() => setFilterOpen(false)}>
      <InvText>{t("inventory.choose.how.to.arrange.your.products")}</InvText>{Object.entries(sortLabels).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === key }} onPress={() => setDraft({ ...draft, sort: key as InventoryFilters['sort'] })} className="min-h-12 flex-row items-center gap-3 rounded-control bg-white px-4 py-3" style={{ boxShadow: '0 2px 3px #00000030' }}><InvText size={22} color="#245399">{draft.sort === key ? '◉' : '○'}</InvText><InvText color="#102342">{label}</InvText></Pressable>)}
      <InvText bold color="#245399">{t("inventory.categories")}</InvText><View className="flex-row flex-wrap gap-2">{Object.entries({ all: t("inventory.all"), ...categoryLabels }).map(([key, label]) => <InvChip key={key} label={label} selected={draft.category === key} onPress={() => setDraft({ ...draft, category: key })} />)}</View>
      <InvText bold color="#245399">{t("inventory.first.letter")}</InvText><View className="flex-row flex-wrap gap-1">{['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(letter => <InvChip key={letter} label={letter === 'all' ? t("inventory.all") : letter} selected={draft.letter === letter} onPress={() => setDraft({ ...draft, letter })} />)}</View>
      <InvText bold color="#245399">{t("inventory.stock.expiration.status")}</InvText>{Object.entries({ all: t("inventory.all.statuses"), ...stockLabels, low: t("inventory.low.stock.includes.critical"), nearExpiry: t("inventory.nearing.expiry"), expired: t("inventory.expired") }).map(([key, label]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: draft.status === key }} onPress={() => setDraft({ ...draft, status: key as InventoryFilters['status'] })} className="min-h-12 flex-row items-center gap-3 rounded-control border px-4 py-3" style={statusColor(key)}><InvText size={22} color={statusColor(key).color}>{draft.status === key ? '◉' : '○'}</InvText><InvText color={statusColor(key).color}>{label}</InvText></Pressable>)}
      <Button onPress={() => { setFilters({ ...draft }); setFilterOpen(false); }}>{t("inventory.apply")}</Button><Button variant="secondary" onPress={() => setDraft({ ...defaultFilters })}>{t("inventory.reset")}</Button><Button variant="secondary" onPress={() => setFilterOpen(false)}>{t("inventory.cancel")}</Button>
    </InvModal>
    <InvModal visible={restockOpen} title={t("inventory.choose.a.product.to.restock")} onClose={() => setRestockOpen(false)}>{store.products.map(p => <InvChip key={p.id} label={`${p.name} • ${p.stock} PCS`} selected={false} onPress={() => { setRestockOpen(false); productRoute(p.id, 'restock'); }} />)}<Button variant="secondary" onPress={() => setRestockOpen(false)}>{t("inventory.cancel")}</Button></InvModal>
  </MotionContent></InventoryFrame>;
}

function SkeletonMetric({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return loading ? <Skeleton><LoadingSlot loading>{children}</LoadingSlot></Skeleton> : <>{children}</>;
}
