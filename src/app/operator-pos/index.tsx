import { ProductBrowsingScreen } from '@/components/pos/product-browsing-screen';
import { FeatureLockedOverlay } from '@/components/operator/feature-locked-overlay';
import type { OwnerIdentity } from '@/types/auth';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function OperatorPosRoute() {
  const { deviceSession } = useAuthFlow();
  if (!deviceSession || deviceSession.role !== 'operator') return null;
  // If the session is locked (background timer or cold restart with persisted lock),
  // redirect to the PIN screen instead of showing the POS.
  if (deviceSession.locked) return <Redirect href={{ pathname: '/login', params: { role: 'cashier' } }} />;
  const isOfflineGrace = deviceSession.id.startsWith('offline-grace-');
  const owner: OwnerIdentity = { ...deviceSession.owner, mode: MOCK_AUTH_ENABLED ? 'mock' : isOfflineGrace ? 'offline-grace' : 'confirmed' };
  const posLocked = !hasCapability(deviceSession, 'pos');
  return (
    <View style={{ flex: 1 }}>
      {/* Always render the POS screen so it's visible underneath the overlay */}
      <ProductBrowsingScreen owner={owner} basePath="/operator-pos" />
      {/* Paywall overlay when May-Ari has disabled POS access */}
      {posLocked && <FeatureLockedOverlay featureName="Point of Sale (POS)" />}
    </View>
  );
}
