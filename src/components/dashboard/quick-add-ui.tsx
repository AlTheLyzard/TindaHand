import { MoneyInput } from '@/components/ui/money-input';
import { KeyboardInput as TextInput, KeyboardField } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { ButtonSurface, IconButton } from '@/components/ui/button';
import { MotionRegion } from '@/components/ui/motion-content';
import { useState, type Ref } from 'react';
import { Keyboard, StyleSheet, Text, View, useWindowDimensions, type TextInputProps, type TextInputInstance } from 'react-native';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import type { QuickAddKind } from '@/types/quick-add';
import { FieldLabel, fieldLabel } from '@/components/ui/field-label';
import { formatCalendarDate } from '@/utils/date';
import { expenseCategoryLabel } from '@/utils/expenses';

export const quickAddLabels: Record<QuickAddKind, string> = { customerDebt: 'Customer Debt', storeDebt: 'Store Debt', expense: 'Expense' };
export const quickAddColors = { ink: tokens.color.textPrimary, muted: tokens.color.textSecondary, primary: tokens.color.royalBlue, backdrop: tokens.overlay.navySoft };
const quickAddExpenseCategories = ['Water Expense', 'Electricity Expense', 'Others Expense'] as const;
const quickAddExpenseCategoryIcons = {
  'Water Expense': 'droplet',
  'Electricity Expense': 'lightning',
  'Others Expense': 'briefcase',
} as const;
/** Equal-width segments share one neutral track; full segments expose selection to assistive tech. */
export function QuickAddChips({ kind, onSelect }: { kind: QuickAddKind; onSelect: (kind: QuickAddKind) => void }) {
  return <View testID="quick-add-chips" accessibilityRole="tablist" accessibilityLabel="Quick Add form" style={{ flexDirection: 'row', flexShrink: 0, gap: 4, padding: 4, borderRadius: 12, backgroundColor: tokens.color.surfaceSubtle }}>
    {(Object.keys(quickAddLabels) as QuickAddKind[]).map(value => <MotionPressable key={value} accessibilityRole="tab"
      accessibilityLabel={quickAddLabels[value]} accessibilityState={{ selected: kind === value }} aria-selected={kind === value} onPress={() => onSelect(value)}
      style={{ flex: 1, minWidth: 0, minHeight: tokens.size.touchTarget, paddingHorizontal: 4, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 9,
        backgroundColor: kind === value ? tokens.color.navigationSurface : 'transparent' }}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ maxWidth: '100%', fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight,
        color: kind === value ? tokens.color.textPrimary : tokens.color.textSecondary, textAlign: 'center' }}>{quickAddLabels[value]}</Text>
    </MotionPressable>)}
  </View>;
}

/** Quick Add uses the compact category choices shown in its expense sheet. */
export function QuickAddExpenseCategoryField({ value, onChange, error }: {
  value: string; onChange: (value: string) => void; error?: string;
}) {
  return <View style={{ gap: 4 }}>
    <FieldLabel label="Select Expense Category" required style={quickAddStyles.label} />
    <View accessibilityRole="radiogroup" accessibilityLabel="Expense category" style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
      {quickAddExpenseCategories.map(category => {
        const label = expenseCategoryLabel(category);
        const selected = value === category;
        return <ButtonSurface key={category} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} aria-checked={selected} hitSlop={4}
          onPress={() => onChange(category)} variant={selected ? 'primary' : 'secondary'} style={{
            flex: 1, minWidth: 0, minHeight: 40, paddingHorizontal: 8, paddingVertical: 0,
            alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill,
            backgroundColor: selected ? tokens.color.royalBlue : tokens.color.appBackground,
            borderColor: selected ? tokens.color.royalBlue : tokens.color.borderOutline, boxShadow: tokens.shadow.chip,
          }}>
          {({ color }) => <View style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <PosIcon name={quickAddExpenseCategoryIcons[category]} color={color} size={16} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1, textAlign: 'center', fontFamily: tokens.typography.weights.semibold,
              fontSize: tokens.typography.labelNav.fontSize, lineHeight: tokens.typography.labelNav.lineHeight, color,
            }}>{label}</Text>
          </View>}
        </ButtonSurface>;
      })}
    </View>
    {!!error && <MotionRegion><Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text></MotionRegion>}
  </View>;
}

