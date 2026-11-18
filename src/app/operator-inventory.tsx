import { Redirect, useLocalSearchParams } from 'expo-router';

import { InventoryScreen } from '@/components/inventory/inventory-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { posHref } from '@/components/pos/pos-frame';

export default function OperatorInventoryRoute() {
  const { deviceSession, restoring } = useAuthFlow();
  const { tab, status } = useLocalSearchParams<{ tab?: string; status?: string }>();
  if (restoring) return null;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  const canAccessInventory = hasCapability(deviceSession, 'inventory-edit')
    || hasCapability(deviceSession, 'restock')
    || hasCapability(deviceSession, 'assets-read');
  if (!canAccessInventory) return <Redirect href={posHref('/operator-pos')} />;
  return <InventoryScreen key={`${tab}:${status}`} readOnly />;
}
