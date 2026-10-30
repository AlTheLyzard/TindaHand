import { MotionLayout, MotionRegion } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useTranslation } from '@/i18n/use-translation';
import { useState, type Ref } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type TextInputInstance } from 'react-native';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  help?: string;
  password?: boolean;
  pin?: boolean;
  errorVariant?: 'default' | 'registration';
  prefix?: string;
  ref?: Ref<TextInputInstance>;
  required?: boolean;
};

export function FormField({ label, error, help, password, pin, prefix, errorVariant = 'default', ref, required = true, ...props }: FormFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <MotionLayout>
      <Text className="mb-1 font-poppins-bold text-[12px] leading-[18px] text-brand">
        {required ? t('fields.requiredLabel', { label }) : label}
      </Text>
      <View
        className="min-h-[48px] flex-row items-center rounded-[10px] border bg-white"
        style={[
          styles.shadow,
          { borderColor: error ? '#B42318' : focused ? '#245399' : '#FFFFFF' },
          error && errorVariant === 'registration' ? { backgroundColor: '#F1EAF1', borderColor: '#C96F74' } : undefined,
        ]}>
        {prefix && <Text accessible={false} className="pl-3 font-poppins-bold text-[12px] text-text-secondary">{prefix}</Text>}
        <TextInput
          {...props}
          ref={ref}
          accessibilityLabel={required ? t('fields.requiredAccessibility', { label }) : label}
          accessibilityHint={error || help || (pin ? t('fields.pinHint') : undefined)}
          autoCorrect={false}
          spellCheck={false}
          secureTextEntry={pin || (password && !visible)}
          placeholderTextColor={pin ? '#A3AFBF' : '#4A607A'}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          className={`min-h-[48px] min-w-0 flex-1 ${prefix ? 'pl-1 pr-5' : 'px-5'} py-3 font-poppins-bold text-[12px] leading-[18px] text-text-secondary ${errorVariant === 'registration' ? 'web:focus:outline-none' : ''}`}
        />
        {password && (
          <Pressable
            onPress={() => setVisible((current) => !current)}
            accessibilityRole="button"
            disabled={props.editable === false}
            accessibilityLabel={t(visible ? 'fields.hide' : 'fields.show', { label: label.toLowerCase() })}
            className="min-h-[48px] w-12 items-center justify-center rounded-[10px] active:bg-[#D9E7F5]">
            <View accessible={false} style={styles.eye}>
              <View style={styles.pupil} />
              {!visible && <View style={styles.slash} />}
            </View>
          </Pressable>
        )}
        {pin && (
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
