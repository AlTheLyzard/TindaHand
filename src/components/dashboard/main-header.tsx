import { router } from 'expo-router';
import { Image, Text, View } from 'react-native';
import tokens from '@/constants/design-tokens.json';
import { DashboardAction } from '@/components/dashboard/dashboard-ui';
import { AppIcon } from '@/components/ui/app-icon';
import { OwnerAvatar } from '@/components/profile/profile-ui';
import { useTranslation } from '@/i18n/use-translation';
import { useAuthFlow } from '@/state/auth-flow';

type HeaderAction = 'settings' | 'profile';

/** Shared top bar used by both the Owner and Operator modules. */
export function MainHeader({ onNavigate, showActions = true, showSettings = showActions, showProfile = showActions,
  activeAction, interactionBackgroundColor, onSettingsPress, onProfilePress, onLogoPress, testID }: {
  onNavigate?: (action: () => void) => void;
  showActions?: boolean;
  showSettings?: boolean;
  showProfile?: boolean;
  activeAction?: HeaderAction;
  interactionBackgroundColor?: string;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  onLogoPress?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { deviceSession } = useAuthFlow();
  const navigate = (action: () => void) => onNavigate ? onNavigate(action) : action();
  const settingsAction = onSettingsPress ?? (() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'settings' } }));
  const profileAction = onProfilePress ?? (() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'profile' } }));
  const homeAction = onLogoPress ?? (() => router.navigate(deviceSession?.role === 'operator' ? '/operator-pos' : '/owner-dashboard'));

  return <View testID={testID} className="border-b border-outline bg-white">
    <View className="w-full max-w-[460px] flex-row items-center gap-2 self-center px-5 py-2">
      <DashboardAction label="Go to Home" interactionBackgroundColor="transparent" onPress={() => navigate(homeAction)}>
        <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 32, height: 34 }} resizeMode="contain" accessible={false} />
      </DashboardAction>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} className="min-w-0 flex-1 type-title-accent leading-[30px] text-brand">TindaHand</Text>
      {showSettings && <DashboardAction label={t('navigation.settings')} selected={activeAction === 'settings'} interactionBackgroundColor={interactionBackgroundColor}
        onPress={() => navigate(settingsAction)}>
          <AppIcon name="settings" size={26} color={tokens.color.darkNavy} />
      </DashboardAction>}
      {showProfile && <DashboardAction label={t('navigation.profile')} selected={activeAction === 'profile'} interactionBackgroundColor={interactionBackgroundColor}
        onPress={() => navigate(profileAction)}>
        <OwnerAvatar />
      </DashboardAction>}
    </View>
  </View>;
}
