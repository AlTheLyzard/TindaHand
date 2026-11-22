import { Redirect, Stack } from 'expo-router';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { PayableDraftProvider } from '@/state/payable-draft';
import { ReceivableDraftProvider } from '@/state/receivable-draft';
import { Text, View } from 'react-native';

export default function AccountBalancesLayout() {
  const { owner, restoring } = useAuthFlow();
  const motion = useStackMotion();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!owner) return <Redirect href="/choose-account" />;
  return <PayableDraftProvider key={owner.id}><ReceivableDraftProvider><Stack screenOptions={{ ...motion, headerShown: false }} /></ReceivableDraftProvider></PayableDraftProvider>;
}
