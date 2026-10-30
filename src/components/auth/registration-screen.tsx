import type { TextInputInstance } from 'react-native';
import { useTranslation } from '@/i18n/use-translation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  AccessibilityInfo, Keyboard, KeyboardAvoidingView, Platform,
  ScrollView, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthHeader } from '@/components/auth/auth-header';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { registrationPreviewId } from '@/data/registration-preview';
import { registerOwner } from '@/services/registration';
import { useAuthFlow } from '@/state/auth-flow';
import type { RegistrationErrors, RegistrationField, RegistrationService } from '@/types/auth';
import { PASSWORD_HELP_KEY, validateRegistration } from '@/utils/registration';
import { createRegistrationRequest } from '@/utils/registration-request';

const fieldOrder: RegistrationField[] = ['name', 'password', 'confirmPassword', 'pin', 'confirmPin'];

export function RegistrationScreen({ onBack, onCancel, onContinue, service = registerOwner }: {
  onBack: () => void;
  onCancel: () => void;
  onContinue: () => void;
  service?: RegistrationService;
}) {
  const { t } = useTranslation();
  const { draft: values, setDraft: setValues, setRegistrationPreview, setCompletion, setDashboardAccess, setAccounts } = useAuthFlow();
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
  const disabled = busy || (submitted && Object.keys(clientErrors).length > 0);
  const focused = useRef(true);

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

  async function submit(preview = false) {
    if (locked.current) return;
    setSubmitted(true);
    const nextErrors = validateRegistration(values);
    const firstInvalid = fieldOrder.find((field) => nextErrors[field]);
    if (firstInvalid) {
      inputs.current[firstInvalid]?.focus();
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
      if (preview && __DEV__) {
        setRegistrationPreview(true);
        setAccounts((current) => ({ ...current, owner: { name: values.name.trim(), id: registrationPreviewId } }));
        setCompletion({ mode: 'preview', name: values.name.trim(), id: registrationPreviewId, toastExpiresAt: Date.now() + 15000 });
        navigated = true;
        onContinue();
      } else {
        const result = await request.current(values);
        if (result?.status === 'confirmed') {
          setAccounts((current) => ({ ...current, owner: result.account }));
          setRegistrationPreview(false);
          setCompletion({ mode: 'confirmed', name: result.account.name, id: result.account.id, toastExpiresAt: Date.now() + 15000 });
          // Credentials are no longer needed once the backend has confirmed creation.
          setValues({ name: '', password: '', confirmPassword: '', pin: '', confirmPin: '' });
          if (focused.current) { navigated = true; onContinue(); }
        } else if (result?.status === 'error') {
          setRequestError(result.message);
          setServerErrors(result.fields ?? {});
          const firstField = fieldOrder.find((field) => result.fields?.[field]);
          if (firstField) inputs.current[firstField]?.focus();
          AccessibilityInfo.announceForAccessibility(result.message);
        }
      }
    } finally {
      if (!navigated) {
        locked.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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

            <View className="mx-1 mt-4 gap-6 rounded-[20px] bg-[#D9E7F5] px-5 py-8">
              {fieldOrder.map((field, index) => {
                const label = { name: t('fields.name'), password: t('fields.password'), confirmPassword: t('fields.confirmPassword'), pin: t('fields.pin'), confirmPin: t('fields.confirmPin') }[field];
                const pin = field === 'pin' || field === 'confirmPin';
                return (
                  <FormField
                    key={field}
                    ref={(input) => { inputs.current[field] = input; }}
                    label={label}
                    value={values[field]}
                    onChangeText={(value) => update(field, value)}
                    onBlur={() => setTouched((current) => ({ ...current, [field]: true }))}
                    error={errors[field]}
                    errorVariant="registration"
                    editable={!busy}
                    help={field === 'password' ? t(PASSWORD_HELP_KEY) : undefined}
                    password={field === 'password' || field === 'confirmPassword'}
                    pin={pin}
                    placeholder={pin ? '●●●●' : field === 'name' ? t('fields.namePlaceholder') : field === 'password' ? t('fields.passwordPlaceholder') : t('fields.confirmPasswordPlaceholder')}
                    keyboardType={pin ? 'number-pad' : 'default'}
                    maxLength={pin ? 4 : undefined}
                    autoCapitalize={field === 'name' ? 'words' : 'none'}
                    autoComplete={field === 'name' ? 'name' : 'off'}
                    returnKeyType={index === fieldOrder.length - 1 ? 'done' : 'next'}
                    submitBehavior="submit"
                    onSubmitEditing={() => {
                      if (index === fieldOrder.length - 1) void submit();
                      else inputs.current[fieldOrder[index + 1]]?.focus();
                    }}
                  />
                );
              })}
            </View>

            <View className="mt-4 gap-3">
              <Text className="text-center font-poppins text-[10px] leading-[15px] text-brand">{t('auth.registration.privacy')}</Text>
              {requestError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="font-poppins text-[12px] leading-[18px] text-[#B42318]">{requestError}</Text> : null}
              <Button disabled={disabled} loading={busy} onPress={() => { void submit(); }}>
                {busy ? t('auth.registration.creating') : t('auth.registration.submit')}
              </Button>
              <Button disabled={busy} variant="secondary" onPress={() => { Keyboard.dismiss(); onCancel(); }}>{t('common.cancel')}</Button>
              {__DEV__ && (
                <View className="mt-3 gap-2 rounded-[10px] border border-[#7399CC] p-3">
                  <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{t('auth.registration.preview')}</Text>
                  <Button disabled={disabled} variant="secondary" onPress={() => { void submit(true); }}>{t('auth.registration.previewAction')}</Button>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
