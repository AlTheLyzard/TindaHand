import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';

import { RoleLoginScreen } from '@/components/auth/role-login-screen';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { authenticationService } from '@/services/authentication';
import { parseAccountRole } from '@/utils/account-access';
import { useSyncExternalStore } from 'react';

export default function LoginRoute() {
  const params = useLocalSearchParams<{ role?: string | string[]; pinReset?: string }>();
  const back = useCallback(() => router.dismissTo('/choose-account'), []);
  const role = parseAccountRole(params.role);
  const directory = useSyncExternalStore(authenticationService.subscribeAccountDirectory,
    authenticationService.getAccountDirectorySnapshot, authenticationService.getAccountDirectorySnapshot);
  if (!role) return <Redirect href="/choose-account" />;
  // When real auth is on, the mock directory is always empty — skip the guard entirely.
  // The Choose Account screen controls whether these cards appear; trust it.
  if (MOCK_AUTH_ENABLED) {

    if (role === 'owner' ? directory.owners.length === 0 : !directory.hasOperators) return <Redirect href="/choose-account" />;
  }

  return <RoleLoginScreen key={role} role={role} pinReset={params.pinReset === '1'}
    onBack={back}
    onSuccess={() => { if (router.canDismiss()) router.dismissAll(); router.replace(role === 'owner' ? '/owner-dashboard' : '/operator-pos'); }} />;
}
