import { useState, type ReactNode, type Ref } from 'react';
import { Keyboard, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewInstance, type ViewStyle } from 'react-native';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { FieldLabel } from '@/components/ui/field-label';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';

export type DropdownOption<Value extends string = string> = { label: string; value: Value; disabled?: boolean };

export function DropdownField<Value extends string>({
  label, value, options, onChange, placeholder = 'Select an option', error, required = true, disabled = false, style,
  open, onOpenChange, onBeforeToggle, triggerRef, menuTestID, optionTestIDPrefix, renderMenu,
}: {
  label: string; value?: Value; options: readonly DropdownOption<Value>[]; onChange: (value: Value) => void;
  placeholder?: string; error?: string; required?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>;
  open?: boolean; onOpenChange?: (open: boolean) => void; onBeforeToggle?: () => void;
  triggerRef?: Ref<ViewInstance>; menuTestID?: string; optionTestIDPrefix?: string;
  renderMenu?: (options: ReactNode | null) => ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<Value | null>(null);
  const expanded = open ?? internalOpen;
  const setExpanded = (next: boolean) => { if (open === undefined) setInternalOpen(next); onOpenChange?.(next); };
  const selected = options.find(option => option.value === value);
  const borderColor = error ? tokens.color.errorBase : expanded ? tokens.color.brightBlue : tokens.color.borderOutline;
  const optionList = <View>
    {options.map(option => {
      const active = option.value === value;
      return <MotionPressable key={option.value} testID={optionTestIDPrefix ? `${optionTestIDPrefix}${option.value}` : undefined}
        accessibilityRole="menuitem" accessibilityState={{ selected: active, disabled: !!option.disabled }}
        disabled={option.disabled} onHoverIn={() => setHoveredValue(option.value)}
        onHoverOut={() => setHoveredValue(current => current === option.value ? null : current)}
        onPress={() => { onChange(option.value); setExpanded(false); }}
        style={[styles.option, active ? styles.optionSelected : hoveredValue === option.value && styles.optionHovered]}>
        <Text numberOfLines={1} style={[styles.optionLabel, active && styles.optionLabelSelected]}>{option.label}</Text>
        {active && <View accessible accessibilityLabel="Selected"><PosIcon name="check" size={16} color={tokens.color.royalBlue} /></View>}
      </MotionPressable>;
    })}
  </View>;

  return <View style={[styles.root, style]}>
    <FieldLabel label={label} required={required} style={styles.label} />
    <MotionPressable ref={triggerRef} accessibilityRole="button" accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
      accessibilityState={{ disabled, expanded }} aria-expanded={expanded} disabled={disabled}
      onPress={() => { Keyboard.dismiss(); onBeforeToggle?.(); setExpanded(!expanded); }} style={[styles.trigger, { borderColor }] }>
      <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>{selected?.label ?? placeholder}</Text>
      <PosIcon name={expanded ? 'chevronUp' : 'chevronDown'} size={18} color={disabled ? tokens.color.textDisabled : tokens.color.darkNavy} />
    </MotionPressable>
    {renderMenu
      ? renderMenu(expanded && !disabled ? optionList : null)
      : expanded && !disabled && <View testID={menuTestID} style={styles.menu}>
        <ScrollView accessibilityRole="menu" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{optionList}</ScrollView>
      </View>}
    {!!error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  root: { position: 'relative', zIndex: 10 },
  label: { marginBottom: tokens.spacing.one },
  trigger: {
    minHeight: tokens.size.touchTarget,
    borderWidth: 1,
    borderRadius: tokens.radius.control,
    backgroundColor: tokens.color.surfaceCard,
    paddingHorizontal: tokens.spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.two,
  },
  value: { flex: 1, fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.bodyPrimary.fontSize, color: tokens.color.textPrimary },
  placeholder: { color: tokens.color.textPlaceholder },
  menu: {
    position: 'absolute',
    top: tokens.size.touchTarget + tokens.spacing.two + tokens.typography.labelNav.lineHeight,
    left: 0,
    right: 0,
    zIndex: 30,
    maxHeight: 240,
    borderWidth: 1,
    borderRadius: tokens.radius.control,
    borderColor: tokens.color.borderOutline,
    backgroundColor: tokens.color.surfaceCard,
    overflow: 'hidden',
  },
  option: { minHeight: tokens.size.touchTarget, paddingHorizontal: tokens.spacing.three, flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.two },
  optionSelected: { backgroundColor: tokens.color.softBlue },
  optionHovered: { backgroundColor: tokens.color.appBackground },
  optionLabel: { flex: 1, color: tokens.color.textPrimary, fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize },
  optionLabelSelected: { fontFamily: tokens.typography.weights.semibold },
  error: { marginTop: tokens.spacing.two, fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.helper.fontSize, lineHeight: tokens.typography.helper.lineHeight, color: tokens.color.errorBase },
});
