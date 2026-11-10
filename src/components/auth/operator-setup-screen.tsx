import { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { AuthBackground } from './auth-background';
import { RegistrationProgress } from './registration-progress';
import { RegistrationToast } from './registration-toast';
import { SuccessMark } from './success-mark';
import { CredentialForm } from '@/components/settings/credential-form';
import { OwnerStoreCard } from '@/components/settings/settings-ui';
import { Button } from '@/components/ui/button';
import { useAuthFlow } from '@/state/auth-flow';
import { authenticationService } from '@/services/authentication';
import type { Cashier } from '@/types/settings';

export function OperatorSetupScreen() {
  const { owner, completion } = useAuthFlow();
  const [created, setCreated] = useState<Cashier | null>(null);
  const [toast, setToast] = useState<number | null>(null);
  const dismiss = useCallback(() => setToast(null), []);
  const dashboard = () => { router.dismissAll(); router.replace('/owner-dashboard'); };
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { router.dismissAll(); router.replace('/owner-dashboard'); return true; });
    return () => listener.remove();
  }, []));
  if (!owner || !completion) return <Redirect href="/choose-account" />;
  return <AuthBackground><KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
    <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5">
      <RegistrationProgress step={3} />
      {!created ? <>
        <Text accessibilityRole="header" className="mt-8 text-center font-poppins-bold text-[22px] leading-[32px] text-brand">Set up your Operator Account</Text>
        <Text className="mb-6 mt-2 text-center font-poppins text-[10px] text-brand">Add an Operator to help you manage your store.</Text>
        <OwnerStoreCard owner={owner} compact />
        <View className="flex-1">
          <CredentialForm mode="create" fieldsCard onCancel={dashboard} onSave={values => authenticationService.createOperator(values)} onSuccess={value => { setCreated(value); setToast(Date.now() + 15000); }} />
        </View>
      </> : <>
        <RegistrationToast expiresAt={toast} onDismiss={dismiss} />
        <View className="mt-4"><SuccessMark animate /></View>
        <Text accessibilityRole="header" className="my-6 font-poppins-bold text-[30px] leading-[42px] text-brand">Operator Account Created Successfully!</Text>
        <View className="gap-3 rounded-[16px] bg-white p-5">
          <Text className="font-poppins text-[12px] text-brand">Operator Name</Text>
          <Text className="font-poppins-bold text-[18px] text-brand">{created.name}</Text>
          <View className="h-px bg-[#ADC9EE]" />
          <Text className="font-poppins text-[12px] text-brand">Associated Owner ID</Text>
          <Text className="font-poppins-bold text-[18px] text-brand">{owner.id}</Text>
          <View className="h-px bg-[#ADC9EE]" />
          <Text className="font-poppins text-[12px] leading-[20px] text-brand">For Operator login, use this Owner ID and the assigned four-digit Operator PIN.</Text>
        </View>
        <View className="min-h-12 flex-1" />
        <Text className="my-4 text-center font-poppins-bold text-[12px] text-brand">Setup is complete. Continue to your Dashboard.</Text>
        <Button onPress={dashboard}>Go to Dashboard</Button>
      </>}
    </View>
  </ScrollView></KeyboardAvoidingView></AuthBackground>;
}
