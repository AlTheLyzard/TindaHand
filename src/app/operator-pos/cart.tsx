import { CartReviewScreen } from '@/components/pos/cart-review-screen';
import type { OwnerIdentity } from '@/types/auth';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function OperatorCartRoute() {
  const { deviceSession } = useAuthFlow();
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return null;
  const owner: OwnerIdentity = { ...deviceSession.owner, mode: 'mock' };
  return <CartReviewScreen owner={owner} basePath="/operator-pos" />;
}
