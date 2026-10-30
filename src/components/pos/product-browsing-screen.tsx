import type { ScrollViewInstance } from 'react-native';
import { MotionRegion, MotionContent } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useReducedMotion, useSharedValue } from 'react-native-reanimated';

import { DashboardAction } from '@/components/dashboard/dashboard-ui';
import { PosFrame } from '@/components/pos/pos-frame';
import { PaymentPreviewToast } from '@/components/pos/payment-preview-toast';
import { PosChip } from '@/components/pos/pos-chip';
import { posStyles } from '@/components/pos/pos-styles';
import { AlphabetIndex } from '@/components/pos/alphabet-index';
import { PosIcon } from '@/components/pos/pos-icon';
import { ProductTile } from '@/components/pos/product-tile';
import { posCategories } from '@/data/pos';
import { useInventory } from '@/state/inventory';
import { useDashboardNavigation } from '@/hooks/use-dashboard-navigation';
import { useTranslation } from '@/i18n/use-translation';
import { usePos } from '@/state/pos';
import type { OwnerIdentity } from '@/types/auth';
import type { ProductCategory } from '@/types/pos';
import { formatPesos } from '@/utils/dashboard';
import { cartCountsLabel, filterProducts, selectionSummary } from '@/utils/pos';
import { EmptyState, listPreviewStates, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

export function ProductBrowsingScreen({ owner }: { owner: OwnerIdentity }) {
  const push = usePushOnce();
  const { store: { products: liveProducts } } = useInventory();
  const preview = useContentPreview(listPreviewStates);
  const products = preview.empty ? [] : liveProducts;
  const { t } = useTranslation();
  const navigation = useDashboardNavigation();
  const scroll = useRef<ScrollViewInstance>(null);
  const categoriesScroll = useRef<ScrollViewInstance>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const categoryOffsets = useRef<Record<string, number>>({});
  const [categorySnaps, setCategorySnaps] = useState<number[]>([]);
  const gridOffset = useRef(0);
  const gridStart = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const [listHeight, setListHeight] = useState(0);
  const [lastSectionHeight, setLastSectionHeight] = useState(0);
  const reduceMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const searchHeight = Math.max(48, Math.ceil(fontScale * 18) + 16);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const { selection, add } = usePos();
  const visible = preview.mode === 'search' || preview.mode === 'filtered' ? [] : filterProducts(products, query, category, null);
  const letters = [...new Set(visible.map(product => product.name.charAt(0).toUpperCase()))];
  const summary = selectionSummary(selection);
  const suggestions = !preview.loading && focused && query.trim() ? visible.slice(0, 3) : [];
  const reset = () => { preview.reset(); setQuery(''); setCategory(null); setActiveLetter(null); scroll.current?.scrollTo({ y: 0, animated: false }); categoriesScroll.current?.scrollTo({ x: 0, animated: false }); };
  const jumpTo = (letter: string | null) => {
    setActiveLetter(letter);
    Keyboard.dismiss();
    scroll.current?.scrollTo({ y: letter ? gridOffset.current + (sectionOffsets.current[letter] ?? 0) : 0, animated: !reduceMotion });
  };

  return <PosFrame owner={owner} step="select" expanded={navigation.expanded} onPos={() => { Keyboard.dismiss(); scroll.current?.scrollTo({ y: 0, animated: true }); }}>
    <PaymentPreviewToast />
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] flex-1 self-center">
        <View className="flex-1" onLayout={event => { viewportHeight.value = event.nativeEvent.layout.height; setListHeight(event.nativeEvent.layout.height); }}>
        <ScrollView ref={scroll} onScroll={event => {
          navigation.onScroll(event);
          const offset = event.nativeEvent.contentOffset.y;
          scrollY.value = offset;
          const current = offset < gridOffset.current - 4 ? null : [...letters].reverse().find(value => gridOffset.current + (sectionOffsets.current[value] ?? 0) <= offset + 4) ?? null;
          setActiveLetter(previous => previous === current ? previous : current);
        }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(24, listHeight - lastSectionHeight) }}>
          {preview.control}
          <View className="relative z-20 mb-2">
          <View className="flex-row items-center rounded-control border border-[#D9E7F4] bg-white px-3" style={{ minHeight: searchHeight + 2, boxShadow: '0px 2px 3px #ADC9EE' }}>
            <View accessible={false} style={{ width: 15, height: 15, borderWidth: 2, borderColor: '#4A607A', borderRadius: 8, marginRight: 10 }}><View style={{ position: 'absolute', width: 7, height: 2, backgroundColor: '#4A607A', right: -5, bottom: -3, transform: [{ rotate: '45deg' }] }} /></View>
            <TextInput accessibilityLabel={t('pos.search')} placeholder={t('pos.searchPlaceholder')} value={query} onChangeText={setQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} placeholderTextColor="#4A607A" style={{ height: searchHeight, paddingVertical: 8 }} className="min-w-0 flex-1 font-poppins text-[12px] leading-[18px] text-brand web:focus:outline-none" />
            <View className="w-12 items-center justify-center" style={{ height: searchHeight }}>{!!query && <DashboardAction label={t('pos.clearSearch')} onPress={() => setQuery('')}><PosIcon name="close" size={20} color="#245399" /></DashboardAction>}</View>
          </View>
          {suggestions.length > 0 && <MotionRegion className="absolute left-0 right-0 z-30 rounded-control border border-[#D9E7F4] bg-white" style={{ top: searchHeight + 6, boxShadow: '0 3px 6px #112F6F30' }}>
            {suggestions.map(product => <Pressable key={product.id} accessibilityRole="button" onPress={() => { setQuery(product.name); setFocused(false); Keyboard.dismiss(); }} className="min-h-12 justify-center px-3"><Text className="font-poppins text-[12px] text-brand">{product.name}</Text></Pressable>)}
          </MotionRegion>}
          </View>
          <ScrollView ref={categoriesScroll} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" decelerationRate="fast" snapToOffsets={categorySnaps} contentContainerStyle={{ gap: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }} style={{ flexGrow: 0, marginHorizontal: -8 }}
            onContentSizeChange={() => setCategorySnaps(Object.values(categoryOffsets.current).map(value => Math.max(0, value - 8)).sort((a, b) => a - b))}>
            {([null, ...posCategories] as const).map(value => <View key={value ?? 'all'} style={{ flexShrink: 0 }} onLayout={event => {
              categoryOffsets.current[value ?? 'all'] = event.nativeEvent.layout.x;
              const next = Object.values(categoryOffsets.current).map(x => Math.max(0, x - 8)).sort((a, b) => a - b);
              setCategorySnaps(previous => previous.length === next.length && previous.every((x, index) => x === next[index]) ? previous : next);
            }}><PosChip selected={category === value} onPress={() => { setCategory(value); categoriesScroll.current?.scrollTo({ x: Math.max(0, (categoryOffsets.current[value ?? 'all'] ?? 8) - 8), animated: !reduceMotion }); }} label={value ? t(`pos.category.${value}`) : t('pos.all')} /></View>)}
          </ScrollView>
          <View className="min-h-12 flex-row items-center gap-2">
            <Text className="flex-1 font-poppins text-[10px] text-text-secondary">{t('pos.demo')}</Text>
            <View className="min-h-12 w-12">{(!!query || !!category) && <Pressable accessibilityRole="button" accessibilityLabel={t('pos.reset')} onPress={reset} className="min-h-12 items-center justify-center"><Text className="font-poppins-bold text-[11px] text-action">{t('pos.resetShort')}</Text></Pressable>}</View>
          </View>
          <View className="mb-3 flex-row items-center justify-between gap-2">
            <Text accessibilityRole="header" className="font-poppins-bold text-[16px] text-[#102342]">{t('pos.products')}</Text>
            <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[10px] text-text-secondary">{preview.loading ? 'Loading products' : t(visible.length === 1 ? 'pos.productCountOne' : 'pos.productCount', { count: visible.length })}</Text>
          </View>
          <View className="flex-row pr-7" onLayout={event => { gridOffset.current = event.nativeEvent.layout.y; gridStart.value = event.nativeEvent.layout.y; }}>
            <View className="flex-1">
              {preview.loading ? <RecordSkeleton kind="catalog" /> : visible.length === 0 ? <EmptyState icon={products.length ? 'search' : 'inventory'}
                title={!products.length ? 'No products yet' : preview.mode === 'search' || (preview.mode !== 'filtered' && query.trim()) ? 'No products match your search' : 'No products in this category'}
                description={!products.length ? 'Add a product in Inventory before starting an order.' : 'Try another name or reset search and category.'}
                action={!products.length ? 'Open Inventory' : 'Reset search and category'} onAction={() => { if (products.length) reset(); else { preview.reset(); router.navigate('/owner-inventory'); } }} /> : letters.map(initial => <View key={initial} className="mb-6" onLayout={event => { sectionOffsets.current[initial] = event.nativeEvent.layout.y; if (initial === letters.at(-1)) setLastSectionHeight(event.nativeEvent.layout.height); }}>
                <Text accessibilityRole="header" className="mb-2 font-poppins-bold text-[12px] text-[#102342]">{initial}</Text>
                <View className="flex-row flex-wrap gap-y-4" style={{ marginHorizontal: -4 }}>
                  {visible.filter(product => product.name.startsWith(initial)).map(product => <View key={product.id} style={{ width: '50%', paddingHorizontal: 4 }}>
                    <ProductTile product={product} quantity={selection[product.id]?.quantity ?? 0} onAdd={add} />
                  </View>)}
                </View>
              </View>)}
            </View>
          </View>
        </ScrollView>
        {!preview.loading && <AlphabetIndex letters={letters} active={activeLetter} onPick={jumpTo} gridStart={gridStart} scrollY={scrollY} viewportHeight={viewportHeight} />}
        </View>
        <View className="rounded-t-card bg-white px-5 py-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1" accessibilityLiveRegion="polite"><Text className="font-poppins-bold text-[11px] text-text-secondary">{cartCountsLabel(selection)}</Text><Text className="mt-1 font-poppins-bold text-[16px] text-brand">{formatPesos(summary.totalCentavos)}</Text></View>
            <Pressable accessibilityRole="button" disabled={!summary.quantity} accessibilityState={{ disabled: !summary.quantity }} onPress={() => { Keyboard.dismiss(); push('/owner-pos/cart'); }} className="justify-center bg-action px-5" style={[posStyles.action, { borderColor: '#7399CC', opacity: summary.quantity ? 1 : 0.5 }]}><Text className="text-center font-poppins-bold text-[13px] text-white">{t('pos.viewCart')}</Text></Pressable>
          </View>
        </View>
      </MotionContent>
    </KeyboardAvoidingView>
  </PosFrame>;
}
