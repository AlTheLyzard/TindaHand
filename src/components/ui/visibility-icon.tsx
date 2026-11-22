import { PosIcon } from '@/components/pos/pos-icon';

/** Password visibility states share the app-wide icon family. */
export function VisibilityIcon({ visible, color, size }: { visible: boolean; color: string; size: number }) {
  return <PosIcon name={visible ? 'eye' : 'eyeOff'} color={color} size={size} />;
}
