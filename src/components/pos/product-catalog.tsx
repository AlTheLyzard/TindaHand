import { KeyboardAwareScrollView as ScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { SearchBar } from '@/components/ui/search-bar';
import { Button, IconButton } from '@/components/ui/button';
import { MotionContent, MotionRegion } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { Keyboard, Text, View, type ScrollViewInstance } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { AlphabetIndex, alphabetIndexWidth } from './alphabet-index';
import { PosChip } from './pos-chip';
import { PosFilterSheet } from './pos-filter-sheet';
import { PosIcon } from './pos-icon';
import { ProductTile } from './product-tile';
import { usePosMetrics } from './pos-metrics';
import { posCategories } from '@/data/pos';
import { useTranslation } from '@/i18n/use-translation';
import { useMotionReduced } from '@/state/motion';
import type { PosCatalogFilters, PosProduct, ProductCategory, ProductSelection } from '@/types/pos';
import { defaultPosCatalogFilters, filterPosCatalogProducts, filterProducts, hasPosCatalogFilters } from '@/utils/pos';
import { currentAlphabetSection } from '@/utils/alphabet-index';
import { EmptyState, type PreviewState } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';

export type ProductCatalogHandle = { scrollToTop: () => void };
const ready = { mode: 'ready' as const, loading: false, reset() {} };
const categoryEdgePadding = 16;

/** Shared POS/debt catalog; all selection state and commits belong to the caller. */
export function ProductCatalog({ products, selection, onAdd, onOpenInventory, preview = ready, control, searchPlaceholder, showFilter = false, ref }: {
  products: readonly PosProduct[]; selection: ProductSelection; onAdd: (id: string) => void;
  onOpenInventory?: () => void; preview?: { mode: PreviewState; loading: boolean; reset: () => void }; control?: ReactNode; searchPlaceholder?: string; showFilter?: boolean; ref?: Ref<ProductCatalogHandle>;
}) {
  const metrics = usePosMetrics();
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
  const indexSeek = useRef<{ letter: string | null; offset: number; arrived: boolean } | null>(null);
  const reduceMotion = useMotionReduced();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState<ProductCategory | null>(null);
  const [catalogFilters, setCatalogFilters] = useState<PosCatalogFilters>(defaultPosCatalogFilters);
  const [catalogDraft, setCatalogDraft] = useState<PosCatalogFilters>(defaultPosCatalogFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const visible = preview.mode === 'search' || preview.mode === 'filtered' ? [] : showFilter
    ? filterPosCatalogProducts(products, query, catalogFilters)
    : filterProducts(products, query, category, null);
  const letters = [...new Set(visible.map(product => product.name.charAt(0).toUpperCase()))];
  const currentLetter = letters.includes(activeLetter ?? '') ? activeLetter : letters[0] ?? null;
  const suggestions = !preview.loading && focused && query.trim() ? visible.slice(0, 3) : [];
  function updateActiveLetter(offset = scrollY.value) {
    if (indexSeek.current) {
      // Adjacent short sections can share the clamped bottom offset. Retain the
      // requested letter at rest, then resume tracking when the list moves again.
      const arrived = Math.abs(offset - indexSeek.current.offset) <= 1;
      if (!indexSeek.current.arrived || arrived) {
        indexSeek.current.arrived = arrived;
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
  useImperativeHandle(ref, () => ({ scrollToTop() { scroll.current?.scrollTo({ y: 0, animated: !reduceMotion }); } }), [reduceMotion]);
  const reset = () => { preview.reset(); setQuery(''); setCategory(null); setCatalogFilters(defaultPosCatalogFilters); resetPosition(); categoriesScroll.current?.scrollTo({ x: 0, animated: false }); };
  const hasFilters = showFilter ? hasPosCatalogFilters(catalogFilters) : !!category;
  const jumpTo = (letter: string | null, dragging = false) => {
    if (letter && (!letters.includes(letter) || sectionOffsets.current[letter] === undefined)) return;
    setActiveLetter(letter);
    Keyboard.dismiss();
    const target = letter ? gridOffset.current + (sectionOffsets.current[letter] ?? 0) : 0;
    const offset = Math.min(target, Math.max(0, contentHeight.current - viewportHeight.value));
    indexSeek.current = { letter, offset, arrived: Math.abs(scrollY.value - offset) <= 1 };
    scroll.current?.scrollTo({ y: offset, animated: !reduceMotion && !dragging });
  };

  return <>
    <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] flex-1 self-center">
        <View className="flex-1" onLayout={event => { viewportHeight.value = event.nativeEvent.layout.height; updateActiveLetter(); }}>
        <ScrollView ref={scroll} testID="pos-product-list" alwaysBounceVertical={false} contentInsetAdjustmentBehavior="never"
          onContentSizeChange={(_width, height) => { contentHeight.current = height; updateActiveLetter(); }}
          onTouchStart={() => { indexSeek.current = null; }} onScrollBeginDrag={() => { indexSeek.current = null; }} onScroll={event => {
          const offset = event.nativeEvent.contentOffset.y;
          scrollY.value = offset;
          updateActiveLetter(offset);
        }} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingLeft: metrics.gutter, paddingBottom: 12 }}>
          {control ? <View style={{ marginRight: alphabetIndexWidth }}>{control}</View> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: alphabetIndexWidth }}>
            <SearchBar containerStyle={{ flex: 1 }} label={t('pos.search')} placeholder={searchPlaceholder ?? t('pos.searchPlaceholder')}
              value={query} onChangeText={changeQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              onSubmitEditing={Keyboard.dismiss} onClear={() => changeQuery('')} clearLabel={t('pos.clearSearch')}
              results={suggestions.length > 0 ? <MotionRegion>
                {suggestions.map(product => <Pressable key={product.id} accessibilityRole="button" onPress={() => { changeQuery(product.name); setFocused(false); Keyboard.dismiss(); }} className="min-h-12 justify-center px-3"><Text className="type-micro-caption text-brand">{product.name}</Text></Pressable>)}
              </MotionRegion> : undefined} />
            {showFilter && <IconButton testID="pos-open-filters" accessibilityLabel={hasFilters ? 'Filter products, filters applied' : 'Filter products'}
              accessibilityState={{ expanded: filterOpen, selected: hasFilters }} onPress={() => { Keyboard.dismiss(); setCatalogDraft(catalogFilters); setFilterOpen(true); }}
              icon={({ color }) => <PosIcon name="filter" size={24} color={color} />} />}
          </View>
          {!showFilter && <ScrollView ref={categoriesScroll} horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" decelerationRate="fast" snapToOffsets={categorySnaps} contentContainerStyle={{ gap: 8, paddingHorizontal: categoryEdgePadding, paddingVertical: 8, alignItems: 'center' }} style={{ flexGrow: 0, marginLeft: -metrics.gutter, overflow: 'visible' }}
            onContentSizeChange={() => setCategorySnaps(Object.values(categoryOffsets.current).map(value => Math.max(0, value - categoryEdgePadding)).sort((a, b) => a - b))}>
            {([null, ...posCategories] as const).map(value => <View key={value ?? 'all'} style={{ flexShrink: 0 }} onLayout={event => {
              categoryOffsets.current[value ?? 'all'] = event.nativeEvent.layout.x;
              const next = Object.values(categoryOffsets.current).map(x => Math.max(0, x - categoryEdgePadding)).sort((a, b) => a - b);
              setCategorySnaps(previous => previous.length === next.length && previous.every((x, index) => x === next[index]) ? previous : next);
            }}><PosChip selected={category === value} onPress={() => { resetPosition(); setCategory(value); categoriesScroll.current?.scrollTo({ x: Math.max(0, (categoryOffsets.current[value ?? 'all'] ?? categoryEdgePadding) - categoryEdgePadding), animated: !reduceMotion }); }} label={value ? t(`pos.category.${value}`) : t('pos.all')} /></View>)}
          </ScrollView>}
          <View className="relative mb-5 mt-3 flex-row items-center justify-between gap-2" style={{ marginRight: alphabetIndexWidth }} onLayout={event => { gridStart.value = event.nativeEvent.layout.y; }}>
            <Text accessibilityRole="header" className=" type-list-financial text-text-primary">{t('pos.products')}</Text>
            <View className="min-w-0 flex-row items-center gap-1">
              {(!!query || hasFilters) && <Button variant="text" fullWidth={false} compact accessibilityLabel={t('pos.reset')} onPress={reset}>{t('pos.resetShort')}</Button>}
              <Text accessibilityLiveRegion="polite" className=" type-helper text-text-secondary">{preview.loading ? 'Loading products' : t(visible.length === 1 ? 'pos.productCountOne' : 'pos.productCount', { count: visible.length })}</Text>
            </View>
          </View>
          <View className="flex-row" style={{ marginRight: alphabetIndexWidth }} onLayout={event => { gridOffset.current = event.nativeEvent.layout.y; updateActiveLetter(); }}>
            <View className="flex-1">
              {preview.loading ? <RecordSkeleton kind="catalog" /> : visible.length === 0 ? <EmptyState icon={products.length ? 'search' : 'inventory'}
                title={!products.length ? 'No products yet' : preview.mode === 'search' || (preview.mode !== 'filtered' && query.trim()) ? 'No products match your search' : showFilter ? 'No products match these filters' : 'No products in this category'}
                description={!products.length ? 'Add a product in Inventory before starting an order.' : showFilter ? 'Try another name or reset the search and filters.' : 'Try another name or reset search and category.'}
                action={!products.length ? onOpenInventory ? 'Open Inventory' : undefined : showFilter ? 'Reset search and filters' : 'Reset search and category'} onAction={() => { if (products.length) reset(); else onOpenInventory?.(); }} /> : letters.map((initial, index) => <ProductSection key={initial} letter={initial} last={index === letters.length - 1} onMeasure={recordSectionOffset}>
                <Text accessibilityRole="header" className="mb-2 type-label-nav text-text-primary">{initial}</Text>
                <View className="flex-row flex-wrap gap-y-4" style={{ marginHorizontal: -metrics.columnGap / 2 }}>
                  {visible.filter(product => product.name.charAt(0).toUpperCase() === initial).map(product => <View key={product.id} style={{ width: '50%', paddingHorizontal: metrics.columnGap / 2 }}>
                    <ProductTile product={product} quantity={selection[product.id]?.quantity ?? 0} onAdd={onAdd} />
                  </View>)}
                </View>
              </ProductSection>)}
            </View>
          </View>
        </ScrollView>
        {!preview.loading && <AlphabetIndex letters={letters} active={currentLetter} onPick={jumpTo} gridStart={gridStart} viewportHeight={viewportHeight} />}
        </View>
    </MotionContent>
    {showFilter && <PosFilterSheet visible={filterOpen} filters={catalogDraft} onChange={setCatalogDraft} onClose={() => setFilterOpen(false)}
      onApply={next => { setCatalogFilters(next); resetPosition(); }} />}
  </>;
}

function ProductSection({ letter, last, onMeasure, children }: {
  letter: string; last: boolean; onMeasure: (letter: string, offset: number) => void; children: ReactNode;
}) {
  return <View testID={`pos-section-${letter}`} style={{ marginBottom: last ? 0 : 24 }}
    onLayout={event => onMeasure(letter, event.nativeEvent.layout.y)}>{children}</View>;
}
