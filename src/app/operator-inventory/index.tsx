import { useLocalSearchParams } from 'expo-router';
import { InventoryScreen } from '@/components/inventory/inventory-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorInventoryRoute() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const { deviceSession } = useAuthFlow();
  const canEdit = hasCapability(deviceSession?.role === 'operator' ? deviceSession : null, 'inventory-edit');
  const canRestock = hasCapability(deviceSession?.role === 'operator' ? deviceSession : null, 'restock');
  return <InventoryScreen key={status ?? 'all'} readOnly showAssets={false} routeBase="/operator-inventory"
    initialStatus={status} canAdd={false} canEdit={canEdit} canRestock={canRestock} />;
}
