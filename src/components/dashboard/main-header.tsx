import { router } from 'expo-router';
import { Image, Text, View } from 'react-native';
import { DashboardAction, DashboardIcon, dashboardIcons } from '@/components/dashboard/dashboard-ui';
import { OwnerAvatar } from '@/components/profile/profile-ui';
import { useTranslation } from '@/i18n/use-translation';

type HeaderAction = 'settings' | 'profile';

/** Shared top bar used by both the Owner and Operator modules. */
export function MainHeader({ onNavigate, showActions = true, showSettings = showActions, showProfile = showActions,
  activeAction, interactionBackgroundColor, onSettingsPress, onProfilePress, testID }: {
  onNavigate?: (action: () => void) => void;
  showActions?: boolean;
  showSettings?: boolean;
  showProfile?: boolean;
  activeAction?: HeaderAction;
  interactionBackgroundColor?: string;
  onSettingsPress?: () => void;
  onProfilePress?: () => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const navigate = (action: () => void) => onNavigate ? onNavigate(action) : action();
  const settingsAction = onSettingsPress ?? (() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'settings' } }));
  const profileAction = onProfilePress ?? (() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'profile' } }));

  return <View testID={testID} className="border-b border-[#ADC9EE] bg-white">
    <View className="w-full max-w-[460px] flex-row items-center gap-2 self-center px-5 py-2">
      <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 32, height: 34 }} resizeMode="contain" accessible={false} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} className="min-w-0 flex-1 font-poppins-bold text-[20px] leading-[30px] text-brand">TindaHand</Text>
      {showSettings && <DashboardAction label={t('navigation.settings')} selected={activeAction === 'settings'} interactionBackgroundColor={interactionBackgroundColor}
        onPress={() => navigate(settingsAction)}>
          <DashboardIcon source={dashboardIcons.settings} size={26} />
      </DashboardAction>}
      {showProfile && <DashboardAction label={t('navigation.profile')} selected={activeAction === 'profile'} interactionBackgroundColor={interactionBackgroundColor}
        onPress={() => navigate(profileAction)}>
        <OwnerAvatar />
      </DashboardAction>}
    </View>
  </View>;
}
