import { router } from 'expo-router';

import { AccountChoiceScreen } from '@/components/auth/account-choice-screen';
import { clearToken } from '@/services/token-storage';
import { useAuthFlow } from '@/state/auth-flow';

export default function ChooseAccountRoute() {
  const { switchAccount } = useAuthFlow();
  return <AccountChoiceScreen
    onBack={() => router.dismissTo('/')}
    onCreateAccount={() => router.navigate('/register')}
    onSelect={async (role) => {
      // Clear the JWT and device session before navigating to login.
      // Without this, the 15-second refreshSession timer restores the JWT
      // mid-typing and switches the form to PIN-unlock mode, locking the
      // Owner ID field while the user is entering it.
      await clearToken();
      await switchAccount(role);
      router.navigate({ pathname: '/login', params: { role } });
    }}
  />;
}