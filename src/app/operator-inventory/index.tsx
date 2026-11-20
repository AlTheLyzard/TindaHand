import { useLocalSearchParams } from 'expo-router';
import { InventoryFrame } from '@/components/inventory/inventory-ui';
import { ProductInventoryContent } from '@/components/inventory/product-inventory-content';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorInventoryRoute() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const { deviceSession } = useAuthFlow();
  const canEdit = hasCapability(deviceSession?.role === 'operator' ? deviceSession : null, 'inventory-edit');
  const canRestock = hasCapability(deviceSession?.role === 'operator' ? deviceSession : null, 'restock');
  return <InventoryFrame title="Inventory" background>
    <ProductInventoryContent key={status ?? 'all'} routeBase="/operator-inventory" initialStatus={status} canAdd={false} canEdit={canEdit} canRestock={canRestock} />
  </InventoryFrame>;
}
