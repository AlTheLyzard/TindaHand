import type { OwnerMenuIcon } from '@/types/menu';
import tokens from '@/constants/design-tokens.json';
import { PosIcon } from '@/components/pos/pos-icon';

/** Menu glyphs use the same bundled icon family as every other screen. */
export function MenuIcon({ name, size = 24 }: { name: OwnerMenuIcon | 'logout' | 'chevronRight' | 'close' | 'menu' | 'menuActive'; size?: number }) {
  const icon = name === 'menuActive' ? 'menu' : name;
  return <PosIcon name={icon} size={size} color={tokens.color.darkNavy} />;
}
