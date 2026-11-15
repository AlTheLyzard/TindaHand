import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { RoleLoginScreen } from '@/components/auth/role-login-screen';
import { parseAccountRole } from '@/utils/account-access';
import { authenticationService } from '@/services/authentication';

export default function LoginRoute() {
  const params = useLocalSearchParams<{ role?: string | string[]; loggedOut?: string; pinReset?: string }>();
  const back = useCallback(() => router.dismissTo('/choose-account'), []);
  const role = parseAccountRole(params.role);
  const directory = useSyncExternalStore(authenticationService.subscribeAccountDirectory,
    authenticationService.getAccountDirectorySnapshot, authenticationService.getAccountDirectorySnapshot);
  if (!role) return <Redirect href="/choose-account" />;
  if (role === 'owner' ? directory.owners.length === 0 : !directory.hasOperators) return <Redirect href="/choose-account" />;

  return <RoleLoginScreen key={`${role}-${params.loggedOut ?? ''}`} role={role} loggedOut={params.loggedOut === '1'} pinReset={params.pinReset === '1'}
    onBack={back}
    onSuccess={() => { if (router.canDismiss()) router.dismissAll(); router.replace(role === 'owner' ? '/owner-dashboard' : '/operator-pos'); }} />;
}
