import { Image } from 'expo-image';
import tokens from '@/constants/design-tokens.json';
import { appIconAssets } from '@/constants/app-icon-assets';

export type AppIconName = keyof typeof appIconAssets;

/** Shared, tintable outline icons for both mobile platforms and web. */
export function AppIcon({ name, size = 24, color = tokens.color.textSecondary }: {
  name: AppIconName; size?: number; color?: string; active?: boolean;
}) {
  return <Image accessible={false} source={appIconAssets[name]} tintColor={color}
    style={{ width: size, height: size, flexShrink: 0 }} contentFit="contain" />;
}
