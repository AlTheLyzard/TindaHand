import { PaymentScreen } from '@/components/pos/payment-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function PaymentRoute() {
  const { owner } = useAuthFlow();
  // Parent POS layout guards direct access and owns the shared order/draft.
  return owner ? <PaymentScreen owner={owner} /> : null;
}
