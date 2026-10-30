import { useMotionReduced } from '@/state/motion';
import { motion } from '@/constants/motion';

/** Native stacks keep their own back gestures; do not add a second screen animation. */
export function useStackMotion() {
  const reduced = useMotionReduced();
  return { animation: reduced ? 'none' as const : 'slide_from_right' as const, animationDuration: motion.transition };
}
