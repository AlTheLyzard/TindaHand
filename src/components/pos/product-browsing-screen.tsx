import { Button } from '@/components/ui/button';
import type { ScrollViewInstance } from 'react-native';
import { MotionRegion, MotionContent } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { DashboardAction } from '@/components/dashboard/dashboard-ui';
import { PosFrame } from '@/components/pos/pos-frame';
import { PaymentPreviewToast } from '@/components/pos/payment-preview-toast';
import { PosChip } from '@/components/pos/pos-chip';
import { AlphabetIndex, alphabetIndexWidth } from '@/components/pos/alphabet-index';
import { PosIcon } from '@/components/pos/pos-icon';
import { ProductTile } from '@/components/pos/product-tile';
import { posCategories } from '@/data/pos';
import { useInventory } from '@/state/inventory';
import { useTranslation } from '@/i18n/use-translation';
import { usePos } from '@/state/pos';
import type { OwnerIdentity } from '@/types/auth';
import type { ProductCategory } from '@/types/pos';
import { formatPesos } from '@/utils/dashboard';
import { filterProducts, selectionSummary } from '@/utils/pos';
import { EmptyState, listPreviewStates, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import { usePosMetrics } from './pos-metrics';
import { useMotionReduced } from '@/state/motion';
import { currentAlphabetSection } from '@/utils/alphabet-index';

export function ProductBrowsingScreen({ owner }: { owner: OwnerIdentity }) {
  const push = usePushOnce();
  const metrics = usePosMetrics();
  const { preview: previewControl } = useLocalSearchParams<{ preview?: string }>();
  const { store: { products: liveProducts } } = useInventory();
  const preview = useContentPreview(listPreviewStates);
  const products = preview.empty ? [] : liveProducts;
  const { t } = useTranslation();
  const scroll = useRef<ScrollViewInstance>(null);
  const categoriesScroll = useRef<ScrollViewInstance>(null);
  const sectionOffsets = useRef<Record<string, number>>({});
  const categoryOffsets = useRef<Record<string, number>>({});
  const [categorySnaps, setCategorySnaps] = useState<number[]>([]);
  const gridOffset = useRef(0);
  const gridStart = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const contentHeight = useRef(0);
  const indexSeek = useRef<{ letter: string | null; offset: number } | null>(null);
  const reduceMotion = useMotionReduced();
  const { fontScale } = useWindowDimensions();
  const searchHeight = Math.max(48, Math.ceil(fontScale * 18) + 16);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const { selection, add } = usePos();
  const visible = preview.mode === 'search' || preview.mode === 'filtered' ? [] : filterProducts(products, query, category, null);
  const letters = [...new Set(visible.map(product => product.name.charAt(0).toUpperCase()))];
  const currentLetter = letters.includes(activeLetter ?? '') ? activeLetter : letters[0] ?? null;
  const summary = selectionSummary(selection);
  const suggestions = !preview.loading && focused && query.trim() ? visible.slice(0, 3) : [];
  function updateActiveLetter(offset = scrollY.value) {
    if (indexSeek.current) {
      if (Math.abs(offset - indexSeek.current.offset) > 1) {
        setActiveLetter(indexSeek.current.letter);
        return;
      }
      indexSeek.current = null;
    }
    const next = currentAlphabetSection(letters, sectionOffsets.current, gridOffset.current, offset, viewportHeight.value, contentHeight.current);
    setActiveLetter(previous => previous === next ? previous : next);
  }
  function resetPosition() {
    indexSeek.current = null;
    setActiveLetter(null);
    scrollY.value = 0;
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function changeQuery(value: string) { resetPosition(); setQuery(value); }
  function recordSectionOffset(letter: string, offset: number) {
    sectionOffsets.current[letter] = offset;
    updateActiveLetter();
  }
  const reset = () => { preview.reset(); setQuery(''); setCategory(null); resetPosition(); categoriesScroll.current?.scrollTo({ x: 0, animated: false }); };
  const jumpTo = (letter: string | null, dragging = false) => {
    setActiveLetter(letter);
    Keyboard.dismiss();
    const target = letter ? gridOffset.current + (sectionOffsets.current[letter] ?? 0) : 0;
    const offset = Math.min(target, Math.max(0, contentHeight.current - viewportHeight.value));
    indexSeek.current = Math.abs(scrollY.value - offset) > 1 ? { letter, offset } : null;
    scroll.current?.scrollTo({ y: offset, animated: !reduceMotion && !dragging });
  };

  return <PosFrame owner={owner} step="select" onPos={() => { Keyboard.dismiss(); scroll.current?.scrollTo({ y: 0, animated: !reduceMotion }); }}>
    <PaymentPreviewToast />
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] flex-1 self-center">
        <View className="flex-1" onLayout={event => { viewportHeight.value = event.nativeEvent.layout.height; updateActiveLetter(); }}>
        <ScrollView ref={scroll} testID="pos-product-list" alwaysBounceVertical={false} contentInsetAdjustmentBehavior="never"
          onContentSizeChange={(_width, height) => { contentHeight.current = height; updateActiveLetter(); }}
          onTouchStart={() => { indexSeek.current = null; }} onScrollBeginDrag={() => { indexSeek.current = null; }} onScroll={event => {
          const offset = event.nativeEvent.contentOffset.y;
          scrollY.value = offset;
          updateActiveLetter(offset);
        }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: metrics.gutter, paddingBottom: 12 }}>
          {__DEV__ && previewControl === 'controls' && preview.control}
          <View className="relative z-20">
          <View className="flex-row items-center rounded-control border border-[#D9E7F4] bg-white px-3" style={{ minHeight: searchHeight + 2, boxShadow: '0px 2px 3px #ADC9EE' }}>
            <View accessible={false} style={{ width: 15, height: 15, borderWidth: 2, borderColor: '#4A607A', borderRadius: 8, marginRight: 10 }}><View style={{ position: 'absolute', width: 7, height: 2, backgroundColor: '#4A607A', right: -5, bottom: -3, transform: [{ rotate: '45deg' }] }} /></View>
            <TextInput accessibilityLabel={t('pos.search')} placeholder={t('pos.searchPlaceholder')} value={query} onChangeText={changeQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} placeholderTextColor="#4A607A" style={{ height: searchHeight, paddingVertical: 8 }} className="min-w-0 flex-1 font-poppins text-[12px] leading-[18px] text-brand web:focus:outline-none" />
            <View className="w-12 items-center justify-center" style={{ height: searchHeight }}>{!!query && <DashboardAction label={t('pos.clearSearch')} onPress={() => changeQuery('')}><PosIcon name="close" size={20} color="#245399" /></DashboardAction>}</View>
          </View>
          {suggestions.length > 0 && <MotionRegion className="absolute left-0 right-0 z-30 rounded-control border border-[#D9E7F4] bg-white" style={{ top: searchHeight + 6, boxShadow: '0 3px 6px #112F6F30' }}>
            {suggestions.map(product => <Pressable key={product.id} accessibilityRole="button" onPress={() => { changeQuery(product.name); setFocused(false); Keyboard.dismiss(); }} className="min-h-12 justify-center px-3"><Text className="font-poppins text-[12px] text-brand">{product.name}</Text></Pressable>)}
          </MotionRegion>}
          </View>
          <ScrollView ref={categoriesScroll} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" decelerationRate="fast" snapToOffsets={categorySnaps} contentContainerStyle={{ gap: 8, paddingHorizontal: 8, paddingVertical: 2, alignItems: 'center' }} style={{ flexGrow: 0, marginHorizontal: -8 }}
            onContentSizeChange={() => setCategorySnaps(Object.values(categoryOffsets.current).map(value => Math.max(0, value - 8)).sort((a, b) => a - b))}>
            {([null, ...posCategories] as const).map(value => <View key={value ?? 'all'} style={{ flexShrink: 0 }} onLayout={event => {
              categoryOffsets.current[value ?? 'all'] = event.nativeEvent.layout.x;
              const next = Object.values(categoryOffsets.current).map(x => Math.max(0, x - 8)).sort((a, b) => a - b);
              setCategorySnaps(previous => previous.length === next.length && previous.every((x, index) => x === next[index]) ? previous : next);
            }}><PosChip selected={category === value} onPress={() => { resetPosition(); setCategory(value); categoriesScroll.current?.scrollTo({ x: Math.max(0, (categoryOffsets.current[value ?? 'all'] ?? 8) - 8), animated: !reduceMotion }); }} label={value ? t(`pos.category.${value}`) : t('pos.all')} /></View>)}
          </ScrollView>
          <View className="relative mb-5 mt-3 flex-row items-center justify-between gap-2">
            <Text accessibilityRole="header" className="font-poppins-bold text-[16px] text-[#102342]">{t('pos.products')}</Text>
            {(!!query || !!category) && <View className="absolute -top-3 right-20"><Button variant="text" fullWidth={false} compact accessibilityLabel={t('pos.reset')} onPress={reset}>{t('pos.resetShort')}</Button></View>}
            <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[10px] text-text-secondary">{preview.loading ? 'Loading products' : t(visible.length === 1 ? 'pos.productCountOne' : 'pos.productCount', { count: visible.length })}</Text>
          </View>
          <View className="flex-row" style={{ paddingRight: Math.max(0, alphabetIndexWidth - metrics.gutter) }} onLayout={event => { gridOffset.current = event.nativeEvent.layout.y; gridStart.value = event.nativeEvent.layout.y; updateActiveLetter(); }}>
            <View className="flex-1">
              {preview.loading ? <RecordSkeleton kind="catalog" /> : visible.length === 0 ? <EmptyState icon={products.length ? 'search' : 'inventory'}
                title={!products.length ? 'No products yet' : preview.mode === 'search' || (preview.mode !== 'filtered' && query.trim()) ? 'No products match your search' : 'No products in this category'}
                description={!products.length ? 'Add a product in Inventory before starting an order.' : 'Try another name or reset search and category.'}
                action={!products.length ? 'Open Inventory' : 'Reset search and category'} onAction={() => { if (products.length) reset(); else { preview.reset(); router.navigate('/owner-inventory'); } }} /> : letters.map((initial, index) => <ProductSection key={initial} letter={initial} last={index === letters.length - 1} onMeasure={recordSectionOffset}>
                <Text accessibilityRole="header" className="mb-2 font-poppins-bold text-[12px] text-[#102342]">{initial}</Text>
                <View className="flex-row flex-wrap gap-y-4" style={{ marginHorizontal: -metrics.columnGap / 2 }}>
                  {visible.filter(product => product.name.charAt(0).toUpperCase() === initial).map(product => <View key={product.id} style={{ width: '50%', paddingHorizontal: metrics.columnGap / 2 }}>
                    <ProductTile product={product} quantity={selection[product.id]?.quantity ?? 0} onAdd={add} />
                  </View>)}
                </View>
              </ProductSection>)}
            </View>
          </View>
        </ScrollView>
        {!preview.loading && <AlphabetIndex letters={letters} active={currentLetter} onPick={jumpTo} gridStart={gridStart} scrollY={scrollY} viewportHeight={viewportHeight} />}
        </View>
      </MotionContent>
      <View testID="pos-cart-sheet" className="w-full justify-center rounded-t-[14px] border border-[#ADC9EE] bg-white py-3" style={{ minHeight: metrics.sheetHeight }}>
        <View className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.sheetPadding }}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1" accessibilityLiveRegion="polite"><Text className="font-poppins text-[10px] leading-[14px] text-text-secondary">{summary.quantity} {summary.quantity === 1 ? 'Item' : 'Items'} | Total:</Text><Text testID="pos-cart-total" className="font-poppins-bold text-[24px] leading-[45px] text-brand">{formatPesos(summary.totalCentavos)}</Text></View>
            <Pressable testID="pos-view-cart" accessibilityRole="button" accessibilityLabel={`${t('pos.viewCart')} →`} onPress={() => { Keyboard.dismiss(); push('/owner-pos/cart'); }} className="min-h-12 min-w-12 flex-row items-center justify-center gap-2 py-2 pl-3">
              <Text testID="pos-view-cart-label" className="font-poppins-bold text-[14px] leading-[21px] text-[#245399]">{t('pos.viewCart')}</Text>
              <View testID="pos-view-cart-arrow" accessible={false} style={{ transform: [{ rotate: '180deg' }] }}><PosIcon name="back" size={20} color="#245399" /></View>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </PosFrame>;
}

function ProductSection({ letter, last, onMeasure, children }: {
  letter: string; last: boolean; onMeasure: (letter: string, offset: number) => void; children: ReactNode;
}) {
  return <View testID={`pos-section-${letter}`} style={{ marginBottom: last ? 0 : 24 }}
    onLayout={event => onMeasure(letter, event.nativeEvent.layout.y)}>{children}</View>;
}
