import { Redirect, router } from 'expo-router';

import { OwnerDashboardScreen } from '@/components/dashboard/owner-dashboard-screen';
import { useAuthFlow } from '@/state/auth-flow';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RegistrationToast } from '@/components/auth/registration-toast';

export default function OwnerDashboardRoute() {
  const { owner, mockSession, clear, loginToastExpiresAt, dismissLoginToast } = useAuthFlow();
  const insets = useSafeAreaInsets();
  if (!owner) {
    return <Redirect href="/choose-account" />;
  }
  return <View style={{ flex: 1 }}><OwnerDashboardScreen owner={owner} onLogout={mockSession ? () => { clear(); router.dismissAll(); router.replace({ pathname: '/login', params: { role: 'owner', loggedOut: '1' } }); } : undefined} />
    {loginToastExpiresAt && <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 56, left: 24, right: 24 }}>
      <RegistrationToast expiresAt={loginToastExpiresAt} onDismiss={dismissLoginToast} title="Login successful" message="Your credentials have been verified." />
    </View>}
  </View>;
}
