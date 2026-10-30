import { useStackMotion } from '@/hooks/use-stack-motion';
import { Redirect, Stack } from 'expo-router';

import { useAuthFlow } from '@/state/auth-flow';

/** All POS routes enforce the mock session; the shared cart survives navigation. */
export default function OwnerPosLayout() {
  const stackMotion = useStackMotion();
  const { owner } = useAuthFlow();
  if (!owner) {
    return <Redirect href="/choose-account" />;
  }
  return <Stack screenOptions={{ ...stackMotion, headerShown: false, contentStyle: { backgroundColor: '#F0F8FF' } }} />;
}
