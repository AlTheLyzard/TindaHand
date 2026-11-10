import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useState, type ReactNode } from 'react';
import { Platform, } from 'react-native';

import tokens from '@/constants/design-tokens.json';

/** Informational activity row: feedback only; no detail destination exists yet. */
export function ActivityTile({ children }: { children: ReactNode }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  return <Pressable accessible={false} focusable={false}
    onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
    onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
    onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
    className="min-h-[70px] flex-row items-center gap-3 rounded-surface py-3"
    style={{ backgroundColor: pressed ? tokens.color.accentContainer : hovered ? tokens.color.surfaceSubtle : 'transparent' }}>
    {children}
  </Pressable>;
}
