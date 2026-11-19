import { Redirect, Stack } from 'expo-router';
import { InventoryFeedback } from '@/components/inventory/inventory-ui';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { posHref } from '@/components/pos/pos-frame';

export default function OperatorInventoryLayout() {
  const stackMotion = useStackMotion();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return null;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  if (!hasCapability(deviceSession, 'inventory-edit') && !hasCapability(deviceSession, 'restock')) return <Redirect href={posHref('/operator-pos')} />;
  return <><Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: '#F0F8FF' } }} /><InventoryFeedback /></>;
}
