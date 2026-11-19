import { ProductBrowsingScreen } from '@/components/pos/product-browsing-screen';
import type { OwnerIdentity } from '@/types/auth';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';

export default function OperatorPosRoute() {
  const { deviceSession } = useAuthFlow();
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return null;
  const owner: OwnerIdentity = { ...deviceSession.owner, mode: MOCK_AUTH_ENABLED ? 'mock' : 'confirmed' };
  return <ProductBrowsingScreen owner={owner} basePath="/operator-pos" />;
}
