import { Redirect, useLocalSearchParams } from 'expo-router';
import { ProductScreen } from '@/components/inventory/product-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { posHref } from '@/components/pos/pos-frame';

export default function OperatorProductRoute() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return null;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  const canEdit = hasCapability(deviceSession, 'inventory-edit');
  const canRestock = hasCapability(deviceSession, 'restock');
  if (!canEdit && !canRestock) return <Redirect href={posHref('/operator-pos')} />;
  const allowed = mode === 'edit' ? canEdit : mode === 'restock' ? canRestock : mode === undefined || mode === 'details' ? canEdit || canRestock : false;
  if (!allowed) return <Redirect href="/operator-inventory" />;
  return <ProductScreen key={`${id}:${mode}`} routeBase="/operator-inventory" canEditProduct={canEdit} canRestockProduct={canRestock} canDeleteProduct={false} />;
}
