import tokens from '@/constants/design-tokens.json';
import { router, type Href } from 'expo-router';
import { MainHeader } from '@/components/dashboard/main-header';
import { useAuthFlow } from '@/state/auth-flow';
import { hasCapability } from '@/utils/operator-access';

type OperatorHeaderAction = 'profile' | 'settings';

/** Operator navigation and access rules on the shared Owner-sized top bar. */
export function OperatorHeader({ activeAction, onNavigate }: {
  activeAction?: OperatorHeaderAction;
  onNavigate?: (action: () => void) => void;
}) {
  const { deviceSession } = useAuthFlow();
  const session = deviceSession?.role === 'operator' ? deviceSession : null;
  const showProfile = hasCapability(session, 'profile');
  const showSettings = hasCapability(session, 'settings');

  return <MainHeader testID="operator-header" showSettings={showSettings} showProfile={showProfile} activeAction={activeAction}
    interactionBackgroundColor={tokens.color.iceContainer} onNavigate={onNavigate}
    onSettingsPress={() => router.navigate({ pathname: '/operator-more', params: { section: 'settings' } })}
    onProfilePress={() => router.navigate('/operator-profile' as Href)} />;
}
