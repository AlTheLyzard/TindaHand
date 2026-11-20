import { MoneyInput } from '@/components/ui/money-input';
import { KeyboardInput as TextInput, KeyboardField } from '@/components/ui/keyboard-aware-scroll-view';
import { IconButton } from '@/components/ui/button';
import { FieldLabel } from './field-label';
import { VisibilityIcon } from '@/components/ui/visibility-icon';
import tokens from '@/constants/design-tokens.json';
import { getFormFieldMaskState } from '@/utils/form-field-mask-state';
import { useTranslation } from '@/i18n/use-translation';
import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions, type TextInputProps, type TextInputInstance } from 'react-native';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  help?: string;
  password?: boolean;
  passwordIndicators?: boolean;
  pin?: boolean;
  pinIndicators?: boolean;
  pinVisibilityToggle?: boolean;
  errorVariant?: 'default' | 'registration';
  prefix?: string;
  money?: boolean;
  ref?: Ref<TextInputInstance>;
  required?: boolean;
  requiredIndicator?: 'text' | 'asterisk';
  /** Context that must scroll into view together with this field (e.g. login ID). */
  leadingContent?: ReactNode;
  /** Shared vertical space to keep a primary action below this field above the keyboard. */
  keyboardScrollAfter?: number;
};

export function FormField({ label, error, help, password, passwordIndicators = false, pin, pinIndicators = false, pinVisibilityToggle = false, prefix, money = prefix === '\u20b1', errorVariant = 'default', ref, required = true, requiredIndicator: _requiredIndicator, leadingContent, keyboardScrollAfter = 0, ...props }: FormFieldProps) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const selection = useRef<{ start: number; end: number }>({ start: props.value?.length ?? 0, end: props.value?.length ?? 0 });
  const [restoredSelection, setRestoredSelection] = useState<{ start: number; end: number }>();
  useImperativeHandle(ref, () => input.current!, []);
  const Input = money ? MoneyInput : TextInput;
  const maskState = getFormFieldMaskState({ password, passwordIndicators, pin, pinIndicators, pinVisibilityToggle, value: props.value, caretHidden: props.caretHidden, selectionColor: props.selectionColor, accentColor: tokens.color.accentBase, visible });
  const { showPinIndicators, showPasswordIndicators, showMaskIndicators, hidePlaceholder } = maskState;

  return (
    <KeyboardField scrollAfter={keyboardScrollAfter}>
      {leadingContent}
      <FieldLabel label={label} required={required} style={{ marginBottom: 4, fontFamily: 'Poppins_700Bold' }} />
      <View style={[styles.field, styles.shadow,
        { borderColor: error ? '#B42318' : focused ? '#245399' : '#BCD3EE' },
        error && errorVariant === 'registration' ? { backgroundColor: '#F1EAF1', borderColor: '#C96F74' } : undefined]}>
        {prefix && <Text accessible={false} className="pl-3 font-poppins-bold text-[12px] text-text-secondary">{prefix}</Text>}
        <View style={styles.inputContainer}>
          <Input
            {...props}
            ref={input}
            selection={props.selection ?? restoredSelection}
            onSelectionChange={event => {
              selection.current = event.nativeEvent.selection;
              if (restoredSelection?.start === selection.current.start && restoredSelection.end === selection.current.end) setRestoredSelection(undefined);
              props.onSelectionChange?.(event);
            }}
            onChangeText={value => { setRestoredSelection(undefined); props.onChangeText?.(value); }}
            accessibilityLabel={[required ? t('fields.requiredAccessibility', { label }) : label, error].filter(Boolean).join('. ')}
            accessibilityHint={error ? undefined : help || (pin ? t('fields.pinHint') : undefined)}
            autoCorrect={false}
            spellCheck={false}
            secureTextEntry={maskState.secureTextEntry}
            placeholderTextColor={props.placeholderTextColor ?? `${tokens.color.textPrimary}99`}
            placeholder={hidePlaceholder ? undefined : props.placeholder}
            caretHidden={maskState.caretHidden}
            selectionColor={maskState.selectionColor}
            onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
            onBlur={(event) => {
              setFocused(false);
              props.onBlur?.(event);
            }}
            className={`min-w-0 flex-1 ${prefix ? 'pl-1 pr-5' : 'px-5'} font-poppins-bold text-[12px] web:focus:outline-none`}
            style={[styles.input, props.style, maskState.textColor && { color: maskState.textColor }]}
          />
          {showMaskIndicators && (
            // Keep the native secure input for editing and accessibility. The overlay
            // reuses the PIN dot size; password spacing follows the 12-point text advance.
            <View pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              style={[styles.pinIndicators, showPasswordIndicators && { gap: Math.max(0, 12 * fontScale - 8) }]}>
              {Array.from({ length: showPinIndicators ? props.maxLength ?? 4 : Array.from(props.value ?? '').length }, (_, index) => (
                <View key={index} style={[styles.pinIndicator, index < (props.value?.length ?? 0) && styles.pinIndicatorFilled]} />
              ))}
            </View>
          )}
        </View>
        {(password || (pin && pinVisibilityToggle)) && (
          <IconButton
            // Keep browser pointer presses from moving focus to the button.
            // Native Pressable and handled scroll taps retain the current input.
            onPointerDown={event => { if (Platform.OS === 'web') event.preventDefault(); }}
            onPress={event => {
              event.stopPropagation();
              // Web selection events can lag behind a visibility-button click.
              // Native platforms use the selection reported by TextInput itself.
              const webInput = Platform.OS === 'web' ? input.current as unknown as { selectionStart: number | null; selectionEnd: number | null } : null;
              const current = webInput ? { start: webInput.selectionStart ?? selection.current.start, end: webInput.selectionEnd ?? selection.current.end } : selection.current;
              setRestoredSelection(input.current?.isFocused() ? { ...current } : undefined);
              setVisible(current => !current);
            }}
            accessibilityRole="button"
            disabled={props.editable === false}
            accessibilityLabel={t(visible ? 'fields.hide' : 'fields.show', { label: label.toLowerCase() })}
            icon={({ color, size }) => <VisibilityIcon visible={visible} color={color} size={size} />} />
        )}
        {pin && !pinVisibilityToggle && (
          <Text accessible={false} className="pr-5 font-poppins-bold text-[12px] text-text-secondary">{t('fields.pinLength')}</Text>
        )}
      </View>
      {help && !error && (
        <Text className="mt-2 font-poppins text-[10px]" style={{ color: `${tokens.color.textPrimary}BF`, lineHeight: 15 * fontScale }}>
          {help}
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className={errorVariant === 'registration'
          ? 'mt-2 font-poppins text-[10px] text-[#B42318]'
          : 'mt-2 font-poppins text-[12px] text-[#B42318]'} style={{ lineHeight: (errorVariant === 'registration' ? 15 : 18) * fontScale }}>
          {error}
        </Text>
      )}
    </KeyboardField>
  );
}

const styles = StyleSheet.create({
  field: {
    height: tokens.size.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.radius.control,
    backgroundColor: tokens.color.surfaceCard,
  },
  input: {
    color: tokens.color.textPrimary,
    height: tokens.size.touchTarget,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  inputContainer: { flex: 1, minWidth: 0, height: '100%', justifyContent: 'center', position: 'relative' },
  pinIndicators: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.two,
    paddingHorizontal: 20,
  },
  pinIndicator: {
    width: 8, height: 8, borderRadius: tokens.radius.pill,
    backgroundColor: `${tokens.color.textPrimary}99`,
  },
  pinIndicatorFilled: { backgroundColor: tokens.color.textPrimary },
  shadow: { boxShadow: '0 3px 3px rgba(115, 153, 204, 0.45)' },
});
