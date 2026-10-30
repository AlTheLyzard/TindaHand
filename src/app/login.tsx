import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { RoleLoginScreen } from '@/components/auth/role-login-screen';
import { parseAccountRole } from '@/utils/account-access';

export default function LoginRoute() {
  const params = useLocalSearchParams<{ role?: string | string[]; loggedOut?: string }>();
  const role = parseAccountRole(params.role);
  if (!role) return <Redirect href="/choose-account" />;

  return <RoleLoginScreen key={`${role}-${params.loggedOut ?? ''}`} role={role} loggedOut={params.loggedOut === '1'}
    onBack={() => router.dismissTo('/choose-account')}
    onSuccess={() => router.replace('/owner-dashboard')} />;
}
