import { router } from 'expo-router';

import { RegistrationScreen } from '@/components/auth/registration-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function RegisterRoute() {
  const { clear } = useAuthFlow();
  return (
    <RegistrationScreen
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
      onContinue={() => router.navigate('/account-created')}
      onCancel={() => {
        clear();
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
