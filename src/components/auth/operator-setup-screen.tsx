import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { BackHandler, Platform, Text, View } from 'react-native';
import { AuthBackground } from './auth-background';
import { RegistrationProgress } from './registration-progress';
import { RegistrationToast } from './registration-toast';
import { SuccessMark } from './success-mark';
import { AccountIdCard } from './account-id-card';
import { CredentialForm } from '@/components/settings/credential-form';
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
        <View className="flex-1 justify-center pt-12">
          <SuccessMark animate eventKey={created.id} />
          <Text accessibilityRole="header" className="my-6 type-large-metric leading-[42px] text-brand">Kahera Account Created Successfully!</Text>
          <View className="mt-8">
            <AccountIdCard
              avatarId={created.avatarId}
              nameLabel="Kahera Name"
              name={created.name}
              idLabel="May-Ari ID"
              id={owner.id}
              footerText="Use this May-Ari ID and the four-digit Kahera PIN to log in."
            />
          </View>
        </View>
        <Button onPress={dashboard}>Go to Dashboard</Button>
      </>}
    </View>
  </ScrollView></KeyboardAvoidingView></AuthBackground>;
}
