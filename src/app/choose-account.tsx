import { router } from 'expo-router';

import { AccountChoiceScreen } from '@/components/auth/account-choice-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function ChooseAccountRoute() {
  const { switchAccount } = useAuthFlow();
  return <AccountChoiceScreen
    onBack={() => router.dismissTo('/')}
    onCreateAccount={() => router.navigate('/register')}
    onSelect={async (role) => {
      // Clear any active session so login.tsx shows fresh credential entry,
      // not a PIN-unlock screen with the previous owner's ID locked in.
      await switchAccount(role);
      router.navigate({ pathname: '/login', params: { role } });
    }}
  />;
}