import { Redirect } from 'expo-router';

import { OperatorModulePlaceholderScreen } from '@/components/operator/operator-module-placeholder-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorMoreRoute() {
  const { deviceSession, restoring } = useAuthFlow();
  if (restoring) return null;
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return <Redirect href="/choose-account" />;
  return <OperatorModulePlaceholderScreen title="More tools" description="Operator tools will be available here in a later phase." showSignOut />;
}
