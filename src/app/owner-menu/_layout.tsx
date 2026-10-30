import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';
import { useAuthFlow } from '@/state/auth-flow';

export default function OwnerMenuLayout() {
  const stackMotion = useStackMotion();
  const { owner } = useAuthFlow();
  if (!owner) return <Redirect href="/choose-account" />;
  return <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }} />;
}
