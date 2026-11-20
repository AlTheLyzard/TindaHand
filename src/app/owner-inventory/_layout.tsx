import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';
import { useAuthFlow } from '@/state/auth-flow';
import { InventoryFeedback } from '@/components/inventory/inventory-ui';
import { Text, View } from 'react-native';

export default function InventoryLayout() {
  const stackMotion = useStackMotion();
  const { owner, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className="font-poppins text-[14px] text-brand">Restoring your session…</Text></View>;
  if (!owner) return <Redirect href="/choose-account" />;
  return <><Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: '#F0F8FF' } }} /><InventoryFeedback /></>;
}
