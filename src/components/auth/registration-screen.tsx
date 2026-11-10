import type { TextInputInstance, ScrollViewInstance } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform,
  ScrollView, Text, View,
} from 'react-native';
import { AuthBackground } from './auth-background';

import { AuthHeader } from '@/components/auth/auth-header';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { registerOwner } from '@/services/registration';
import { useAuthFlow } from '@/state/auth-flow';
import type { RegistrationErrors, RegistrationField, RegistrationService } from '@/types/auth';
import { PASSWORD_HELP_KEY, validateRegistration } from '@/utils/registration';
import { createRegistrationRequest } from '@/utils/registration-request';

const fieldOrder: RegistrationField[] = ['name', 'email', 'password', 'confirmPassword', 'pin', 'confirmPin'];

export function RegistrationScreen({ onBack, onCancel, onContinue, service = registerOwner }: {
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
  service?: RegistrationService;
}) {
  const { t } = useTranslation();
  const { draft: values, setDraft: setValues, setRegistrationPreview, setCompletion, setDashboardAccess, setAccounts, refreshSession } = useAuthFlow();
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<RegistrationField, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [serverErrors, setServerErrors] = useState<RegistrationErrors>({});
  const locked = useRef(false);
  const request = useRef(createRegistrationRequest(service));
  const inputs = useRef<Partial<Record<RegistrationField, TextInputInstance | null>>>({});
  const clientErrors = validateRegistration(values);
  const errors: RegistrationErrors = {};
  for (const field of fieldOrder) {
    if (submitted || touched[field]) errors[field] = clientErrors[field] ?? serverErrors[field];
  }
  const disabled = busy;
  const focused = useRef(true);
  const scroll = useRef<ScrollViewInstance>(null);
  const fieldOffsets = useRef<Partial<Record<RegistrationField, number>>>({});
  const cardOffset = useRef(0);

  function focusField(field: RegistrationField) {
    // Let validation messages lay out before scrolling, then focus after the
    // scroll settles so the keyboard/scroll responder cannot steal initial focus.
    requestAnimationFrame(() => {
      if (!focused.current) return;
      scroll.current?.scrollTo({ y: Math.max(0, cardOffset.current + (fieldOffsets.current[field] ?? 0) - 24), animated: false });
      requestAnimationFrame(() => { if (focused.current) inputs.current[field]?.focus(); });
    });
  }

  useFocusEffect(useCallback(() => {
    focused.current = true;
    locked.current = false;
    setBusy(false);
    return () => { focused.current = false; };
  }, []));

  function update(field: RegistrationField, value: string) {
    setTouched((current) => ({ ...current, [field]: true }));
    setValues((current) => ({
      ...current,
      [field]: field === 'pin' || field === 'confirmPin' ? value.replace(/[^0-9]/g, '').slice(0, 4) : value,
    }));
    setRegistrationPreview(false);
    setCompletion(null);
    setDashboardAccess(false);
    setRequestError('');
    setServerErrors((current) => {
      const next = { ...current };
      delete next[field];
      if (field === 'password') delete next.confirmPassword;
      if (field === 'pin') delete next.confirmPin;
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
          setAccounts((current) => ({ ...current, owner: result.account }));
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
    <AuthBackground>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'web' ? 'none' : 'on-drag'}
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[460px] flex-1 self-center px-6 pb-4 pt-5">
            <View className="-mx-1">
              <AuthHeader showWordmark={false} onBack={() => { if (!locked.current) { Keyboard.dismiss(); onBack(); } }} />
            </View>
            <View
              accessible
              accessibilityLabel={t('auth.progress', { step: 1 })}
              className="mb-5 mt-4 flex-row items-center justify-center">
              {[1, 2, 3].map((step) => (
                <View key={step} className="flex-row items-center">
                  {step > 1 && <View className="mx-1 h-px w-10 bg-[#AFC8E8]" />}
                  <View className={`min-h-[20px] min-w-[24px] items-center justify-center rounded-full border border-action px-1 ${step === 1 ? 'bg-action' : 'bg-white'}`}>
                    <Text className={`font-poppins-bold text-[12px] leading-[18px] ${step === 1 ? 'text-white' : 'text-action'}`}>
                      {step}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            <Text accessibilityRole="header" className="text-center font-poppins-bold text-[22px] leading-[30px] text-brand">{t('auth.registration.title')}</Text>
            <Text className="mt-0.5 text-center font-poppins text-[10px] leading-[15px] text-text-secondary">{t('auth.registration.instructions')}</Text>

            <View onLayout={event => { cardOffset.current = event.nativeEvent.layout.y; }} className="mx-1 mt-4 gap-6 rounded-[20px] bg-[#D9E7F5] px-5 py-8">
              <Text className="font-poppins text-[10px] text-text-secondary">Fields marked * are required.</Text>
              {fieldOrder.map((field, index) => {
                const label = { name: t('fields.name'), email: 'Email Address', password: t('fields.password'), confirmPassword: t('fields.confirmPassword'), pin: t('fields.pin'), confirmPin: t('fields.confirmPin') }[field];
                const pin = field === 'pin' || field === 'confirmPin';
                return (
                  <View key={field} onLayout={event => { fieldOffsets.current[field] = event.nativeEvent.layout.y; }}>
                  <FormField
                    ref={(input) => { inputs.current[field] = input; }}
                    label={label}
                    onFocus={() => scroll.current?.scrollTo({ y: Math.max(0, cardOffset.current + (fieldOffsets.current[field] ?? 0) - 24), animated: false })}
                    requiredIndicator="asterisk"
                    value={values[field]}
                    onChangeText={(value) => update(field, value)}
                    onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
                    error={errors[field]}
                    errorVariant="registration"
                    editable={!busy}
                    help={field === 'password' ? t(PASSWORD_HELP_KEY) : undefined}
                    password={field === 'password' || field === 'confirmPassword'}
                    pin={pin}
                    pinIndicators={pin}
                    pinVisibilityToggle={pin}
                    placeholder={pin ? undefined : field === 'email' ? 'name@gmail.com' : field === 'name' ? t('fields.namePlaceholder') : field === 'password' ? t('fields.passwordPlaceholder') : t('fields.confirmPasswordPlaceholder')}
                    keyboardType={pin ? 'number-pad' : field === 'email' ? 'email-address' : 'default'}
                    maxLength={pin ? 4 : undefined}
                    autoCapitalize={field === 'name' ? 'words' : 'none'}
                    autoComplete={field === 'name' ? 'name' : field === 'email' ? 'email' : field === 'password' || field === 'confirmPassword' ? 'new-password' : 'off'}
                    returnKeyType={index === fieldOrder.length - 1 ? 'done' : 'next'}
                    submitBehavior="submit"
                    onSubmitEditing={() => {
                      if (index === fieldOrder.length - 1) void submit();
                      else inputs.current[fieldOrder[index + 1]]?.focus();
                    }}
                  />
                  </View>
                );
              })}
            </View>

            <View className="mt-4 gap-3">
              <Text className="text-center font-poppins text-[10px] leading-[15px] text-brand">{t('auth.registration.privacy')}</Text>
              {requestError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="font-poppins text-[12px] leading-[18px] text-[#B42318]">{requestError}</Text> : null}
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
