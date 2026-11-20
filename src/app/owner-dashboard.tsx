import { Redirect, router } from 'expo-router';

import { OwnerDashboardScreen } from '@/components/dashboard/owner-dashboard-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { View } from 'react-native';
import { RegistrationToast } from '@/components/auth/registration-toast';

export default function OwnerDashboardRoute() {
  const { owner, mockSession, clear, loginToastExpiresAt, dismissLoginToast } = useAuthFlow();
  if (!owner) {
    return <Redirect href="/choose-account" />;
  }
  return <View style={{ flex: 1 }}><OwnerDashboardScreen owner={owner} onLogout={mockSession ? () => { clear(); if (router.canDismiss()) router.dismissAll(); router.replace({ pathname: '/login', params: { role: 'owner', loggedOut: '1' } }); } : undefined} />
    {loginToastExpiresAt && <RegistrationToast expiresAt={loginToastExpiresAt} onDismiss={dismissLoginToast} title="Login successful" message="Your credentials have been verified." />}
  </View>;
}
