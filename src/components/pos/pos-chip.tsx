import { Pressable, Text, View } from 'react-native';
import tokens from '@/constants/design-tokens.json';

/** Payment modes use intrinsic, single-line widths inside a horizontal scroll row. */
export function PosChip({ label, accessibilityLabel, selected, onPress, disabled = false, radio = false, stretch = false, compact = false, singleLine: forceSingleLine = false, appearance }: {
  label: string; accessibilityLabel?: string; selected: boolean; onPress: () => void; radio?: boolean; stretch?: boolean; compact?: boolean;
  appearance?: 'payment' | 'quickAmount' | 'category'; disabled?: boolean; singleLine?: boolean;
}) {
  const payment = appearance === 'payment' || appearance === 'quickAmount';
  const category = appearance === 'category';
  const singleLine = appearance === 'payment' || forceSingleLine;
  return <Pressable accessibilityRole={radio ? 'radio' : 'button'} accessibilityLabel={accessibilityLabel ?? label}
    disabled={disabled} accessibilityState={radio ? { checked: selected, disabled } : { selected, disabled }} onPress={onPress}
    style={{ minHeight: tokens.size.touchTarget, minWidth: stretch ? 0 : tokens.size.touchTarget, flexShrink: stretch ? 1 : 0, flex: stretch ? 1 : undefined, justifyContent: 'center' }}>
    {({ pressed }) => <View style={{ width: stretch ? '100%' : undefined, minWidth: category ? 64 : undefined, minHeight: category ? 42 : appearance === 'payment' ? 44 : appearance === 'quickAmount' ? 36 : 34,
      paddingHorizontal: category ? 8 : singleLine ? 12 : payment ? 4 : compact ? 8 : 12, paddingVertical: 6,
      alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill, borderWidth: 1,
      borderColor: disabled ? tokens.color.borderOutline : selected ? tokens.button.primary.default : payment || compact ? tokens.color.surfaceSubtle : tokens.color.navigationBorder,
      backgroundColor: disabled ? selected ? tokens.button.primary.disabled : tokens.button.secondary.disabled : pressed ? tokens.button.primary.pressed : selected ? tokens.button.primary.default : tokens.color.surfaceSubtle,
      boxShadow: category ? tokens.shadow.chip : selected ? tokens.button.highlight : 'none' }}>
      <Text numberOfLines={singleLine ? 1 : undefined} style={{ flexShrink: singleLine ? 0 : 1, textAlign: 'center', fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight,
        color: disabled ? selected ? tokens.button.primary.disabledText : tokens.button.secondary.disabledText : selected || pressed ? tokens.color.surfaceCard : tokens.color.textPrimary }}>{label}</Text>
    </View>}
  </Pressable>;
}
