import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { RoleLoginScreen } from '@/components/auth/role-login-screen';
import { parseAccountRole } from '@/utils/account-access';
import { useCallback } from 'react';

export default function LoginRoute() {
  const params = useLocalSearchParams<{ role?: string | string[]; loggedOut?: string; pinReset?: string }>();
  const back = useCallback(() => router.dismissTo('/choose-account'), []);
  const role = parseAccountRole(params.role);
  if (!role) return <Redirect href="/choose-account" />;

  return <RoleLoginScreen key={`${role}-${params.loggedOut ?? ''}`} role={role} loggedOut={params.loggedOut === '1'} pinReset={params.pinReset === '1'}
    onBack={back}
    onSuccess={() => { router.dismissAll(); router.replace('/owner-dashboard'); }} />;
}
