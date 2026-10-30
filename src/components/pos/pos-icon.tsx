import { Image } from 'expo-image';
import { posIconAssets } from '@/constants/pos-icon-assets';

/** Existing outlines, bundled for consistent SVG decoding and preloading on both platforms. */
export function PosIcon({ name, size = 24, color = '#4A607A', active = false }: {
  name: keyof typeof posIconAssets; size?: number; color?: string; active?: boolean;
}) {
  return <Image accessible={false} source={posIconAssets[name][active ? 'active' : 'normal']} tintColor={color}
    style={{ width: size, height: size, flexShrink: 0 }} contentFit="contain" />;
}
