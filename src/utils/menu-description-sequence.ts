import type { MenuDescriptionFrame } from '@/types/menu';

export const menuMotion = {
  drawerMs: 280, characterMs: 55, eraseMs: 35,
  visibleMs: 15_000, titleMoveMs: 280,
} as const;

export function menuDescriptionDuration(lengths: readonly number[]) {
  'worklet';
  const longestTyped = Math.min(Math.max(0, ...lengths), Math.floor(menuMotion.visibleMs / menuMotion.characterMs));
  return menuMotion.visibleMs + longestTyped * menuMotion.eraseMs + menuMotion.titleMoveMs;
}

/** Pure elapsed-time sampling: dropped frames never accumulate character-timer delays. */
export function menuDescriptionFrame(elapsed: number, lengths: readonly number[], reduced: boolean): MenuDescriptionFrame {
  'worklet';
  const typing = Math.max(0, Math.floor(elapsed / menuMotion.characterMs));
  const typedAtDeadline = Math.floor(menuMotion.visibleMs / menuMotion.characterMs);
  const erased = Math.max(0, Math.floor((elapsed - menuMotion.visibleMs) / menuMotion.eraseMs));
  const characters = lengths.map(length => reduced
    ? elapsed < menuMotion.visibleMs ? length : 0
    : elapsed < menuMotion.visibleMs ? Math.min(length, typing)
      : Math.max(0, Math.min(length, typedAtDeadline) - erased));
  const eraseEnd = menuDescriptionDuration(lengths) - menuMotion.titleMoveMs;
  const progress = Math.max(0, Math.min(1, (elapsed - eraseEnd) / menuMotion.titleMoveMs));
  // Same cubic easing as the drawer/title animation, after the last backspace.
  const titleProgress = reduced ? elapsed < menuMotion.visibleMs ? 0 : 1
    : progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  return { characters, titleProgress };
}
