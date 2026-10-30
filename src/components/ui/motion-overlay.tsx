import type { ViewInstance } from 'react-native';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { RetainedContent } from '@/components/ui/motion-modal';
import { motion } from '@/constants/motion';
import { useOverlayTransition } from '@/hooks/use-overlay-transition';

/** Inline confirmations share the active native window and release touches as soon as closed. */
export function MotionOverlay({ visible, children }: { visible: boolean; children: ReactNode }) {
  const transition = useOverlayTransition(visible, undefined, motion.state, false);
  const host = useRef<ViewInstance>(null);
  const backdrop = useAnimatedStyle(() => ({ opacity: transition.progress.value }));
  const surface = useAnimatedStyle(() => ({ opacity: transition.progress.value,
    transform: [{ scale: transition.reduced ? 1 : 0.985 + 0.015 * transition.progress.value }] }));
  useEffect(() => {
    if (Platform.OS === 'web' && host.current) (host.current as unknown as { inert: boolean }).inert = !visible;
  }, [transition.presented, visible]);
  if (!transition.presented) return null;
  return <View ref={host} style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}
    accessibilityElementsHidden={!visible} importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.30)' }, backdrop]} />
    <Animated.View style={[{ flex: 1 }, surface]}>
      <RetainedContent visible={visible}>{children}</RetainedContent>
    </Animated.View>
  </View>;
}
