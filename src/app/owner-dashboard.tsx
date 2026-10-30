import { Redirect, router } from 'expo-router';

import { OwnerDashboardScreen } from '@/components/dashboard/owner-dashboard-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function OwnerDashboardRoute() {
  const { owner, mockSession, clear } = useAuthFlow();
  if (!owner) {
    return <Redirect href="/choose-account" />;
  }
  return <OwnerDashboardScreen owner={owner} onLogout={mockSession ? () => { clear(); router.replace('/choose-account'); } : undefined} />;
}
