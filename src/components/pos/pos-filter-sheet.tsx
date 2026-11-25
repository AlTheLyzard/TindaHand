import { Button } from '@/components/ui/button';
import { DropdownField, type DropdownOption } from '@/components/ui/dropdown-field';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { MotionModal } from '@/components/ui/motion-modal';
import { ResizableSheet } from '@/components/ui/resizable-sheet';
import { InventoryPopover } from '@/components/inventory/inventory-popover';
import { PosIcon } from '@/components/pos/pos-icon';
import { posCategories } from '@/data/pos';
import { useTranslation } from '@/i18n/use-translation';
import tokens from '@/constants/design-tokens.json';
import type { PosCatalogAvailability, PosCatalogFilters, PosCatalogPriceRange, PosCatalogSort, ProductCategory } from '@/types/pos';
import { useRef, useState } from 'react';
import { Keyboard, Text, View, type ViewInstance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const priceOptions: readonly DropdownOption<PosCatalogPriceRange>[] = [
  { value: 'all', label: 'All prices' },
  { value: 'under50', label: 'Pinakamura · ₱0–₱50' },
  { value: '50to100', label: '₱50.01–₱100' },
  { value: 'over100', label: 'Over ₱100' },
];
const sortOptions: readonly DropdownOption<PosCatalogSort>[] = [
  { value: 'default', label: 'Default order' },
  { value: 'az', label: 'A - Z' },
  { value: 'za', label: 'Z - A' },
];
const availabilityOptions: readonly { value: PosCatalogAvailability; label: string }[] = [
  { value: 'inStock', label: 'In Stock' },
  { value: 'lowStock', label: 'Low Stock' },
  { value: 'outOfStock', label: 'Out of Stock' },
];

function SummaryChip({ label, onPress }: { label: string; onPress: () => void }) {
  return <MotionPressable accessibilityRole="button" accessibilityLabel={`Remove ${label} filter`} onPress={onPress}
    style={{ minHeight: tokens.size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12,
      borderRadius: tokens.radius.pill, backgroundColor: '#EDF4FC' }}>
    <Text numberOfLines={1} style={{ maxWidth: 180, fontFamily: tokens.typography.weights.semibold,
      fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight, color: tokens.color.royalBlue }}>{label}</Text>
    <PosIcon name="close" size={18} color={tokens.color.royalBlue} />
  </MotionPressable>;
}

export function PosFilterSheet({ visible, filters, onChange, onClose, onApply }: {
  visible: boolean;
  filters: PosCatalogFilters;
  onChange: (filters: PosCatalogFilters) => void;
  onClose: () => void;
  onApply: (filters: PosCatalogFilters) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [priceOpen, setPriceOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const categoryTrigger = useRef<ViewInstance>(null);
  const priceTrigger = useRef<ViewInstance>(null);
  const sortTrigger = useRef<ViewInstance>(null);
  const categoryOptions: readonly DropdownOption<ProductCategory | 'all'>[] = [
    { value: 'all', label: 'All categories' },
    ...posCategories.map(value => ({ value, label: t(`pos.category.${value}`) })),
  ];

  const draft = filters;
  const update = (changes: Partial<PosCatalogFilters>) => onChange({ ...filters, ...changes });
  const categoryLabel = categoryOptions.find(option => option.value === draft.category)?.label;
  const priceLabel = priceOptions.find(option => option.value === draft.priceRange)?.label;
  const sortLabel = sortOptions.find(option => option.value === draft.sort)?.label;
  const availabilityLabel = availabilityOptions.find(option => option.value === draft.availability)?.label;
  const close = () => {
    Keyboard.dismiss();
    setCategoryOpen(false); setPriceOpen(false); setSortOpen(false);
    onClose();
  };
  const reset = () => {
    setCategoryOpen(false); setPriceOpen(false); setSortOpen(false);
    onChange({ category: 'all', priceRange: 'all', sort: 'az', availability: 'all' });
  };

  return <MotionModal visible={visible} sheet backdropColor={tokens.overlay.navySoft} onHidden={onClose}
    onRequestClose={close}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <ResizableSheet testID="pos-filters" title="Filter Transactions" titleStyle={{
          fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.h2Section.fontSize,
          lineHeight: tokens.typography.h2Section.lineHeight, color: tokens.color.textPrimary,
        }} onClose={close}
          footer={<View style={{ gap: 8, paddingVertical: 12, paddingBottom: insets.bottom + 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}><Button compact variant="text" onPress={reset}>Reset</Button></View>
              <View style={{ flex: 1.6 }}><Button compact textStyle={{ fontFamily: tokens.typography.weights.semibold,
                fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight }}
                onPress={() => { onApply({ ...draft }); close(); }}>Apply Filter</Button></View>
            </View>
          </View>}>
          <View style={{ gap: 20, paddingBottom: 8 }}>
            {(draft.category !== 'all' || draft.priceRange !== 'all' || draft.sort !== 'default' || draft.availability !== 'all') &&
              <View accessibilityLabel="Selected filters" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {draft.category !== 'all' && categoryLabel && <SummaryChip label={categoryLabel} onPress={() => update({ category: 'all' })} />}
                {draft.priceRange !== 'all' && priceLabel && <SummaryChip label={priceLabel} onPress={() => update({ priceRange: 'all' })} />}
                {draft.sort !== 'default' && sortLabel && <SummaryChip label={sortLabel} onPress={() => update({ sort: 'default' })} />}
                {draft.availability !== 'all' && availabilityLabel && <SummaryChip label={availabilityLabel} onPress={() => update({ availability: 'all' })} />}
              </View>}

            <DropdownField label="Product Category" required={false} value={draft.category} options={categoryOptions}
              onChange={category => update({ category })} open={categoryOpen} onOpenChange={setCategoryOpen}
              onBeforeToggle={() => { setPriceOpen(false); setSortOpen(false); }} style={{ zIndex: categoryOpen ? 40 : 10 }}
              triggerRef={categoryTrigger} menuTestID="pos-category-options" optionTestIDPrefix="pos-category-"
              renderMenu={options => <InventoryPopover visible={categoryOpen} anchorRef={categoryTrigger} label="Product category options"
                onClose={() => setCategoryOpen(false)} testID="pos-category-options">{options}</InventoryPopover>} />

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <DropdownField label="Price Range" required={false} value={draft.priceRange} options={priceOptions}
                onChange={priceRange => update({ priceRange })} open={priceOpen} onOpenChange={setPriceOpen}
                onBeforeToggle={() => { setCategoryOpen(false); setSortOpen(false); }} style={{ flex: 1, minWidth: 0, zIndex: priceOpen ? 40 : 10 }}
                triggerRef={priceTrigger} menuTestID="pos-price-options" optionTestIDPrefix="pos-price-"
                renderMenu={options => <InventoryPopover visible={priceOpen} anchorRef={priceTrigger} label="Price range options"
                  onClose={() => setPriceOpen(false)} testID="pos-price-options">{options}</InventoryPopover>} />
              <DropdownField label="Sort by" required={false} value={draft.sort} options={sortOptions}
                onChange={sort => update({ sort })} open={sortOpen} onOpenChange={setSortOpen}
                onBeforeToggle={() => { setCategoryOpen(false); setPriceOpen(false); }} style={{ flex: 1, minWidth: 0, zIndex: sortOpen ? 40 : 10 }}
                triggerRef={sortTrigger} menuTestID="pos-sort-options" optionTestIDPrefix="pos-sort-"
                renderMenu={options => <InventoryPopover visible={sortOpen} anchorRef={sortTrigger} label="Sort by options"
                  onClose={() => setSortOpen(false)} testID="pos-sort-options">{options}</InventoryPopover>} />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={sectionLabel}>Availability</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel="Availability" style={{ minHeight: tokens.size.touchTarget + 8,
                flexDirection: 'row', alignItems: 'center', padding: 4, borderRadius: tokens.radius.surface, backgroundColor: tokens.color.iceContainer }}>
                {availabilityOptions.map(option => {
                  const selected = draft.availability === option.value;
                  return <MotionPressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
                    accessibilityState={{ checked: selected }} aria-checked={selected}
                    onPress={() => update({ availability: selected ? 'all' : option.value })}
                    style={{ flex: 1, minWidth: 0, minHeight: tokens.size.touchTarget, alignItems: 'center', justifyContent: 'center',
                      paddingHorizontal: 2, borderRadius: tokens.radius.control, backgroundColor: selected ? tokens.color.royalBlue : 'transparent' }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: tokens.typography.weights.regular,
                      fontSize: tokens.typography.microFinancialRate.fontSize,
                      color: selected ? tokens.color.textInverse : tokens.color.textPrimary }}>{option.label}</Text>
                  </MotionPressable>;
                })}
              </View>
            </View>
          </View>
        </ResizableSheet>
      </SafeAreaView>
    </GestureHandlerRootView>
  </MotionModal>;
}

const sectionLabel = { fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.microFinancialRate.fontSize,
  lineHeight: tokens.typography.microFinancialRate.lineHeight, color: tokens.color.textPrimary } as const;
