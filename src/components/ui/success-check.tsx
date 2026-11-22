import tokens from '@/constants/design-tokens.json';
import { useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useMotionReduced } from '@/state/motion';
import { usePresentationVisible } from '@/state/presentation';

export const successTiming = { draw: 1000, short: 360, long: 640 } as const;
const joint = successTiming.short / successTiming.draw;

/** Draw tip-to-joint, then joint-to-tip inside a stationary circle. Presentation
 * and event identity replay the drawing; interruption settles the completed mark. */
export function SuccessCheck({ size = 52, animate = true, visible = true, eventKey = 0, delay = 0,
  color = tokens.color.successBase, surfaceColor = tokens.color.successTint, testID = 'success-check' }: {
  size?: number; animate?: boolean; visible?: boolean; eventKey?: string | number; delay?: number;
  color?: string; surfaceColor?: string; testID?: string;
}) {
  const reduced = useMotionReduced();
  const presented = usePresentationVisible();
  const [laidOut, setLaidOut] = useState(false);
  const progress = useSharedValue(animate && !reduced ? 0 : 1);
  useLayoutEffect(() => {
    cancelAnimation(progress);
    progress.set(animate && !reduced ? 0 : 1);
    if (!animate || reduced || !visible || !presented || !laidOut) return;
    let frame: number | null = null;
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(() => {
        // MotionProvider owns the live preference. Reanimated's System value
        // can retain the startup setting after the user changes it in Settings.
        progress.set(withSequence(
          ReduceMotion.Never,
          withTiming(joint, { duration: successTiming.short, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }),
          withTiming(1, { duration: successTiming.long, easing: Easing.inOut(Easing.cubic), reduceMotion: ReduceMotion.Never }),
        ));
      });
    }, delay);
    // Completion cannot navigate. The deadline also restores a complete static
    // icon if the animation is cancelled or never reports completion.
    const fallback = setTimeout(() => { cancelAnimation(progress); progress.set(1); }, delay + successTiming.draw + 160);
    return () => {
      clearTimeout(timer); clearTimeout(fallback);
      if (frame !== null) cancelAnimationFrame(frame);
      cancelAnimation(progress); progress.set(1);
    };
  }, [animate, delay, eventKey, laidOut, presented, reduced, progress, visible]);
  const factor = size / 52;
  const shortStroke = useAnimatedStyle(() => ({
    height: 16 * factor * Math.min(1, Math.max(0, progress.get() / joint)),
    opacity: progress.get() > 0 ? 1 : 0,
  }));
  const longStroke = useAnimatedStyle(() => ({
    width: 28 * factor * Math.min(1, Math.max(0, (progress.get() - joint) / (1 - joint))),
    opacity: progress.get() > joint ? 1 : 0,
  }));
  return <View testID={testID} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    collapsable={false} onLayout={() => setLaidOut(true)} style={{ width: size, height: size }}>
    <View testID={`${testID}-circle`} style={{ width: size, height: size, borderRadius: size / 2,
      backgroundColor: surfaceColor, borderColor: color, borderWidth: size < 30 ? 2 : 3,
      alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 28 * factor, height: 16 * factor, transform: [{ translateY: -3 * factor }, { rotate: '-45deg' }] }}>
        <Animated.View testID={`${testID}-short-stroke`} style={[styles.stroke, { left: 0, top: 0, width: 4 * factor, backgroundColor: color }, shortStroke]} />
        <Animated.View testID={`${testID}-long-stroke`} style={[styles.stroke, { left: 0, bottom: 0, height: 4 * factor, backgroundColor: color }, longStroke]} />
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({ stroke: { position: 'absolute', borderRadius: 2 } });