type FieldProps = TextInputProps & { label: string; required?: boolean; requiredIndicator?: 'text' | 'asterisk'; error?: string; errorBackground?: string; showError?: boolean; money?: boolean; large?: boolean; date?: boolean; dueDate?: boolean; onPickDate?: () => void; ref?: Ref<TextInputInstance> };
function displayDate(value: string) {
  return formatCalendarDate(value).toUpperCase();
}
/** Scoped field styling avoids changing registration, inventory or POS inputs. */
export function QuickAddField({ label, required = true, requiredIndicator: _requiredIndicator, error, errorBackground, showError = true, money = false, large = false, date = false, dueDate: _dueDate, onPickDate, ref, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const fontSize = tokens.typography.bodyPrimary.fontSize;
  const fontFamily = large ? tokens.typography.weights.bold : tokens.typography.weights.regular;
  const { fontScale } = useWindowDimensions();
  const inputHeight = Math.max(tokens.size.touchTarget, tokens.typography.bodyPrimary.lineHeight * fontScale + 20);
  const pickDate = () => { Keyboard.dismiss(); onPickDate?.(); };
  const Input = money ? MoneyInput : TextInput;
  const input = <Input {...props} ref={node => { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
    value={date ? displayDate(props.value ?? '') : props.value}
    editable={date ? false : props.editable} showSoftInputOnFocus={date ? false : props.showSoftInputOnFocus}
    accessible={!date} accessibilityRole={date ? undefined : props.accessibilityRole}
    accessibilityLabel={`${fieldLabel(label)}${required ? ', required' : ''}`} accessibilityHint={error || (date ? 'Opens the date picker.' : undefined)}
    pointerEvents={date ? 'none' : props.pointerEvents}
    placeholderTextColor={tokens.color.textPlaceholder} autoCorrect={false} spellCheck={false}
    onPressIn={date ? undefined : props.onPressIn}
    onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
    className="web:focus:outline-none" style={{ minHeight: inputHeight, height: props.multiline ? Math.min(120 * fontScale, Math.max(inputHeight, (props.value?.split('\n').length ?? 1) * tokens.typography.bodyPrimary.lineHeight * fontScale + 20)) : undefined, minWidth: 0, paddingLeft: money ? 0 : 20, paddingRight: date ? 4 : 20, paddingVertical: props.multiline ? 10 : 10, fontSize, lineHeight: tokens.typography.bodyPrimary.lineHeight, fontFamily, color: tokens.color.textPrimary }} />;
  return <KeyboardField style={{ gap: 4 }}>
    <FieldLabel label={label} required={required} style={quickAddStyles.label} />
    <View style={[quickAddStyles.field, { borderColor: error ? tokens.color.errorBase : focused ? tokens.color.brightBlue : tokens.color.borderOutline, backgroundColor: error ? errorBackground ?? tokens.color.surfaceCard : tokens.color.surfaceCard }]}>
      {money && <Text accessible={false} style={{ paddingLeft: 20, fontSize, fontFamily: tokens.typography.weights.semibold, color: props.value ? quickAddColors.ink : tokens.color.textPlaceholder }}>₱</Text>}
      <View style={{ flex: 1, minWidth: 0 }}>
        {date ? <MotionPressable accessibilityRole="button" accessibilityLabel={`${fieldLabel(label)}${required ? ', required' : ''}`}
          accessibilityHint={error || 'Opens the date picker.'} onPress={pickDate}
          style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>{input}</MotionPressable> : input}
      </View>
      {date && <IconButton accessibilityLabel={`Choose ${label.toLowerCase()}`} onPress={pickDate} className="min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="calendarDue" size={18} color={color} />} />}
    </View>
    {!!error && showError && <MotionRegion><Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text></MotionRegion>}
  </KeyboardField>;
}

export const quickAddStyles = StyleSheet.create({
  label: { fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: 18, color: quickAddColors.ink },
  error: { fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.helper.fontSize, lineHeight: 15, color: tokens.color.errorBase },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: tokens.radius.control },
  note: { fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, lineHeight: 18, color: quickAddColors.muted, backgroundColor: tokens.color.appBackground, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
});
