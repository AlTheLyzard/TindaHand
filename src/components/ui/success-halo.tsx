import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { SuccessCheck } from './success-check';
import { useMotionReduced } from '@/state/motion';
import { usePresentationVisible } from '@/state/presentation';

/** Filled translucent layers render on both platforms without shadow support.
 * Only the halo pulses; the complete check stays sharp and stationary. */
export function SuccessHalo({ visible, eventKey }: { visible: boolean; eventKey: string }) {
  const reduced = useMotionReduced();
  const presented = usePresentationVisible();
  const pulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(pulse); pulse.set(0);
    if (!reduced && visible && presented) pulse.set(withRepeat(withTiming(1, {
      duration: 1800, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.Never,
    }), -1, true, undefined, ReduceMotion.Never));
    return () => { cancelAnimation(pulse); pulse.set(0); };
  }, [eventKey, presented, pulse, reduced, visible]);
  const halo = useAnimatedStyle(() => ({ opacity: 0.65 + pulse.get() * 0.35, transform: [{ scale: 1 + pulse.get() * 0.08 }] }));
  return <View testID="success-halo" accessible={false} style={{ width: 104, height: 104, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }}>
    <Animated.View testID="success-halo-pulse" pointerEvents="none" style={[{ position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(94,170,104,0.08)', alignItems: 'center', justifyContent: 'center' }, halo]}>
      <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(94,170,104,0.12)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(94,170,104,0.18)' }} />
      </View>
    </Animated.View>
    <SuccessCheck size={48} animate={false} visible={visible} eventKey={eventKey} surfaceColor="#B4D7B8" color="#286B2C" />
  </View>;
}
