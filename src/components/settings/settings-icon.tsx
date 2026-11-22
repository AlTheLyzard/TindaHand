import tokens from '@/constants/design-tokens.json';
import { PosIcon } from '@/components/pos/pos-icon';

const icons = {
  settings: 'settings',
  profile: 'profile',
  manageOperators: 'userPlus',
  language: 'book',
  security: 'shieldCheck',
  lock: 'lock',
  data: 'download',
  help: 'book',
  replay: 'history',
} as const;

/** Settings glyphs use the app-wide icon family, with shared sizing and tint. */
export function SettingsIcon({ name, size = 24 }: { name: keyof typeof icons; size?: number }) {
  return <PosIcon name={icons[name]} color={tokens.color.darkNavy} size={size} />;
}
