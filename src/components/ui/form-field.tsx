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
  pinLengthIndicator?: boolean;
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
  /** Decorative or interactive content aligned to the trailing edge inside the input border. */
  trailingAccessory?: ReactNode;
};

export function FormField({ label, error, help, password, passwordIndicators = false, pin, pinIndicators = false, pinVisibilityToggle = false, pinLengthIndicator = true, prefix, money = prefix === '\u20b1', errorVariant: _errorVariant = 'default', ref, required = true, requiredIndicator: _requiredIndicator, leadingContent, keyboardScrollAfter = 0, trailingAccessory, ...props }: FormFieldProps) {
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
      <FieldLabel label={label} required={required} style={{ marginBottom: 4 }} />
      <View style={[styles.field, props.multiline && styles.multilineField,
        { height: props.multiline ? undefined : tokens.size.touchTarget, minHeight: props.multiline ? tokens.size.touchTarget : undefined,
          alignItems: props.multiline ? 'stretch' : 'center', borderColor: error ? tokens.color.errorBase : focused ? tokens.color.brightBlue : tokens.color.borderOutline }]}>
        {prefix && <Text accessible={false} className="pl-3 type-label-nav text-text-secondary">{prefix}</Text>}
        <View style={[styles.inputContainer, props.multiline && styles.multilineInputContainer]}>
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
            placeholderTextColor={props.placeholderTextColor ?? tokens.color.textPlaceholder}
            placeholder={hidePlaceholder ? undefined : props.placeholder}
            caretHidden={maskState.caretHidden}
            selectionColor={maskState.selectionColor}
            onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
            onBlur={(event) => {
              setFocused(false);
              props.onBlur?.(event);
            }}
            className={`min-w-0 flex-1 ${prefix ? `pl-1 ${trailingAccessory ? 'pr-2' : 'pr-5'}` : trailingAccessory ? 'pl-5 pr-2' : 'px-5'} type-body-primary web:focus:outline-none`}
            style={[styles.input, props.multiline && styles.multilineInput, props.style, maskState.textColor && { color: maskState.textColor }]}
          />
          {showMaskIndicators && (
            // Keep the native secure input for editing and accessibility. The overlay
            // reuses the PIN dot size; password spacing follows the body text advance.
            <View pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
              style={[styles.pinIndicators, showPasswordIndicators && { gap: Math.max(0, tokens.typography.bodyPrimary.fontSize * fontScale - 8) }]}>
              {Array.from({ length: showPinIndicators ? props.maxLength ?? 4 : Array.from(props.value ?? '').length }, (_, index) => (
                <View key={index} style={[styles.pinIndicator, index < (props.value?.length ?? 0) && styles.pinIndicatorFilled]} />
              ))}
            </View>
          )}
        </View>
        {trailingAccessory && <View style={styles.trailingAccessory}>{trailingAccessory}</View>}
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
        {pin && !pinVisibilityToggle && pinLengthIndicator && (
          <Text accessible={false} className="pr-5 type-label-nav text-text-secondary">{t('fields.pinLength')}</Text>
        )}
      </View>
      {help && !error && (
        <Text className="mt-2 type-helper text-text-secondary" style={{ lineHeight: tokens.typography.helper.lineHeight * fontScale }}>
          {help}
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="mt-2 type-helper text-error-base" style={{ lineHeight: tokens.typography.helper.lineHeight * fontScale }}>
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
    fontFamily: tokens.typography.weights.regular,
    fontSize: tokens.typography.bodyPrimary.fontSize,
    height: tokens.size.touchTarget,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  inputContainer: { flex: 1, minWidth: 0, height: '100%', justifyContent: 'center', position: 'relative' },
  trailingAccessory: { height: '100%', justifyContent: 'center', paddingRight: tokens.spacing.two },
  multilineField: { paddingVertical: tokens.spacing.two },
  multilineInputContainer: { height: undefined, justifyContent: 'flex-start' },
  multilineInput: { height: undefined, minHeight: 132, paddingVertical: tokens.spacing.two, textAlignVertical: 'top' },
  pinIndicators: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.two,
    paddingHorizontal: 20,
  },
  pinIndicator: {
    width: 8, height: 8, borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.textPlaceholder,
  },
  pinIndicatorFilled: { backgroundColor: tokens.color.darkNavy },
});
