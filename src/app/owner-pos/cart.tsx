import { CartReviewScreen } from '@/components/pos/cart-review-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function CartRoute() {
  const { owner } = useAuthFlow();
  // The parent layout guards all POS routes, including direct cart links.
  return owner ? <CartReviewScreen owner={owner} /> : null;
}
