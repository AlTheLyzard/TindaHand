import { Redirect } from 'expo-router';

import { OperatorModulePlaceholderScreen } from '@/components/operator/operator-module-placeholder-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { posHref } from '@/components/pos/pos-frame';

export default function OperatorInventoryRoute() {
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return null;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  const canAccessInventory = hasCapability(deviceSession, 'inventory-edit')
    || hasCapability(deviceSession, 'restock')
    || hasCapability(deviceSession, 'assets-read');
  if (!canAccessInventory) return <Redirect href={posHref('/operator-pos')} />;
  return <OperatorModulePlaceholderScreen title="Inventory" description="Operator inventory tools will be available here in a later phase." />;
}
