import { Redirect, router } from 'expo-router';

import { AccountCreatedScreen } from '@/components/auth/account-created-screen';
import { useAuthFlow } from '@/state/auth-flow';

export default function AccountCreatedRoute() {
  const { completion } = useAuthFlow();
  if (!completion || (completion.mode === 'preview' && !__DEV__)) return <Redirect href="/register" />;
  return <AccountCreatedScreen completion={completion} onContinue={() => router.navigate('/owner-id')} />;
}
