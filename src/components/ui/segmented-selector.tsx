import tokens from '@/constants/design-tokens.json';
import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MotionPressable } from '@/components/ui/motion-pressable';
import { MotionText } from '@/components/ui/motion-content';
import { motion } from '@/constants/motion';
import { useMotionReduced } from '@/state/motion';

type Props<Value extends string> = {
  options: readonly { label: string; value: Value }[];
  value: Value;
  onChange: (value: Value) => void;
  tone?: 'default' | 'subtle';
};

export function SegmentedSelector<Value extends string>({ options, value, onChange, tone = 'default' }: Props<Value>) {
  const reduced = useMotionReduced();
  const frames = useRef<Partial<Record<Value, { x: number; width: number }>>>({});
  const initialized = useRef(false);
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const moveTo = useCallback((frame: { x: number; width: number }) => {
    if (reduced || !initialized.current) {
      x.set(frame.x);
      width.set(frame.width);
      initialized.current = true;
    } else {
      x.set(withTiming(frame.x, { duration: motion.state, easing: motion.ease, reduceMotion: ReduceMotion.System }));
      width.set(withTiming(frame.width, { duration: motion.state, easing: motion.ease, reduceMotion: ReduceMotion.System }));
    }
  }, [reduced, width, x]);
  useEffect(() => {
    const frame = frames.current[value];
    if (frame) moveTo(frame);
  }, [moveTo, value]);
  const indicator = useAnimatedStyle(() => ({ left: x.value, width: width.value }));
  return <View accessibilityRole="tablist" className="flex-row gap-1 rounded-surface border-2 border-ice-container p-1" style={{ backgroundColor: tone === 'subtle' ? tokens.color.iceContainer : tokens.color.surfaceCard }}>
    <View className="relative flex-1 flex-row gap-1">
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, bottom: 0, borderRadius: tokens.radius.control,
      backgroundColor: tone === 'subtle' ? tokens.color.brightBlue : tokens.color.royalBlue }, indicator]} />
    {options.map(option => {
      const selected = value === option.value;
      return <MotionPressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label}
        accessibilityState={{ selected }} aria-selected={selected} onPress={() => onChange(option.value)}
        className="min-h-12 min-w-0 flex-1 items-center justify-center rounded-control px-2"
        onLayout={event => {
          const frame = { x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width };
          frames.current[option.value] = frame;
          if (selected) moveTo(frame);
        }}>
        <MotionText style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.bodyPrimary.fontSize,
          color: selected ? tokens.color.surfaceCard : tokens.color.royalBlue, textAlign: 'center' }}>{option.label}</MotionText>
      </MotionPressable>;
    })}
    </View>
  </View>;
}
