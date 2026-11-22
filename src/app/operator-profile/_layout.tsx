import tokens from '@/constants/design-tokens.json';
import { useEffect, type ReactNode } from 'react';
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { OperatorProfileDraftProvider, useOperatorProfileDraft } from '@/state/operator-profile-draft';
import { hasCapability } from '@/utils/operator-access';

function ClearStaleDraft({ children }: { children: ReactNode }) {
  const { deviceSession, restoring } = useAuthFlow();
  const { clear } = useOperatorProfileDraft();
  useEffect(() => {
    if (!restoring && deviceSession?.role !== 'operator') clear();
  }, [clear, deviceSession?.role, restoring]);
  return children;
}

export default function OperatorProfileLayout() {
  const motion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'profile')) return <Redirect href="/choose-account" />;
  return <OperatorProfileDraftProvider><ClearStaleDraft><Stack screenOptions={{ ...motion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} /></ClearStaleDraft></OperatorProfileDraftProvider>;
}
