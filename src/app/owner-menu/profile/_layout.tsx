import tokens from '@/constants/design-tokens.json';
import { Redirect, Stack } from 'expo-router';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { Text, View } from 'react-native';

export default function ProfileLayout() {
  const motion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!hasCapability(deviceSession, 'manage-operators')) return <Redirect href="/choose-account" />;
  return <Stack screenOptions={{ ...motion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} />;
}
