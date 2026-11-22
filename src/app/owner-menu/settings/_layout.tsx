import tokens from '@/constants/design-tokens.json';
import { Redirect, Stack } from 'expo-router';
import { useAuthFlow } from '@/state/auth-flow';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { Text, View } from 'react-native';

export default function SettingsLayout() {
  const { owner, restoring } = useAuthFlow();
  const motion = useStackMotion();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!owner) return <Redirect href="/choose-account" />;
  return <Stack screenOptions={{ ...motion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} />;
}
