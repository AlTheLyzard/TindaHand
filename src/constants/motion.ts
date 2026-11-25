import { cubicBezier, Easing } from 'react-native-reanimated';

/** Shared timing in milliseconds. Keep the intentional More Tools sequence separate. */
export const motion = {
  press: 100,
  state: 210,
  transition: 280,
  quickAddSheet: 320,
  number: 500,
  progress: 600,
  stagger: 40,
  maxStagger: 8,
  badgeScale: 1.15,
  badgeSpring: { damping: 12, stiffness: 180 },
  ease: Easing.bezier(0.22, 0, 0.18, 1),
  colorEase: cubicBezier(0.22, 0, 0.18, 1),
} as const;
