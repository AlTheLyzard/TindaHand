import { Redirect } from 'expo-router';
import { useAuthFlow } from '@/state/auth-flow';
import { Text, View } from 'react-native';

export default function OwnerMenuRoute() {
  const { owner, restoring } = useAuthFlow();
  if (restoring) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  if (!owner) return <Redirect href="/choose-account" />;
  // Retain the old URL without a second, full-page Menu implementation.
  return <Redirect href="/owner-dashboard" />;
}
