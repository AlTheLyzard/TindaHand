import type { TextInputInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useTranslation } from '@/i18n/use-translation';
import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthHeader } from '@/components/auth/auth-header';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { useAuthFlow } from '@/state/auth-flow';
import { demoOwner } from '@/data/mock-auth';
import type { AccountRole } from '@/types/auth';
import { validateLogin } from '@/utils/account-access';

/** Shared login screen; the opt-in mock adapter never contacts a backend. */
export function RoleLoginScreen({ role, onBack, onSuccess, loggedOut = false }: { role: AccountRole; onBack: () => void; onSuccess: () => void; loggedOut?: boolean }) {
  const { t } = useTranslation();
  const owner = role === 'owner';
  const title = owner ? t('auth.login.ownerTitle') : t('auth.login.cashierTitle');
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const gap = Math.max(8, Math.min(24, (height - insets.top - insets.bottom) * 0.02));
  const [id, setId] = useState('');
  const [pin, setPin] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<'auth.login.unavailable' | 'auth.login.recoveryUnavailable' | 'auth.mock.invalid' | null>(null);
  const idInput = useRef<TextInputInstance>(null);
  const pinInput = useRef<TextInputInstance>(null);
  const { registrationPreview, mockAuthEnabled, loginMockOwner } = useAuthFlow();
  const errors = submitted ? validateLogin(id, pin) : { id: undefined, pin: undefined };

  function submit() {
    setSubmitted(true);
    const invalid = validateLogin(id, pin);
    if (invalid.id) { idInput.current?.focus(); return; }
    if (invalid.pin) { pinInput.current?.focus(); return; }
    Keyboard.dismiss();
    if (owner && mockAuthEnabled) {
      if (loginMockOwner(role, id, pin)) { setId(''); setPin(''); onSuccess(); }
      else setNotice('auth.mock.invalid');
      return;
    }
    setNotice('auth.login.unavailable');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View className="w-full max-w-[460px] flex-1 self-center px-6" style={{ paddingTop: 20, paddingBottom: gap }}>
            <AuthHeader onBack={() => { Keyboard.dismiss(); onBack(); }} />
            {loggedOut && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="mt-3 font-poppins text-[14px] leading-[21px] text-[#1D5D21]">Logged out successfully.</Text>}
            {/* Match the chooser's mt-12 below the shared header. */}
            <View className="mt-12">
              <View className="px-2">
                <Text className="font-poppins-bold text-[12px] leading-[18px] text-[#2675DB]">
                  {owner ? t('auth.login.ownerEyebrow') : t('auth.login.cashierEyebrow')}
                </Text>
                <Text accessibilityRole="header" className="mt-2 font-poppins-bold text-[30px] leading-[42px] text-brand">{title}</Text>
                <Text className="mt-2 font-poppins text-[10px] leading-[15px] text-text-secondary">
                  {owner
                    ? t('auth.login.ownerInstructions')
                    : t('auth.login.cashierInstructions')}
                </Text>
                <View className="px-3" style={{ marginTop: gap, gap }}>
                  <FormField ref={idInput} label={t('fields.ownerId')} value={id} error={errors.id}
                    onChangeText={(value) => { setId(value); setNotice(null); }}
                    placeholder="TH-MA-0001" autoCapitalize="characters"
                    autoComplete="off" returnKeyType="next" submitBehavior="submit"
                    onSubmitEditing={() => pinInput.current?.focus()} />
                  <FormField ref={pinInput} label={owner ? t('fields.pin') : t('fields.cashierPin')} value={pin} error={errors.pin}
                    onChangeText={(value) => { setPin(value.replace(/[^0-9]/g, '').slice(0, 4)); setNotice(null); }}
                    placeholder="●●●●" pin keyboardType="number-pad" maxLength={4}
                    help={t('auth.login.pinHelp', { label: owner ? t('fields.pin') : t('fields.cashierPin') })}
                    autoComplete="off" returnKeyType="done" onSubmitEditing={submit} />
                </View>
              </View>
              {owner && mockAuthEnabled && <View className="mt-3 rounded-control bg-[#D9E7F5] p-3">
                <Text className="font-poppins-bold text-[12px] leading-[18px] text-brand">{t('auth.mock.title')}</Text>
                <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{t('auth.mock.credentials', { id: demoOwner.id, pin: demoOwner.pin })}</Text>
              </View>}
              {registrationPreview && (
                <Text style={{ marginTop: gap }} className="font-poppins text-[12px] leading-[18px] text-text-secondary">{t('auth.login.preview')}</Text>
              )}
              <View className="gap-2" style={{ marginTop: gap }}>
                <Button onPress={submit}>{t('auth.login.submit')}</Button>
                {notice ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="font-poppins text-[12px] leading-[18px] text-text-secondary">{t(notice)}</Text> : null}
                <Pressable accessibilityRole="button" onPress={() => setNotice('auth.login.recoveryUnavailable')}
                  className="min-h-12 justify-center self-start rounded px-2 active:bg-[#D9E7F5]">
                  <Text className="font-poppins text-[12px] text-action">{t('auth.login.forgotPin')}</Text>
                </Pressable>
              </View>
            </View>
            <View className="mx-3 mt-6 rounded-[10px] bg-[#C5D3E5] px-5 py-4">
              <Text className="font-poppins-bold text-[12px] leading-[18px] text-action">{t('auth.login.reminderTitle')}</Text>
              <Text className="mt-2 font-poppins text-[10px] leading-[15px] text-brand">{t('auth.login.reminder')}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
