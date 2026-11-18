import { Redirect, useLocalSearchParams } from 'expo-router';

import { OperatorModulePlaceholderScreen } from '@/components/operator/operator-module-placeholder-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorMoreRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return null;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, section === 'settings' ? 'settings' : 'pos')) return <Redirect href="/choose-account" />;
  return section === 'settings'
    ? <OperatorModulePlaceholderScreen title="Settings" description="Operator preferences and app settings will be available here in a later phase." activeAction="settings" />
    : <OperatorModulePlaceholderScreen title="More tools" description="Operator tools will be available here in a later phase." showSignOut />;
}
