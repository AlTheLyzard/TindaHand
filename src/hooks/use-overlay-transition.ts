import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';

/** Retain the native window through exit; only the latest request may complete. */
export function useOverlayTransition(visible: boolean, onHidden?: () => void, duration: number = motion.transition, nativeWindow = true) {
  const reduced = useMotionReduced();
  const [phase, setPhase] = useState({ requested: visible, presented: visible, opened: false });
  if (phase.requested !== visible) {
    setPhase({ requested: visible, presented: visible || phase.presented, opened: false });
  }
  const desired = useRef(visible);
  const shown = useRef(false);
  const generation = useRef(0);
  const notified = useRef(-1);
  const progress = useSharedValue(0);
  const live = useRef(true);
  const hidden = useRef(onHidden);
  useLayoutEffect(() => { hidden.current = onHidden; }, [onHidden]);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);
  const notifyHidden = useCallback((version: number) => {
    if (!live.current || desired.current || version !== generation.current || notified.current === version) return;
    notified.current = version;
    hidden.current?.();
  }, []);
  const finished = useCallback((target: number, version: number) => {
    if (!live.current || version !== generation.current || desired.current !== (target === 1)) return;
    if (target === 1) setPhase(previous => ({ ...previous, opened: true }));
    else {
      shown.current = false;
      setPhase(previous => ({ ...previous, presented: false, opened: false }));
      if (!nativeWindow || Platform.OS !== 'ios') notifyHidden(version);
    }
  }, [nativeWindow, notifyHidden]);
  const animate = useCallback((target: number, version: number) => {
    progress.set(withTiming(target, { duration: reduced ? 0 : duration, easing: motion.ease }, complete => {
      if (complete) scheduleOnRN(finished, target, version);
    }));
  }, [duration, finished, progress, reduced]);
  useLayoutEffect(() => {
    desired.current = visible;
    const version = ++generation.current;
    cancelAnimation(progress);
    if (!phase.presented) { shown.current = false; progress.set(0); }
    else if (visible) {
      if (shown.current || !nativeWindow) animate(1, version);
      else progress.set(0);
    } else animate(0, version);
    return () => { cancelAnimation(progress); };
  }, [animate, nativeWindow, phase.presented, progress, visible]);
  const onShow = useCallback(() => {
    shown.current = true;
    animate(desired.current ? 1 : 0, generation.current);
  }, [animate]);
  const onDismiss = useCallback(() => {
    if (live.current && !desired.current) { shown.current = false; notifyHidden(generation.current); }
  }, [notifyHidden]);
  return { presented: phase.presented, opened: phase.opened, progress, reduced, onShow, onDismiss };
}
