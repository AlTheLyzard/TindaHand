import tokens from '@/constants/design-tokens.json';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { FeatureLockedOverlay } from '@/components/operator/feature-locked-overlay';

/** Guard every Operator POS subroute, including direct cart and payment links. */
export default function OperatorPosLayout() {
  const stackMotion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  // Not an operator at all → go to login.
  if (!deviceSession || deviceSession.role !== 'operator') return <Redirect href="/choose-account" />;
  // POS disabled by May-Ari → show overlay over ALL POS subroutes (cart, payment, etc.)
  const posLocked = !hasCapability(deviceSession, 'pos');
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} />
      {posLocked && <FeatureLockedOverlay featureName="Point of Sale (POS)" />}
    </View>
  );
}
