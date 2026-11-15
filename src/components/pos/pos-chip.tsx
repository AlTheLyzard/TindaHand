import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import tokens from '@/constants/design-tokens.json';

/** Payment modes use intrinsic, single-line widths inside a horizontal scroll row. */
export function PosChip({ label, accessibilityLabel, selected, onPress, disabled = false, radio = false, stretch = false, compact = false, singleLine: forceSingleLine = false, appearance }: {
  label: string; accessibilityLabel?: string; selected: boolean; onPress: () => void; radio?: boolean; stretch?: boolean; compact?: boolean;
  appearance?: 'payment' | 'quickAmount' | 'category'; disabled?: boolean; singleLine?: boolean;
}) {
  const { width } = useWindowDimensions();
  const payment = appearance === 'payment' || appearance === 'quickAmount';
  const category = appearance === 'category';
  const singleLine = appearance === 'payment' || forceSingleLine;
  const fontSize = singleLine ? 12 : payment ? Math.max(10, 12 * Math.min(1, width / 414)) : compact ? 10 : 12;
  return <Pressable accessibilityRole={radio ? 'radio' : 'button'} accessibilityLabel={accessibilityLabel ?? label}
    disabled={disabled} accessibilityState={radio ? { checked: selected, disabled } : { selected, disabled }} onPress={onPress}
    style={{ minHeight: tokens.size.touchTarget, minWidth: stretch ? 0 : tokens.size.touchTarget, flexShrink: stretch ? 1 : 0, flex: stretch ? 1 : undefined, justifyContent: 'center' }}>
    {({ pressed }) => <View style={{ minWidth: category ? 80 : undefined, minHeight: appearance === 'payment' ? 44 : appearance === 'quickAmount' ? 36 : 34, paddingHorizontal: category ? 16 : singleLine ? 12 : payment ? 4 : compact ? 8 : 12, paddingVertical: 6,
      alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill, borderWidth: 1,
      borderColor: disabled ? tokens.color.borderOutline : category ? 'transparent' : selected ? tokens.button.primary.default : payment || compact ? tokens.color.surfaceSubtle : tokens.color.navigationBorder,
      backgroundColor: disabled ? selected ? tokens.button.primary.disabled : tokens.button.secondary.disabled : pressed ? tokens.button.primary.pressed : selected ? tokens.button.primary.default : tokens.color.surfaceSubtle,
      boxShadow: category ? 'none' : selected ? tokens.button.highlight : payment || compact ? 'none' : '0 2px 4px #ADC9EE' }}>
      <Text numberOfLines={singleLine ? 1 : undefined} style={{ flexShrink: singleLine ? 0 : 1, textAlign: 'center', fontFamily: tokens.button.fontFamily, fontSize, lineHeight: 18,
        color: disabled ? selected ? tokens.button.primary.disabledText : tokens.button.secondary.disabledText : selected || pressed ? tokens.color.surfaceCard : tokens.color.textPrimary }}>{label}</Text>
    </View>}
  </Pressable>;
}
