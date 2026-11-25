import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Keyboard, ScrollView, Text, View, useWindowDimensions, type TextInputInstance } from 'react-native';
import { KeyboardField, KeyboardInput } from './keyboard-aware-scroll-view';
import { FieldLabel } from './field-label';
import { Button, IconButton } from './button';
import { MotionPressable } from './motion-pressable';
import tokens from '@/constants/design-tokens.json';

/** Lookup UI is shared; callers keep Customer and Creditor records/IDs distinct. */
export function PartyNameField<T extends { id: string; name: string }>({ kind, label, value, selectedId, records, onChange, onMatch, onSelect, error, errorBackground, inputRef, onNext, onFieldBlur, floatingSuggestions = false, placeholder, selectAdornment, selectAccessibilityLabel }: {
  kind: 'customer' | 'creditor'; label: string; value: string; selectedId?: string; records: readonly T[];
  onChange: (name: string) => void; onMatch: (record: T) => void; onSelect: () => void; error?: string; inputRef?: Ref<TextInputInstance>; onNext?: () => void;
  onFieldBlur?: () => void; floatingSuggestions?: boolean; placeholder?: string; errorBackground?: string; selectAdornment?: ReactNode; selectAccessibilityLabel?: string;
}) {
  const { fontScale } = useWindowDimensions();
  const fieldHeight = Math.max(tokens.size.touchTarget, tokens.typography.bodyPrimary.lineHeight * fontScale + tokens.spacing.two);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const blur = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (blur.current) clearTimeout(blur.current); }, []);
  // Backend: replace the scoped in-memory lookup with customer/creditor search;
  // retain IDs from the returned records and cancel superseded lookup requests.
  const matches = records.filter(row => row.name.toLocaleLowerCase('en').includes(value.trim().toLocaleLowerCase('en')))
    .slice().sort((a, b) => a.name.localeCompare(b.name, 'en')).slice(0, 5);
  const show = focused && !!value.trim() && !selectedId && matches.length > 0;
  const keepOpen = () => { if (blur.current) clearTimeout(blur.current); setFocused(true); };
  function choose(record: T) { if (blur.current) clearTimeout(blur.current); onMatch(record); setFocused(false); setActive(-1); Keyboard.dismiss(); }
  const select = () => { setFocused(false); onSelect(); };
  return <KeyboardField style={{ zIndex: floatingSuggestions && show ? 10 : 0 }}>
    <FieldLabel label={label} required style={{ marginBottom: 4 }} />
    <View style={{ position: 'relative', zIndex: floatingSuggestions && show ? 10 : 0 }}>
      <View style={{ minHeight: fieldHeight, flexDirection: 'row', alignItems: 'center', borderWidth: 1,
        borderColor: error ? tokens.color.errorBase : focused ? tokens.color.brightBlue : tokens.color.borderOutline,
        borderRadius: tokens.radius.control, backgroundColor: error ? errorBackground ?? tokens.color.surfaceCard : tokens.color.surfaceCard, paddingHorizontal: tokens.spacing.three }}>
        <KeyboardInput ref={inputRef} value={value} onChangeText={text => { keepOpen(); setActive(-1); onChange(text); }}
          accessibilityLabel={`${kind === 'customer' ? 'Customer' : 'Creditor'} name, required`} accessibilityHint={error ?? `Type a name to find existing ${kind}s. Use Select to open the full list.`}
          placeholder={placeholder ?? `Enter ${kind} name`} placeholderTextColor={tokens.color.textPlaceholder} autoCorrect={false} autoCapitalize="words" returnKeyType="next"
          onFocus={keepOpen} onBlur={() => { blur.current = setTimeout(() => setFocused(false), 160); onFieldBlur?.(); }}
          onKeyPress={event => {
            if (!show) return;
            if (event.nativeEvent.key === 'ArrowDown') { event.preventDefault(); setActive(index => (index + 1) % matches.length); }
            if (event.nativeEvent.key === 'ArrowUp') { event.preventDefault(); setActive(index => (index - 1 + matches.length) % matches.length); }
            if (event.nativeEvent.key === 'Escape') setFocused(false);
          }}
          onSubmitEditing={() => { if (show && active >= 0) choose(matches[active]); else { setFocused(false); onNext?.(); } }}
          style={{ flex: 1, minWidth: 0, height: fieldHeight, paddingVertical: 0, textAlignVertical: 'center',
            fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.bodyPrimary.fontSize,
            lineHeight: tokens.typography.bodyPrimary.lineHeight, color: tokens.color.textPrimary }} />
        {selectAdornment ? <IconButton accessibilityLabel={selectAccessibilityLabel ?? `Select an existing ${kind}`} onPress={() => { setFocused(false); onSelect(); }}
          style={{ minHeight: fieldHeight, minWidth: tokens.size.touchTarget, borderLeftWidth: 1, borderColor: tokens.color.borderOutline, borderRadius: 0 }} icon={() => selectAdornment} /> :
          <Button variant="text" fullWidth={false} compact accessibilityLabel={`Select an existing ${kind}`} style={{ minHeight: fieldHeight, paddingVertical: tokens.spacing.one }} onPress={select}>Select</Button>}
      </View>
      {show && <View testID={`${kind}-matches`} accessibilityLabel={`Matching ${kind}s`} style={[{
        borderWidth: 1, borderColor: tokens.color.borderOutline, borderRadius: tokens.radius.control, backgroundColor: tokens.color.navigationSurface,
      }, floatingSuggestions && { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20, overflow: 'hidden' }]}>
        {floatingSuggestions ? <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
          {matches.map((row, index) => <MotionPressable key={row.id} accessibilityRole="button" accessibilityLabel={`Select ${row.name}, ${row.id}`}
            onFocus={keepOpen} onPress={() => choose(row)} style={{ minHeight: 48, justifyContent: 'center', padding: 12, backgroundColor: index === active ? tokens.color.accentContainer : 'transparent' }}>
            <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, color: tokens.color.textPrimary }}>{row.name}</Text>
            {matches.some(other => other.id !== row.id && other.name === row.name) && <Text style={{ fontSize: tokens.typography.helper.fontSize, color: tokens.color.textSecondary }}>{row.id}</Text>}
          </MotionPressable>)}
        </ScrollView> : matches.map((row, index) => <MotionPressable key={row.id} accessibilityRole="button" accessibilityLabel={`Select ${row.name}, ${row.id}`}
          onFocus={keepOpen} onPress={() => choose(row)} style={{ minHeight: 48, justifyContent: 'center', padding: 12, backgroundColor: index === active ? tokens.color.accentContainer : 'transparent' }}>
          <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, color: tokens.color.textPrimary }}>{row.name}</Text>
          {matches.some(other => other.id !== row.id && other.name === row.name) && <Text style={{ fontSize: tokens.typography.helper.fontSize, color: tokens.color.textSecondary }}>{row.id}</Text>}
        </MotionPressable>)}
      </View>}
    </View>
    {!!error && <Text accessibilityRole="alert" className="mt-2 type-helper text-error-base">{error}</Text>}
    {!!value.trim() && !selectedId && <Text className="mt-2 type-helper text-text-secondary">Choose a match or keep this name for a new {kind} on save.</Text>}
  </KeyboardField>;
}
