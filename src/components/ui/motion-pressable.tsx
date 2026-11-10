import { cssInterop } from 'nativewind';
import { useEffect, type Ref } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle, type ViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; ref?: Ref<ViewInstance>; className?: string; fadeOnPress?: boolean };

/** No wrapper or layout changes. Actions run immediately; only visual feedback animates. */
export function MotionPressable({ style, disabled, onPressIn, onPressOut, ref, fadeOnPress = true, ...props }: Props) {
  const reduced = useMotionReduced();
  const pressure = useSharedValue(0);
  const base = StyleSheet.flatten(style);
  const opacity = typeof base?.opacity === 'number' ? base.opacity : 1;
  const transform = Array.isArray(base?.transform) ? base.transform : [];
  const feedback = useAnimatedStyle(() => ({
    opacity: opacity * (1 - pressure.value * (fadeOnPress ? 0.14 : 0)),
    transform: [...transform, { scale: 1 - pressure.value * 0.015 }],
  }));
  useEffect(() => {
    if (disabled || reduced) pressure.set(0);
  }, [disabled, pressure, reduced]);
  return <AnimatedPressable {...props} ref={ref} disabled={disabled}
    onPressIn={event => {
      if (!disabled && !reduced) pressure.set(withTiming(1, { duration: motion.press, easing: motion.ease }));
      onPressIn?.(event);
    }}
    onPressOut={event => {
      pressure.set(reduced ? 0 : withTiming(0, { duration: motion.press, easing: motion.ease }));
      onPressOut?.(event);
    }}
    style={[style, { transitionProperty: ['backgroundColor', 'borderColor'], transitionDuration: reduced ? 0 : motion.state,
      transitionTimingFunction: motion.colorEase }, feedback]} />;
}

cssInterop(MotionPressable, { className: 'style' });
