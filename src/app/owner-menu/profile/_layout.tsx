import { Redirect, Stack } from 'expo-router';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

export default function ProfileLayout() {
  const motion = useStackMotion();
  const { deviceSession } = useAuthFlow();
  if (!hasCapability(deviceSession, 'manage-operators')) return <Redirect href="/choose-account" />;
  return <Stack screenOptions={{ ...motion, headerShown: false, contentStyle: { backgroundColor: '#F0F8FF' } }} />;
}
