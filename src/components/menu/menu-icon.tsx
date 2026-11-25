import { AppIcon, type AppIconName } from '@/components/ui/app-icon';
import tokens from '@/constants/design-tokens.json';
import type { OwnerMenuIcon } from '@/types/menu';

type MenuIconName = OwnerMenuIcon | 'manageOperators' | 'logout' | 'chevronRight' | 'close' | 'menu' | 'menuActive';
const menuIcons: Record<MenuIconName, AppIconName> = {
  financial: 'financial', history: 'history', expense: 'expense', customerDebt: 'customerDebt',
  settings: 'settings', profile: 'profile', manageOperators: 'users', logout: 'logout',
  chevronRight: 'chevronRight', close: 'close', menu: 'menu', menuActive: 'menu',
};

/** Menu glyphs use scalable vector icons so they stay sharp at every display density. */
export function MenuIcon({ name, size = 24 }: { name: MenuIconName; size?: number }) {
  return <AppIcon name={menuIcons[name]} size={size} color={name === 'menuActive' ? tokens.color.accentBase : tokens.color.darkNavy} />;
}
