import tokens from '@/constants/design-tokens.json';
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';

/** Each Settings child is guarded so direct links cannot expose an Operator's settings to another role. */
export default function OperatorSettingsLayout() {
  const motion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas">
    <Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text>
  </View>;
  if (!deviceSession || deviceSession.role !== 'operator') {
    return <Redirect href="/choose-account" />;
  }
  return <Stack screenOptions={{ ...motion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} />;
}
