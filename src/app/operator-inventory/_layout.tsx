import tokens from '@/constants/design-tokens.json';
import { Redirect, Stack } from 'expo-router';
import { InventoryFeedback } from '@/components/inventory/inventory-ui';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { FeatureLockedOverlay } from '@/components/operator/feature-locked-overlay';
import { Text, View } from 'react-native';

export default function OperatorInventoryLayout() {
  const stackMotion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  // While restoring, hold the layout in a loading state so the session guard
  // below never fires with a momentarily-null deviceSession (same fix as the
  // POS layout — keyboard open/close triggers AppState events that can race
  // with an in-progress refreshSession call during the restock confirm flow).
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  // Inventory disabled by May-Ari → show overlay over ALL inventory subroutes
  const inventoryLocked = !hasCapability(deviceSession, 'inventory-edit') && !hasCapability(deviceSession, 'restock');
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: tokens.color.appBackground } }} />
      <InventoryFeedback />
      {inventoryLocked && <FeatureLockedOverlay featureName="Inventory" deviceSession={deviceSession} />}
    </View>
  );
}
