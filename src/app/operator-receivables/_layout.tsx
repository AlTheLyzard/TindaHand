import tokens from '@/constants/design-tokens.json';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthFlow } from '@/state/auth-flow';
import { ReceivableDraftProvider } from '@/state/receivable-draft';

/** Restrict every Receivables subroute to an active Kahera. */
export default function OperatorReceivablesLayout() {
  const stackMotion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className="type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator') return <Redirect href="/choose-account" />;
  return (
    <ReceivableDraftProvider key={deviceSession.id}>
      <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: tokens.color.surfaceCard } }} />
    </ReceivableDraftProvider>
  );
}
