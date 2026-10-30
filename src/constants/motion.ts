import { cubicBezier, Easing } from 'react-native-reanimated';

/** Shared timing in milliseconds. Keep the intentional More Tools sequence separate. */
export const motion = {
  press: 140,
  state: 210,
  transition: 280,
  ease: Easing.bezier(0.22, 0, 0.18, 1),
  colorEase: cubicBezier(0.22, 0, 0.18, 1),
} as const;
