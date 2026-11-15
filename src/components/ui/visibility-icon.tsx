import { Image } from 'expo-image';

const sources = {
  visible: require('@/assets/images/auth/eye.svg'),
  hidden: require('@/assets/images/auth/eye-off.svg'),
};

/** Paired MA-LOG-001 outlines, using the app's bundled SVG image renderer. */
export function VisibilityIcon({ visible, color, size }: { visible: boolean; color: string; size: number }) {
  return <Image accessible={false} source={sources[visible ? 'visible' : 'hidden']} tintColor={color}
    contentFit="contain" style={{ width: size, height: size, flexShrink: 0 }} />;
}
