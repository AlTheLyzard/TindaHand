import { Redirect, router } from 'expo-router';

import { OwnerIdScreen } from '@/components/auth/owner-id-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function OwnerIdRoute() {
  const { completion, setSelectedRole, setDashboardAccess } = useAuthFlow();
  if (!completion || (completion.mode === 'preview' && !__DEV__)) return <Redirect href="/register" />;
  return <OwnerIdScreen completion={completion} onSetup={() => {
    setSelectedRole('owner');
    setDashboardAccess(true);
    router.replace('/operator-setup');
  }} onSkip={() => {
    setSelectedRole('owner');
    setDashboardAccess(true);
    router.dismissAll();
    router.replace('/owner-dashboard');
  }} />;
}
