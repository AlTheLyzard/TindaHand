import { router } from 'expo-router';

import { AccountChoiceScreen } from '@/components/auth/account-choice-screen';

export default function ChooseAccountRoute() {
  return <AccountChoiceScreen
    onBack={() => router.dismissTo('/')}
    onSelect={(role) => {
      router.navigate({ pathname: '/login', params: { role } });
    }}
  />;
}
