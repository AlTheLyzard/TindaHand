import tokens from '@/constants/design-tokens.json';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuthFlow } from '@/state/auth-flow';

/** All POS routes enforce the mock session; the shared cart survives navigation. */
export default function OwnerPosLayout() {
  const stackMotion = useStackMotion();
  const { owner, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!owner) {
    return <Redirect href="/choose-account" />;
  }
  return <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} />;
}
