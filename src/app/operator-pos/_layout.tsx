import tokens from '@/constants/design-tokens.json';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

/** Guard every Operator POS subroute, including direct cart and payment links. */
export default function OperatorPosLayout() {
  const stackMotion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  return <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} />;
}
