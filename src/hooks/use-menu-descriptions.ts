import { useLayoutEffect, useRef } from 'react';
import { cancelAnimation, Easing, ReduceMotion, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { menuDescriptionDuration, menuDescriptionFrame } from '@/utils/menu-description-sequence';

export function useMenuDescriptions(visible: boolean, opened: boolean, reduced: boolean, lengths: readonly number[]) {
  const elapsed = useSharedValue(0);
  const reduceThisOpening = useSharedValue(reduced);
  const reducedSetting = useRef(reduced);
  const duration = menuDescriptionDuration(lengths);

  useLayoutEffect(() => {
    reducedSetting.current = reduced;
    // Never reintroduce motion or resurrect erased text mid-opening.
    if (reduced) reduceThisOpening.set(true);
  }, [reduceThisOpening, reduced]);
  useLayoutEffect(() => {
    if (visible) {
      elapsed.set(0);
      reduceThisOpening.set(reducedSetting.current);
    }
    return () => cancelAnimation(elapsed);
  }, [elapsed, reduceThisOpening, visible]);
  useLayoutEffect(() => {
    if (!visible || !opened) return;
    // This linear UI-thread clock is bookkeeping, not visible motion. Accessibility
    // styles below switch instantly, but must still wait the full 15 seconds.
    elapsed.set(withTiming(duration, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    return () => cancelAnimation(elapsed);
  }, [duration, elapsed, opened, visible]);

  // No per-letter React state, JS timers, or callbacks surviving a closed drawer.
  return useDerivedValue(() => menuDescriptionFrame(elapsed.value, lengths, reduceThisOpening.value));
}
