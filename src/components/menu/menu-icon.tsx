import { Image } from 'expo-image';
import type { OwnerMenuIcon } from '@/types/menu';

const sources = {
  financial: require('@/assets/images/menu/financial.png'),
  history: require('@/assets/images/menu/history.png'),
  expense: require('@/assets/images/menu/expense.png'),
  customerDebt: require('@/assets/images/menu/customerDebt.png'),
  settings: require('@/assets/images/menu/settings.png'),
  profile: require('@/assets/images/menu/profile.png'),
  logout: require('@/assets/images/menu/logout.png'),
  chevronRight: require('@/assets/images/menu/chevronRight.png'),
  close: require('@/assets/images/menu/close.png'),
  menu: require('@/assets/images/menu/menu.png'),
  menuActive: require('@/assets/images/menu/menu-active.png'),
};

/** Exact supplied glyphs, contained in consistent square boxes without distortion. */
export function MenuIcon({ name, size = 24 }: { name: OwnerMenuIcon | 'logout' | 'chevronRight' | 'close' | 'menu' | 'menuActive'; size?: number }) {
  return <Image accessible={false} source={sources[name]} style={{ width: size, height: size, flexShrink: 0 }} contentFit="contain" />;
}
