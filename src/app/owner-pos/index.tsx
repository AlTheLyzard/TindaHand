import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { ProductBrowsingScreen } from '@/components/pos/product-browsing-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function OwnerPosRoute() {
  const { owner, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!owner) {
    return <Redirect href="/choose-account" />;
  }
  return <ProductBrowsingScreen owner={owner} />;
}
