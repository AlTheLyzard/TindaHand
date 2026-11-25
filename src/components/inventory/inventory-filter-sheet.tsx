import tokens from '@/constants/design-tokens.json';
import { Button } from '@/components/ui/button';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import type { InventoryFilters } from '@/types/inventory';
import { categoryLabels } from '@/utils/inventory';
import { InvModal, InvSelect, InvText } from './inventory-ui';
import { inventoryStatusAppearance } from './inventory-status';
import { View } from 'react-native';

const sorting = {
  stockDesc: 'High-to-Low Stock',
  stockAsc: 'Low-to-High Stock',
  fast: 'Fast-selling',
  slow: 'Slow-selling',
  expiry: 'Expiring soon',
} as const;
const statuses = { good: 'In Stock', low: 'Low Stock', out: 'Out of Stock' } as const;
const sheetTitleStyle = {
  fontFamily: tokens.typography.weights.bold,
  fontSize: tokens.typography.h2Section.fontSize,
  lineHeight: tokens.typography.h2Section.lineHeight,
  color: tokens.color.black,
};
const sheetSubtitleStyle = {
  fontFamily: tokens.typography.weights.regular,
  fontSize: tokens.typography.microFinancialRate.fontSize,
  lineHeight: tokens.typography.microFinancialRate.lineHeight,
  color: tokens.color.textSecondary,
};

export function InventoryFilterSheet({ visible, draft, onChange, onClose, onApply }: {
  visible: boolean;
  draft: InventoryFilters;
  onChange: (filters: InventoryFilters) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const update = (changes: Partial<InventoryFilters>) => onChange({ ...draft, ...changes });
  return <InvModal visible={visible} sheet title="Sort & Filter" subtitle="Choose how to arrange your paninda."
    titleStyle={sheetTitleStyle} subtitleStyle={sheetSubtitleStyle} onClose={onClose}
    footer={<View className="flex-row items-center gap-3">
      <View className="flex-1"><Button compact variant="text" onPress={() => onChange({ sort: 'stockDesc', category: 'all', letter: 'all', status: 'all' })}>Reset</Button></View>
      <View className="flex-[1.5]"><Button compact textStyle={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight }} onPress={onApply}>Apply Filter</Button></View>
    </View>}>
    <InvSelect key={String(visible)} anchored label="CATEGORY" value={draft.category}
      options={{ all: 'All', ...categoryLabels }} onChange={category => update({ category })} />
    <InvText bold size={11} color={tokens.color.textSecondary}>SORT</InvText>
    <View className="gap-2">
      {Object.entries(sorting).map(([key, label]) => {
        const selected = draft.sort === key;
        return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected}
          onPress={() => update({ sort: key as InventoryFilters['sort'] })}
          className="min-h-[60px] flex-row items-center gap-3 rounded-control bg-white px-4 py-3"
          style={{ borderWidth: 1, borderColor: tokens.color.borderOutline, boxShadow: tokens.shadow.small }}>
          <Radio selected={selected} />
          <InvText color={tokens.color.textPrimary}>{label}</InvText>
        </Pressable>;
      })}
    </View>
    <InvText bold size={11} color={tokens.color.textSecondary}>STOCK STATUS</InvText>
    <View className="flex-row gap-2">
      {Object.entries(statuses).map(([key, label]) => {
        const selected = draft.status === key;
        const appearance = inventoryStatusAppearance(key);
        return <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label}
          accessibilityState={{ checked: selected }} aria-checked={selected}
          onPress={() => update({ status: selected ? 'all' : key as InventoryFilters['status'] })}
          className="min-h-12 min-w-0 flex-1 flex-row items-center justify-center gap-1 rounded-control border px-2 py-2"
          style={{ ...appearance, boxShadow: tokens.shadow.small }}>
          <Radio selected={selected} color={appearance.color} />
          <View className="min-w-0 flex-shrink"><InvText size={10} color={appearance.color}>{label}</InvText></View>
        </Pressable>;
      })}
    </View>
    {(draft.status === 'expired' || draft.status === 'nearExpiry') && <Button compact variant="text" onPress={() => update({ status: 'all' })}>
      {'Clear ' + (draft.status === 'expired' ? 'expired' : 'nearing expiry') + ' alert filter'}
    </Button>}
  </InvModal>;
}

function Radio({ selected, color = tokens.color.royalBlue }: { selected: boolean; color?: string }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {selected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />}
  </View>;
}
