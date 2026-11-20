import { Redirect, useLocalSearchParams } from 'expo-router';
import { ProductScreen } from '@/components/inventory/product-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { posHref } from '@/components/pos/pos-frame';
import { Text, View } from 'react-native';

export default function OperatorProductRoute() {
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className="font-poppins text-[14px] text-brand">Restoring your session…</Text></View>;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  const canEdit = hasCapability(deviceSession, 'inventory-edit');
  const canRestock = hasCapability(deviceSession, 'restock');
  if (!canEdit && !canRestock) return <Redirect href={posHref('/operator-pos')} />;
  const allowed = mode === 'edit' ? canEdit : mode === 'restock' ? canRestock : mode === undefined || mode === 'details' ? canEdit || canRestock : false;
  if (!allowed) return <Redirect href="/operator-inventory" />;
  return <ProductScreen key={`${id}:${mode}`} />;
}
