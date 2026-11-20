import { PaymentScreen } from '@/components/pos/payment-screen';
import type { OwnerIdentity } from '@/types/auth';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';

export default function OperatorPaymentRoute() {
  const { deviceSession } = useAuthFlow();
  if (!deviceSession || deviceSession.role !== 'operator' || !hasCapability(deviceSession, 'pos')) return null;
  const owner: OwnerIdentity = { ...deviceSession.owner, mode: MOCK_AUTH_ENABLED ? 'mock' : 'confirmed' };
  return <PaymentScreen owner={owner} basePath="/operator-pos" allowPartialPayment={hasCapability(deviceSession, 'receivables')} />;
}
