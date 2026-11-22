import tokens from '@/constants/design-tokens.json';
import { Text, View } from 'react-native';

import { MotionPressable } from '@/components/ui/motion-pressable';

type Props<Value extends string> = {
  options: readonly { label: string; value: Value }[];
  value: Value;
  onChange: (value: Value) => void;
  tone?: 'default' | 'subtle';
};

export function SegmentedSelector<Value extends string>({ options, value, onChange, tone = 'default' }: Props<Value>) {
  return <View accessibilityRole="tablist" className="flex-row gap-1 rounded-surface border-2 border-ice-container p-1" style={{ backgroundColor: tone === 'subtle' ? tokens.color.iceContainer : tokens.color.surfaceCard }}>
    {options.map(option => {
      const selected = value === option.value;
      return <MotionPressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label}
        accessibilityState={{ selected }} aria-selected={selected} onPress={() => onChange(option.value)}
        className="min-h-12 min-w-0 flex-1 items-center justify-center rounded-control px-2"
        style={{ backgroundColor: selected ? tone === 'subtle' ? tokens.color.brightBlue : tokens.color.royalBlue : tone === 'subtle' ? tokens.color.iceContainer : tokens.color.surfaceCard }}>
        <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.bodyPrimary.fontSize, color: selected ? tokens.color.surfaceCard : tokens.color.royalBlue, textAlign: 'center' }}>{option.label}</Text>
      </MotionPressable>;
    })}
  </View>;
}
