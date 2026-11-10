import { IconButton } from '@/components/ui/button';
import { MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import tokens from '@/constants/design-tokens.json';
import { useTranslation } from '@/i18n/use-translation';
import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, type TextInputProps, type TextInputInstance } from 'react-native';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  help?: string;
  password?: boolean;
  pin?: boolean;
  pinIndicators?: boolean;
  pinVisibilityToggle?: boolean;
  errorVariant?: 'default' | 'registration';
  prefix?: string;
  ref?: Ref<TextInputInstance>;
  required?: boolean;
  requiredIndicator?: 'text' | 'asterisk';
};

export function FormField({ label, error, help, password, pin, pinIndicators = false, pinVisibilityToggle = false, prefix, errorVariant = 'default', ref, required = true, requiredIndicator = 'text', ...props }: FormFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const selection = useRef<{ start: number; end: number }>({ start: props.value?.length ?? 0, end: props.value?.length ?? 0 });
  const [restoredSelection, setRestoredSelection] = useState<{ start: number; end: number }>();
  useImperativeHandle(ref, () => input.current!, []);
  const showPinIndicators = pin && pinIndicators && !visible;

  return (
    <MotionLayout>
      <Text className="mb-1 font-poppins-bold text-[12px] leading-[18px] text-brand">
        {required && requiredIndicator === 'text' ? t('fields.requiredLabel', { label }) : label}
        {required && requiredIndicator === 'asterisk' && <Text className="text-[#B42318]"> *</Text>}
      </Text>
      <View
        className="min-h-[48px] flex-row items-center rounded-[10px] border bg-white"
        style={[
          styles.shadow,
          { borderColor: error ? '#B42318' : focused ? '#245399' : '#BCD3EE' },
          error && errorVariant === 'registration' ? { backgroundColor: '#F1EAF1', borderColor: '#C96F74' } : undefined,
        ]}>
        {prefix && <Text accessible={false} className="pl-3 font-poppins-bold text-[12px] text-text-secondary">{prefix}</Text>}
        <View style={styles.inputContainer}>
          <TextInput
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
            accessibilityHint={help || (pin ? t('fields.pinHint') : undefined)}
            autoCorrect={false}
            spellCheck={false}
            secureTextEntry={(pin && !(pinVisibilityToggle && visible)) || (password && !visible)}
            placeholderTextColor={props.placeholderTextColor ?? '#A3AFBF'}
            placeholder={showPinIndicators ? undefined : props.placeholder}
            caretHidden={showPinIndicators || props.caretHidden}
            selectionColor={showPinIndicators ? 'transparent' : props.selectionColor}
            onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
            onBlur={(event) => {
              setFocused(false);
              props.onBlur?.(event);
            }}
            className={`min-h-[48px] min-w-0 flex-1 ${prefix ? 'pl-1 pr-5' : 'px-5'} py-3 font-poppins-bold text-[12px] leading-[18px] ${showPinIndicators ? 'text-transparent' : 'text-text-secondary'} web:focus:outline-none`}
            style={[props.style, showPinIndicators && styles.maskedInput]}
          />
          {showPinIndicators && (
            // Keep the native secure input for editing and accessibility. Only this
            // decorative row draws the masks, with identical geometry in every state.
            <View pointerEvents="none" accessible={false} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.pinIndicators}>
              {Array.from({ length: props.maxLength ?? 4 }, (_, index) => (
                <View key={index} style={[styles.pinIndicator, index < (props.value?.length ?? 0) && styles.pinIndicatorFilled]} />
              ))}
            </View>
          )}
        </View>
        {(password || (pin && pinVisibilityToggle)) && (
          <IconButton
            onPress={() => {
              // Web selection events can lag behind a visibility-button click.
              // Native platforms use the selection reported by TextInput itself.
              const webInput = Platform.OS === 'web' ? input.current as unknown as { selectionStart: number | null; selectionEnd: number | null } : null;
              const current = webInput ? { start: webInput.selectionStart ?? selection.current.start, end: webInput.selectionEnd ?? selection.current.end } : selection.current;
              input.current?.focus();
              setRestoredSelection({ ...current });
              setVisible(current => !current);
            }}
            accessibilityRole="button"
            disabled={props.editable === false}
            accessibilityLabel={t(visible ? 'fields.hide' : 'fields.show', { label: label.toLowerCase() })}
            icon={({ color }) => <View accessible={false} style={[styles.eye, { borderColor: color }]}>
              <View style={[styles.pupil, { backgroundColor: color }]} />
              {!visible && <View style={[styles.slash, { backgroundColor: color }]} />}
            </View>} />
        )}
        {pin && !pinVisibilityToggle && (
          <Text accessible={false} className="pr-5 font-poppins-bold text-[12px] text-text-secondary">{t('fields.pinLength')}</Text>
        )}
      </View>
      {help && !(error && errorVariant === 'registration') && (
        <Text className="mt-2 font-poppins text-[10px] leading-[15px] text-text-secondary">
          {help}
        </Text>
      )}
      {error && (
        <MotionRegion><Text accessibilityRole="alert" accessibilityLiveRegion="polite" className={errorVariant === 'registration'
          ? 'mt-2 font-poppins text-[10px] leading-[15px] text-[#B42318]'
          : 'mt-2 font-poppins text-[12px] leading-[18px] text-[#B42318]'}>
          {error}
        </Text></MotionRegion>
      )}
    </MotionLayout>
  );
}

const styles = StyleSheet.create({
  inputContainer: { flex: 1, minWidth: 0, position: 'relative' },
  maskedInput: { color: 'transparent' },
  pinIndicators: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.two,
    paddingHorizontal: 20,
  },
  pinIndicator: {
    width: 8, height: 8, borderRadius: tokens.radius.pill,
    backgroundColor: '#A3AFBF',
  },
  pinIndicatorFilled: { backgroundColor: tokens.color.textSecondary },
  shadow: { boxShadow: '0 3px 3px rgba(115, 153, 204, 0.45)' },
  eye: {
    width: 15, height: 10, borderWidth: 1.5, borderColor: '#245399',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  pupil: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#245399' },
  slash: {
    position: 'absolute', width: 18, height: 1.5, backgroundColor: '#245399',
    transform: [{ rotate: '45deg' }],
  },
});
