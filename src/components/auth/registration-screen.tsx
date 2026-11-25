import { KeyboardViewport as KeyboardAvoidingView, KeyboardAwareScrollView as ScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { useTranslation } from '@/i18n/use-translation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { TextInputInstance } from 'react-native';
import { AccessibilityInfo, Keyboard, Platform, Text, View } from 'react-native';
import { AuthBackground } from './auth-background';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { registerOwner } from '@/services/registration';
import { useAuthFlow } from '@/state/auth-flow';
import type { RegistrationErrors, RegistrationField, RegistrationService } from '@/types/auth';
import { PASSWORD_HELP_KEY, validateRegistration } from '@/utils/registration';
import { createRegistrationRequest } from '@/utils/registration-request';

const fieldOrder: RegistrationField[] = ['name', 'email', 'password', 'confirmPassword', 'pin', 'confirmPin'];

export function RegistrationScreen({ onCancel, onContinue, service = registerOwner }: {
  onCancel: () => void;
  onContinue: () => void;
  service?: RegistrationService;
}) {
  const { t } = useTranslation();
  const { draft: values, setDraft: setValues, setRegistrationPreview, setCompletion, setDashboardAccess, refreshSession } = useAuthFlow();
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [serverErrors, setServerErrors] = useState<RegistrationErrors>({});
  const locked = useRef(false);
  const request = useRef<ReturnType<typeof createRegistrationRequest>>(null!);
  useFocusEffect(useCallback(() => {
  request.current = createRegistrationRequest(service);
  }, [service]));
  const inputs = useRef<Partial<Record<RegistrationField, TextInputInstance | null>>>({});
  const clientErrors = validateRegistration(values);
  const errors: RegistrationErrors = {};
  for (const field of fieldOrder) {
    if (submitted || touched[field]) errors[field] = clientErrors[field] ?? serverErrors[field];
  }
  const disabled = busy;
  const focused = useRef(true);

  function focusField(field: RegistrationField) {
    // Let validation messages lay out; the shared viewport tracks focus and the
    // subsequent keyboard/layout changes without pre-scrolling stale offsets.
    requestAnimationFrame(() => {
      if (!focused.current) return;
      inputs.current[field]?.focus();
    });
  }

  useFocusEffect(useCallback(() => {
    focused.current = true;
    locked.current = false;
    setBusy(false);
    return () => { focused.current = false; };
  }, []));

  function update(field: RegistrationField, value: string) {
    setTouched((current) => current[field] ? current : { ...current, [field]: true });
    setValues((current) => ({
      ...current,
      [field]: field === 'pin' || field === 'confirmPin' ? value.replace(/[^0-9]/g, '').slice(0, 4) : value,
    }));
    setRegistrationPreview(false);
    setCompletion(null);
    setDashboardAccess(false);
    setRequestError('');
    setServerErrors((current) => {
      const fieldsToClear: RegistrationField[] = [field];
      if (field === 'password') fieldsToClear.push('confirmPassword');
      if (field === 'pin') fieldsToClear.push('confirmPin');
      if (fieldsToClear.every(key => !current[key])) return current;
      const next = { ...current };
      fieldsToClear.forEach(key => { delete next[key]; });
      return next;
    });
  }

  async function submit() {
    if (locked.current) return;
    setSubmitted(true);
    const nextErrors = validateRegistration(values);
    const firstInvalid = fieldOrder.find((field) => nextErrors[field]);
    if (firstInvalid) {
      focusField(firstInvalid);
      AccessibilityInfo.announceForAccessibility(nextErrors[firstInvalid]!);
      return;
    }
    Keyboard.dismiss();
    setDashboardAccess(false);
    locked.current = true;
    setBusy(true);
    setRequestError('');
    setServerErrors({});
    let navigated = false;
    try {
        const result = await request.current(values);
        if (!focused.current) return;
        if (result?.status === 'confirmed') {
          setRegistrationPreview(false);
          setCompletion({ mode: 'confirmed', name: result.account.name, id: result.account.id, toastExpiresAt: Date.now() + 15000 });
          // Credentials are no longer needed once the backend has confirmed creation.
          setValues({ name: '', email: '', password: '', confirmPassword: '', pin: '', confirmPin: '' });
          await refreshSession();
          if (focused.current) { navigated = true; onContinue(); }
        } else if (result?.status === 'error') {
          setRequestError(result.message);
          setServerErrors(result.fields ?? {});
          const firstField = fieldOrder.find((field) => result.fields?.[field]);
          if (firstField) focusField(firstField);
          AccessibilityInfo.announceForAccessibility(result.message);
        }
    } finally {
      if (!navigated) {
        locked.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <AuthBackground headerWave>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[460px] flex-1 self-center px-6 pb-4 pt-5">
            <View
              accessible
              accessibilityLabel={t('auth.progress', { step: 1 })}
              className="mb-5 mt-5 flex-row items-center justify-center">
              {[1, 2, 3].map((step) => (
                <View key={step} className="flex-row items-center">
                  {step > 1 && <View className="mx-1 h-px w-10 bg-outline" />}
                  <View className={`min-h-9 min-w-9 items-center justify-center rounded-full border border-action ${step === 1 ? 'bg-action' : 'bg-white'}`}>
                    <Text className={` type-label-nav leading-[18px] ${step === 1 ? 'text-white' : 'text-action'}`}>
                      {step}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text accessibilityRole="header" className="text-center type-large-metric leading-[40px] text-brand">{t('auth.registration.title')}</Text>
            <Text className="mt-0.5 text-center type-helper leading-[15px] text-text-secondary">{t('auth.registration.instructions')}</Text>

            <View className="mt-4 gap-3">
              {fieldOrder.map((field, index) => {
                const label = { name: t('fields.name'), email: 'Email Address', password: t('fields.password'), confirmPassword: t('fields.confirmPassword'), pin: t('fields.pin'), confirmPin: t('fields.confirmPin') }[field];
                const pin = field === 'pin' || field === 'confirmPin';
                return (
                  <View key={field}>
                  <FormField
                    ref={(input) => { inputs.current[field] = input; }}
                    label={label}
                    requiredIndicator="asterisk"
                    value={values[field]}
                    onChangeText={(value) => update(field, value)}
                    onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
                    error={errors[field]}
                    errorVariant="registration"
                    editable={!busy}
                    help={field === 'password' ? t(PASSWORD_HELP_KEY) : undefined}
                    password={field === 'password' || field === 'confirmPassword'}
                    passwordIndicators={field === 'password' || field === 'confirmPassword'}
                    pin={pin}
                    pinIndicators={pin}
                    placeholder={pin ? undefined : field === 'email' ? 'name@gmail.com' : field === 'name' ? t('fields.namePlaceholder') : field === 'password' ? t('fields.passwordPlaceholder') : t('fields.confirmPasswordPlaceholder')}
                    keyboardType={pin ? 'number-pad' : field === 'email' ? 'email-address' : 'default'}
                    maxLength={pin ? 4 : undefined}
                    autoCapitalize={field === 'name' ? 'words' : 'none'}
                    autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : field === 'password' || field === 'confirmPassword' ? 'new-password' : 'off'}
                    returnKeyType={index === fieldOrder.length - 1 ? 'done' : 'next'}
                    submitBehavior="submit"
                    onSubmitEditing={() => {
                      if (index === fieldOrder.length - 1) Keyboard.dismiss();
                      else inputs.current[fieldOrder[index + 1]]?.focus();
                    }}
                  />
                  </View>
                );
              })}
            </View>

            <View className="mt-4 gap-3">
              {requestError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className=" type-micro-caption leading-[18px] text-error-base">{requestError}</Text> : null}
              <Button disabled={disabled} loading={busy} onPress={() => { void submit(); }}>
                {t('auth.registration.submit')}
              </Button>
              <Button disabled={busy} variant="secondary" onPress={() => { Keyboard.dismiss(); onCancel(); }}>{t('common.cancel')}</Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}
