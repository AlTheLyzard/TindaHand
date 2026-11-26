import { useLocalSearchParams } from 'expo-router';
import { InventoryScreen } from '@/components/inventory/inventory-screen';
import { FeatureLockedOverlay } from '@/components/operator/feature-locked-overlay';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { View } from 'react-native';

export default function OperatorInventoryRoute() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const { deviceSession } = useAuthFlow();
  const session = deviceSession?.role === 'operator' ? deviceSession : null;
  const canEdit = hasCapability(session, 'inventory-edit');
  const canRestock = hasCapability(session, 'restock');
  const inventoryLocked = !canEdit && !canRestock;
  return (
    <View style={{ flex: 1 }}>
      {/* Always render inventory so it's visible beneath the overlay */}
      <InventoryScreen key={status ?? 'all'} readOnly showAssets={false} routeBase="/operator-inventory"
        initialStatus={status} canAdd={false} canEdit={canEdit} canRestock={canRestock} />
      {/* Paywall overlay when May-Ari has disabled inventory access entirely */}
      {inventoryLocked && <FeatureLockedOverlay featureName="Inventory" />}
    </View>
  );
}
