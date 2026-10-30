import { MotionSurface, MotionText, MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useRef, useState, type Ref } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps, type TextInputInstance } from 'react-native';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import type { QuickAddKind } from '@/types/quick-add';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { formatCalendarDate } from '@/utils/date';

export const quickAddLabels: Record<QuickAddKind, string> = { customerDebt: 'Customer Debt', storeDebt: 'Store Debt', expense: 'Expense' };
export const quickAddColors = { ink: '#102342', muted: '#4A607A', primary: '#28549A', backdrop: 'rgba(16,35,66,0.42)' };
export const quickAddShadow = '0 3px 3px rgba(115,153,204,0.45)';

/** Intrinsic label widths share spare space; enlarged text can scroll without truncation. */
export function QuickAddChips({ kind, onSelect }: { kind: QuickAddKind; onSelect: (kind: QuickAddKind) => void }) {
  return <ScrollView horizontal testID="quick-add-chips" showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
    style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ flexGrow: 1, gap: 8, paddingBottom: 4 }}>
    {(Object.keys(quickAddLabels) as QuickAddKind[]).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={quickAddLabels[value]}
      accessibilityState={{ selected: kind === value }} onPress={() => onSelect(value)} style={{ minHeight: 48, minWidth: 48, flexGrow: 1, flexShrink: 0, justifyContent: 'center' }} className="">
      <MotionSurface style={{ minHeight: 36, paddingHorizontal: 6, paddingVertical: 7, alignItems: 'center', justifyContent: 'center', borderRadius: tokens.radius.pill, borderWidth: 1, borderColor: kind === value ? '#7399CC' : '#C5DCF4', backgroundColor: kind === value ? quickAddColors.primary : '#EBF5FB', boxShadow: 'inset 0 2px 3px #ADC9EE, 0 3px 3px #ADC9EE' }}>
        <MotionText numberOfLines={1} style={{ fontSize: 12, lineHeight: 18, color: kind === value ? '#FFFFFF' : '#111111', textAlign: 'center', fontFamily: 'Poppins_600SemiBold' }}>{quickAddLabels[value]}</MotionText>
      </MotionSurface>
    </Pressable>)}
  </ScrollView>;
}

type FieldProps = TextInputProps & { label: string; required?: boolean; error?: string; showError?: boolean; money?: boolean; large?: boolean; date?: boolean; onPickDate?: () => void; ref?: Ref<TextInputInstance> };
function displayDate(value: string) {
  return formatCalendarDate(value).toUpperCase();
}
/** Scoped field styling avoids changing registration, inventory or POS inputs. */
export function QuickAddField({ label, required = true, error, showError = true, money = false, large = false, date = false, onPickDate, ref, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance | null>(null);
  const fontSize = large ? 22 : 12;
  const { fontScale } = useWindowDimensions();
  const inputHeight = Math.max(46, (large ? 30 : 18) * fontScale + (large ? 14 : 20));
  const amount = money ? parsePaymentAmount(props.value ?? '') : null;
  const formattedAmount = amount !== null ? `${Math.floor(amount / 100).toLocaleString('en-PH')}.${String(amount % 100).padStart(2, '0')}` : props.value;
  const overlay = !focused && (money || date) && !!props.value;
  return <MotionLayout style={{ gap: 4 }}>
    <Text style={quickAddStyles.label}>{label}{required && !date ? ' (Required)' : ''}</Text>
    <View style={[quickAddStyles.field, { borderColor: error ? '#CC333B' : focused ? '#2675FF' : '#FFFFFF', backgroundColor: error ? '#FFF7F8' : focused ? '#F7FBFF' : '#FFFFFF' }]}>
      {money && <Text accessible={false} style={{ paddingLeft: 20, fontSize, fontFamily: 'Poppins_600SemiBold', color: props.value ? quickAddColors.ink : '#718198' }}>₱</Text>}
      <View style={{ flex: 1, minWidth: 0 }}>
      <TextInput {...props} ref={node => { input.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}
        value={overlay ? date ? displayDate(props.value ?? '') : formattedAmount : props.value}
        accessibilityLabel={`${label}${required ? ', required' : ''}`} accessibilityHint={error || (date ? 'Enter date as YYYY-MM-DD.' : undefined)}
        placeholderTextColor="#718198" autoCorrect={false} spellCheck={false}
        onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }}
        className="web:focus:outline-none" style={{ minHeight: inputHeight, height: props.multiline ? Math.min(120 * fontScale, Math.max(inputHeight, (props.value?.split('\n').length ?? 1) * 18 * fontScale + 20)) : undefined, minWidth: 0, paddingLeft: money ? 0 : 20, paddingRight: date ? 4 : 20, paddingVertical: props.multiline ? 10 : large ? 7 : 10, fontSize, lineHeight: large ? 30 : 18, fontFamily: 'Poppins_600SemiBold', color: overlay && date && !onPickDate ? '#A9BBD3' : quickAddColors.ink }} />
      </View>
      {date && <Pressable accessibilityRole="button" accessibilityLabel={onPickDate ? `Choose ${label.toLowerCase()}` : 'Edit due date'} onPress={onPickDate ?? (() => input.current?.focus())} className="min-h-12 min-w-12 items-center justify-center"><PosIcon name="calendar" size={18} color="#111111" /></Pressable>}
    </View>
    {!!error && showError && <MotionRegion><Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text></MotionRegion>}
  </MotionLayout>;
}

export const quickAddStyles = StyleSheet.create({
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 18, color: quickAddColors.ink },
  error: { fontFamily: 'Poppins_400Regular', fontSize: 10, lineHeight: 15, color: '#B4232C' },
  field: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: tokens.radius.control, boxShadow: quickAddShadow },
  note: { fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: quickAddColors.muted, backgroundColor: '#F0F8FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
});
