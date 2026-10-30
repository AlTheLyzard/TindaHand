import { Redirect } from 'expo-router';
import { useAuthFlow } from '@/state/auth-flow';

export default function OwnerMenuRoute() {
  const { owner } = useAuthFlow();
  if (!owner) return <Redirect href="/choose-account" />;
  // Retain the old URL without a second, full-page Menu implementation.
  return <Redirect href="/owner-dashboard" />;
}
