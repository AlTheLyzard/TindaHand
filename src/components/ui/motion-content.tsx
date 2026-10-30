import { cssInterop } from 'nativewind';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewProps, type TextProps, type ViewInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';

const layout = LinearTransition.duration(motion.state).easing(motion.ease).reduceMotion(ReduceMotion.System);
const enter = FadeIn.duration(motion.state).reduceMotion(ReduceMotion.System);
const exit = FadeOut.duration(motion.press).reduceMotion(ReduceMotion.System);

/** Use for bounded conditional regions, never for recycled list rows. */
export function MotionRegion({ children, ...props }: ViewProps & { children?: ReactNode }) {
  const reduced = useMotionReduced();
  return <Animated.View {...props} collapsable={false} layout={reduced ? undefined : layout}
    entering={reduced ? undefined : enter} exiting={reduced ? undefined : exit}>{children}</Animated.View>;
}
cssInterop(MotionRegion, { className: 'style' });

export function MotionLayout(props: ViewProps) {
  const reduced = useMotionReduced();
  return <Animated.View {...props} collapsable={false} layout={reduced ? undefined : layout} />;
}
cssInterop(MotionLayout, { className: 'style' });

/** Keep children mounted (including focused inputs); fade only when the semantic state changes. */
export function MotionContent({ changeKey, style, ...props }: ViewProps & { changeKey: string | boolean }) {
  const reduced = useMotionReduced();
  const opacity = useSharedValue(1);
  const previous = useRef(changeKey);
  useLayoutEffect(() => {
    if (previous.current === changeKey) {
      if (reduced) opacity.set(1);
      return;
    }
    previous.current = changeKey;
    if (reduced) { opacity.set(1); return; }
    opacity.set(0.65);
    opacity.set(withTiming(1, { duration: motion.state, easing: motion.ease }));
  }, [changeKey, opacity, reduced]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View {...props} style={[style, fade]} />;
}
cssInterop(MotionContent, { className: 'style' });

export function MotionSurface({ style, ...props }: ViewProps) {
  const reduced = useMotionReduced();
  return <Animated.View {...props} style={[style, {
    transitionProperty: ['backgroundColor', 'borderColor'], transitionDuration: reduced ? 0 : motion.state,
    transitionTimingFunction: motion.colorEase,
  }]} />;
}
cssInterop(MotionSurface, { className: 'style' });

export function MotionText({ style, ...props }: TextProps) {
  const reduced = useMotionReduced();
  const target = StyleSheet.flatten(style)?.color;
  const color = useSharedValue(typeof target === 'string' ? target : '#102342');
  useLayoutEffect(() => {
    if (typeof target === 'string') color.set(reduced ? target : withTiming(target, { duration: motion.state, easing: motion.ease }));
  }, [color, reduced, target]);
  const ink = useAnimatedStyle(() => ({ color: color.value }));
  return <Animated.Text {...props} style={[style, typeof target === 'string' ? ink : undefined]} />;
}
cssInterop(MotionText, { className: 'style' });

/** Animate a dropdown's actual occupied height so following fields cannot overlap its exit. */
export function MotionDisclosure({ visible, children }: { visible: boolean; children: ReactNode }) {
  const reduced = useMotionReduced();
  const [measured, setMeasured] = useState(0);
  const height = useSharedValue(0);
  const host = useRef<ViewInstance>(null);
  useLayoutEffect(() => {
    const target = visible ? measured : 0;
    height.set(reduced ? target : withTiming(target, { duration: motion.state, easing: motion.ease }));
  }, [height, measured, reduced, visible]);
  useEffect(() => {
    if (Platform.OS === 'web' && host.current) (host.current as unknown as { inert: boolean }).inert = !visible;
  }, [visible]);
  const reveal = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View ref={host} pointerEvents={visible ? 'auto' : 'none'} aria-hidden={!visible}
    accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    style={[{ overflow: 'hidden' }, reveal]}>
    <View onLayout={event => setMeasured(event.nativeEvent.layout.height)} style={{ position: 'absolute', width: '100%' }}>{children}</View>
  </Animated.View>;
}
