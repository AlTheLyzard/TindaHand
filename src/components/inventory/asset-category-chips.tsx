import { useRef, useState } from 'react';
import { ScrollView, View, type ScrollViewInstance } from 'react-native';
import { PosChip } from '@/components/pos/pos-chip';
import tokens from '@/constants/design-tokens.json';
import { useMotionReduced } from '@/state/motion';
import { assetLabels } from '@/utils/inventory';

/** Match the POS catalog's spacing, snap offsets and scroll-to-selection behavior. */
export function AssetCategoryChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef<Record<string, number>>({});
  const [snaps, setSnaps] = useState<number[]>([]);
  const reduced = useMotionReduced();
  const gutter = tokens.spacing.two;
  function updateSnaps() {
    const next = Object.values(offsets.current).map(x => Math.max(0, x - gutter)).sort((a, b) => a - b);
    setSnaps(previous => previous.length === next.length && previous.every((x, i) => x === next[i]) ? previous : next);
  }
  return <ScrollView ref={scroll} testID="asset-category-chips" horizontal showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled" decelerationRate="fast" snapToOffsets={snaps}
    contentContainerStyle={{ gap: gutter, paddingHorizontal: gutter, paddingVertical: tokens.spacing.half, alignItems: 'center' }}
    style={{ flexGrow: 0, marginHorizontal: -gutter }} onContentSizeChange={updateSnaps}>
    {Object.entries({ all: 'All', equipment: assetLabels.equipment, furniture: assetLabels.furniture, current: 'Cash on hand' }).map(([key, label]) => <View key={key} style={{ flexShrink: 0 }}
      onLayout={event => { offsets.current[key] = event.nativeEvent.layout.x; updateSnaps(); }}>
      <PosChip singleLine label={label} selected={value === key} onPress={() => {
        onChange(key);
        scroll.current?.scrollTo({ x: Math.max(0, (offsets.current[key] ?? gutter) - gutter), animated: !reduced });
      }} />
    </View>)}
  </ScrollView>;
}
