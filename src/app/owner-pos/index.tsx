import { Redirect } from 'expo-router';

import { ProductBrowsingScreen } from '@/components/pos/product-browsing-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function OwnerPosRoute() {
  const { owner } = useAuthFlow();
  if (!owner) {
    return <Redirect href="/choose-account" />;
  }
  return <ProductBrowsingScreen owner={owner} />;
}
