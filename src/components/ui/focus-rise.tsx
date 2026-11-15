import { useFocusEffect, useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useCallback, useLayoutEffect, useRef } from 'react';
import { Platform, type ViewProps } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useMotionReduced } from '@/state/motion';
import { motion } from '@/constants/motion';

/** Replay a whole card on route focus without remounting its content or changing layout. */
export function FocusRise({ index, style, ...props }: ViewProps & { index: number }) {
  const reduced = useMotionReduced();
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  const progress = useSharedValue(reduced ? 1 : 0);
  const reducedRef = useRef(reduced);
  const cancelVisit = useRef<(() => void) | undefined>(undefined);

  useLayoutEffect(() => {
    reducedRef.current = reduced;
    if (reduced) {
      cancelVisit.current?.();
      cancelAnimation(progress);
      progress.set(1);
    }
  }, [progress, reduced]);

  // Only focus starts an entrance. Preference changes can finish it, never restart it.
  useFocusEffect(useCallback(() => {
    let active = true;
    let started = false;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    let removeStart: (() => void) | undefined;
    let removeEnd: (() => void) | undefined;
    const clearPending = () => {
      clearTimeout(fallback);
      removeStart?.();
      removeEnd?.();
    };
    const finish = () => {
      active = false;
      clearPending();
      cancelAnimation(progress);
      progress.set(1);
    };
    cancelVisit.current = finish;
    cancelAnimation(progress);
    const start = () => {
      if (!active || started) return;
      started = true;
      clearPending();
      if (reducedRef.current) { progress.set(1); return; }
      progress.set(withDelay(index * 60, withTiming(1, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.Never,
      }), ReduceMotion.Never));
    };
    if (reducedRef.current) progress.set(1);
    else {
      progress.set(0);
      if (Platform.OS === 'web') start();
      else {
        // Native focus precedes presentation. Let the full entrance happen
        // after onAppear, rather than spending it behind the stack transition.
        removeEnd = navigation.addListener('transitionEnd', event => {
          if (!event.data.closing) start();
        });
        // Initial/already-visible routes may not emit a transition. Never leave
        // cards hidden if an event is missing; a started transition gets longer.
        fallback = setTimeout(start, motion.transition * 2);
        removeStart = navigation.addListener('transitionStart', event => {
          if (!event.data.closing) {
            clearTimeout(fallback);
            fallback = setTimeout(start, 2000);
          }
        });
      }
    }

    return () => {
      finish();
      if (cancelVisit.current === finish) cancelVisit.current = undefined;
    };
  }, [index, navigation, progress]));

  const entrance = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : progress.value,
    transform: [{ translateY: reduced ? 0 : (1 - progress.value) * 20 }],
  }));

  return <Animated.View {...props} collapsable={false} pointerEvents="box-none" style={[style, entrance]} />;
}
