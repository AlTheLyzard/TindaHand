import { Redirect, Stack } from 'expo-router';
import { useAuthFlow } from '@/state/auth-flow';
import { useStackMotion } from '@/hooks/use-stack-motion';

export default function FinancialLayout() {
  const { owner } = useAuthFlow();
  const motion = useStackMotion();
  if (!owner) return <Redirect href="/choose-account" />;
  return <Stack screenOptions={{ ...motion, headerShown: false, contentStyle: { backgroundColor: '#F0F8FF' } }} />;
}
