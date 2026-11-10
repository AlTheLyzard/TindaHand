import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import tokens from '@/constants/design-tokens.json';

/** Reference-sized pills inside full touch targets; labels can wrap when scaled. */
export function PosChip({ label, accessibilityLabel, selected, onPress, radio = false, stretch = false, compact = false, appearance }: {
  label: string; accessibilityLabel?: string; selected: boolean; onPress: () => void; radio?: boolean; stretch?: boolean; compact?: boolean;
  appearance?: 'payment' | 'quickAmount' | 'category';
}) {
  const { width } = useWindowDimensions();
  const payment = appearance === 'payment' || appearance === 'quickAmount';
  const category = appearance === 'category';
  const fontSize = payment ? Math.max(10, 12 * Math.min(1, width / 414)) : compact ? 10 : 12;
  return <Pressable accessibilityRole={radio ? 'radio' : 'button'} accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={radio ? { checked: selected } : { selected }} onPress={onPress}
    style={{ minHeight: tokens.size.touchTarget, minWidth: stretch ? 0 : tokens.size.touchTarget, flexShrink: stretch ? 1 : 0, flex: stretch ? 1 : undefined, justifyContent: 'center' }}>
    {({ pressed }) => <View style={{ minWidth: category ? 80 : undefined, minHeight: appearance === 'payment' ? 44 : appearance === 'quickAmount' ? 36 : 34, paddingHorizontal: category ? 16 : payment ? 4 : compact ? 8 : 12, paddingVertical: 6,
      alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill, borderWidth: 1,
      borderColor: category ? 'transparent' : selected ? tokens.button.primary.default : payment || compact ? tokens.color.surfaceSubtle : tokens.color.navigationBorder,
      backgroundColor: pressed ? tokens.button.primary.pressed : selected ? tokens.button.primary.default : tokens.color.surfaceSubtle,
      boxShadow: category ? 'none' : selected ? tokens.button.highlight : payment || compact ? 'none' : '0 2px 4px #ADC9EE' }}>
      <Text style={{ flexShrink: 1, textAlign: 'center', fontFamily: tokens.button.fontFamily, fontSize, lineHeight: 18,
        color: selected || pressed ? '#FFFFFF' : tokens.color.textPrimary }}>{label}</Text>
    </View>}
  </Pressable>;
}
