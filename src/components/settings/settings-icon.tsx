import tokens from '@/constants/design-tokens.json';
import { Image } from 'expo-image';
import { AppIcon } from '@/components/ui/app-icon';

const icons = {
  language: require('@/assets/images/settings/language.svg'),
  security: require('@/assets/images/settings/security.svg'),
  data: require('@/assets/images/settings/data.svg'),
  help: require('@/assets/images/settings/help.svg'),
} as const;
type SettingsIconName = 'settings' | 'profile' | 'manageOperators' | 'language' | 'security' | 'lock' | 'data' | 'help' | 'replay';

/** Keep the supplied settings illustrations and use vector app icons for standard actions. */
export function SettingsIcon({ name, size = 24 }: { name: SettingsIconName; size?: number }) {
  if (name === 'language' || name === 'security' || name === 'data' || name === 'help') {
    return <Image source={icons[name]} style={{ width: size, height: size, flexShrink: 0 }} contentFit="contain" tintColor={tokens.color.darkNavy} accessible={false} />;
  }
  const appIcons = { settings: 'settings', profile: 'profile', manageOperators: 'users', lock: 'lock', replay: 'history' } as const;
  return <AppIcon name={appIcons[name]} size={size} color={tokens.color.darkNavy} />;
}
