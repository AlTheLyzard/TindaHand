import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { cancelAnimation, Easing, ReduceMotion, useAnimatedReaction, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { menuDescriptionDuration, menuDescriptionFrame } from '@/utils/menu-description-sequence';

export function useMenuDescriptions(visible: boolean, opened: boolean, reduced: boolean, lengths: readonly number[]) {
  const elapsed = useSharedValue(0);
  const reduceThisOpening = useSharedValue(reduced);
  const reducedSetting = useRef(reduced);
  const generation = useRef(0);
  const opening = useSharedValue(0);
  const [characters, setCharacters] = useState<readonly number[]>(() => lengths.map(() => 0));
  const duration = menuDescriptionDuration(lengths);
  const updateCharacters = useCallback((version: number, next: readonly number[]) => {
    // UI-to-RN work may already be queued when the drawer closes or reopens.
    if (version === generation.current) setCharacters(next);
  }, []);

  useLayoutEffect(() => {
    reducedSetting.current = reduced;
    // Never reintroduce motion or resurrect erased text mid-opening.
    if (reduced) reduceThisOpening.set(true);
  }, [reduceThisOpening, reduced]);
  useLayoutEffect(() => {
    const version = ++generation.current;
    if (visible) {
      elapsed.set(0);
      reduceThisOpening.set(reducedSetting.current);
      // Publish the new opening only after resetting its UI-thread values.
      opening.set(version);
      setCharacters(lengths.map(length => reducedSetting.current ? length : 0));
    }
    return () => {
      generation.current = version + 1;
      cancelAnimation(elapsed);
    };
  }, [elapsed, lengths, opening, reduceThisOpening, visible]);
  useLayoutEffect(() => {
    if (!visible || !opened) return;
    // This linear UI-thread clock is bookkeeping, not visible motion. Accessibility
    // styles below switch instantly, but must still wait the full 15 seconds.
    elapsed.set(withTiming(duration, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    return () => cancelAnimation(elapsed);
  }, [duration, elapsed, opened, visible]);

  const frame = useDerivedValue(() => menuDescriptionFrame(elapsed.value, lengths, reduceThisOpening.value));
  useAnimatedReaction(() => ({ version: opening.value, characters: frame.value.characters }), (next, previous) => {
    if (!previous || next.version !== previous.version || next.characters.some((count, index) => count !== previous.characters[index])) {
      scheduleOnRN(updateCharacters, next.version, next.characters);
    }
  });
  // Keep the existing UI-thread clock, but change actual Text contents instead of
  // animating nested native text spans. No JS timers or per-letter animations.
  return { frame, characters };
}
