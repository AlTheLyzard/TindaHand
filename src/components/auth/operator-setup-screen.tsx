import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { BackHandler, Platform, Text, View } from 'react-native';
import { AuthBackground } from './auth-background';
import { RegistrationProgress } from './registration-progress';
import { RegistrationToast } from './registration-toast';
import { SuccessMark } from './success-mark';
import { CredentialForm } from '@/components/settings/credential-form';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Button } from '@/components/ui/button';
import { useLeaveOnce } from '@/hooks/use-leave-once';
import { useAuthFlow } from '@/state/auth-flow';
import { createKahera } from '@/services/kahera-api';
import type { Cashier } from '@/types/settings';
import type { AvatarId } from '@/types/profile';

export function OperatorSetupScreen() {
  const { owner, completion } = useAuthFlow();
  const leave = useLeaveOnce();
  const [created, setCreated] = useState<Cashier | null>(null);
  const [toast, setToast] = useState<number | null>(null);
  const dismiss = useCallback(() => setToast(null), []);
  const dashboard = () => leave(() => { if (router.canDismiss()) router.dismissAll(); router.replace('/owner-dashboard'); });
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { if (router.canDismiss()) router.dismissAll(); router.replace('/owner-dashboard'); return true; });
    return () => listener.remove();
  }, []));
  if (!owner || !completion) return <Redirect href="/choose-account" />;
  return <AuthBackground><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
    <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5">
      <RegistrationProgress step={2} />
      {!created ? <>
        <Text accessibilityRole="header" className="mt-8 text-center type-h2-section leading-[32px] text-brand">Set up your Kahera{'\n'}Account</Text>
        <Text className="mb-6 mt-2 text-center type-helper text-brand">Add a Kahera to help you manage your store.</Text>
        <View className="mx-auto mb-6 mt-2 min-h-14 w-full max-w-[280px] items-center justify-center rounded-[12px] border border-bright-blue bg-ice-container px-4 py-3">
          <Text className="type-title-accent leading-7 text-brand">{owner.id}</Text>
        </View>
        <View className="flex-1">
          <CredentialForm mode="create" showReviewLabel={false} setupValidationCopy
            labelOverrides={{ name: 'Kahera Name', pin: 'Enter Kahera PIN', confirmPin: 'Confirm PIN' }}
            onCancel={dashboard} onSave={async values => {
              const result = await createKahera({ name: values.name, pin: values.pin });
              if (!result.ok) return result;
              const cashier: Cashier = {
                id: result.value.id,
                ownerId: result.value.ownerId,
                name: result.value.name,
                status: result.value.status,
                avatarId: (result.value.avatarId ?? 'avatar-01') as AvatarId,
              };
              return { ok: true as const, value: cashier };
            }} onSuccess={value => { setCreated(value); setToast(Date.now() + 15000); }} />
        </View>
      </> : <>
        <RegistrationToast expiresAt={toast} onDismiss={dismiss} />
        <View className="mt-4"><SuccessMark animate eventKey={created.id} /></View>
        <Text accessibilityRole="header" className="my-6 type-large-metric leading-[42px] text-brand">Kahera Account Created Successfully!</Text>
        <View className="mt-8 rounded-[20px] bg-brand px-5 py-6">
          <View className="mb-5 flex-row items-center gap-4">
            <ProfileAvatar avatarId={created.avatarId} size={52} />
            <Text className="flex-1 type-label-nav leading-[18px] text-white">Kahera details</Text>
          </View>
          <Text className="type-label-nav leading-[18px] text-white">Kahera Name</Text>
          <Text className="mt-1 type-large-metric leading-[40px] text-white">{created.name}</Text>
          <View className="my-4 h-px bg-white/50" />
          <Text className="type-label-nav leading-[18px] text-white">Associated May-Ari ID</Text>
          <Text className="mt-1 type-large-metric leading-[40px] text-white">{owner.id}</Text>
        </View>
        <Text className="mt-4 type-helper leading-[20px] text-text-secondary">Use this May-Ari ID and your four-digit Kahera PIN to log in.</Text>
        <View className="min-h-12 flex-1" />
        <Button onPress={dashboard}>Go to Dashboard</Button>
      </>}
    </View>
  </ScrollView></KeyboardAvoidingView></AuthBackground>;
}
