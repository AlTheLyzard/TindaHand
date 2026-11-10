import type { ComponentProps } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { ButtonSurface } from './button';
import tokens from '@/constants/design-tokens.json';

/** Compact visible pills retain a full touch slot and their selection semantics. */
export function ChoiceChip({ label, selected, radio = false, compact = false, wrapperStyle, ...props }:
  Omit<ComponentProps<typeof ButtonSurface>, 'children'> & {
    label: string; selected: boolean; radio?: boolean; compact?: boolean; wrapperStyle?: StyleProp<ViewStyle>;
  }) {
  return <View style={[{ minHeight: tokens.size.touchTarget, minWidth: tokens.size.touchTarget, justifyContent: 'center' }, wrapperStyle]}>
    <ButtonSurface {...props} variant={selected ? 'primary' : 'secondary'}
      accessibilityRole={radio ? 'radio' : 'button'}
      accessibilityLabel={props.accessibilityLabel ?? label}
      accessibilityState={radio ? { checked: selected } : { selected }}
      aria-checked={radio ? selected : undefined} aria-selected={radio ? undefined : selected}
      hitSlop={8}
      style={{ minHeight: 34, minWidth: tokens.size.touchTarget, paddingHorizontal: compact ? 8 : 12, paddingVertical: 6,
        borderRadius: tokens.radius.pill, justifyContent: 'center', alignItems: 'center' }}>
      {({ color }) => <Text style={{ flexShrink: 1, textAlign: 'center', fontFamily: tokens.button.fontFamily, fontSize: compact ? 10 : 12, lineHeight: 18, color }}>{label}</Text>}
    </ButtonSurface>
  </View>;
}
