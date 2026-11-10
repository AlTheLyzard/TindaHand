import { Redirect, Stack } from 'expo-router';
import { useStackMotion } from '@/hooks/use-stack-motion';
import { useAuthFlow } from '@/state/auth-flow';
import { PayableDraftProvider } from '@/state/payable-draft';
import { ReceivableDraftProvider } from '@/state/receivable-draft';

export default function AccountBalancesLayout() {
  const { owner } = useAuthFlow();
  const motion = useStackMotion();
  if (!owner) return <Redirect href="/choose-account" />;
  return <PayableDraftProvider key={owner.id}><ReceivableDraftProvider><Stack screenOptions={{ ...motion, headerShown: false }} /></ReceivableDraftProvider></PayableDraftProvider>;
}
