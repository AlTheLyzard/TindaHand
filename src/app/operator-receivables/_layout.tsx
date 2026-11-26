import tokens from '@/constants/design-tokens.json';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuthFlow } from '@/state/auth-flow';
import { ReceivableDraftProvider } from '@/state/receivable-draft';
import { hasCapability } from '@/utils/operator-access';
import { FeatureLockedOverlay } from '@/components/operator/feature-locked-overlay';

/** Restrict every Receivables subroute to an active Kahera with that permission. */
export default function OperatorReceivablesLayout() {
  const stackMotion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className="type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator') return <Redirect href="/choose-account" />;
  // If receivables is disabled by May-Ari, render the Stack underneath (so the
  // screen content is visible) but gate every subroute with the overlay so
  // nothing is interactive — including customer-new, details, payment, etc.
  const receivablesLocked = !hasCapability(deviceSession, 'receivables');
  return (
    <ReceivableDraftProvider key={deviceSession.id}>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: tokens.color.surfaceCard } }} />
        {receivablesLocked && <FeatureLockedOverlay featureName="Customer Debts" deviceSession={deviceSession} />}
      </View>
    </ReceivableDraftProvider>
  );
}
