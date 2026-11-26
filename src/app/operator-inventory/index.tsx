import { useLocalSearchParams } from 'expo-router';
import { InventoryScreen } from '@/components/inventory/inventory-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorInventoryRoute() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const { deviceSession } = useAuthFlow();
  const session = deviceSession?.role === 'operator' ? deviceSession : null;
  const canEdit = hasCapability(session, 'inventory-edit');
  const canRestock = hasCapability(session, 'restock');
  // The layout (_layout.tsx) handles the inventory-locked overlay for all subroutes.
  return <InventoryScreen key={status ?? 'all'} readOnly showAssets={false} routeBase="/operator-inventory"
    initialStatus={status} canAdd={false} canEdit={canEdit} canRestock={canRestock} />;
}
