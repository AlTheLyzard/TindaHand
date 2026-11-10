import { Image } from 'expo-image';

const sources = {
  language: require('@/assets/images/settings/language.svg'),
  security: require('@/assets/images/settings/security.svg'),
  lock: require('@/assets/images/settings/lock.svg'),
  data: require('@/assets/images/settings/data.svg'),
  help: require('@/assets/images/settings/help.svg'),
} as const;
/** Small outlines from the supplied Settings references, using the existing SVG image approach. */
export function SettingsIcon({ name }: { name: keyof typeof sources }) {
  return <Image accessible={false} source={sources[name]} style={{ width: 24, height: 24 }} contentFit="contain" />;
}
