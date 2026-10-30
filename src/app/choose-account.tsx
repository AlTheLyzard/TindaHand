import { router } from 'expo-router';

import { AccountChoiceScreen } from '@/components/auth/account-choice-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function ChooseAccountRoute() {
  const { accounts } = useAuthFlow();
  return <AccountChoiceScreen
    onBack={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
    onSelect={(role) => {
      if (role === 'owner' && !accounts.owner) router.navigate('/register');
      else router.navigate({ pathname: '/login', params: { role } });
    }}
  />;
}
