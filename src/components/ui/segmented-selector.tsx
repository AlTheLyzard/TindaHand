import { Text, View } from 'react-native';

import { MotionPressable } from '@/components/ui/motion-pressable';

type Props<Value extends string> = {
  options: readonly { label: string; value: Value }[];
  value: Value;
  onChange: (value: Value) => void;
  tone?: 'default' | 'subtle';
};

export function SegmentedSelector<Value extends string>({ options, value, onChange, tone = 'default' }: Props<Value>) {
  return <View accessibilityRole="tablist" className="flex-row gap-1 rounded-surface border-2 border-[#D9E7F4] p-1" style={{ backgroundColor: tone === 'subtle' ? '#D9E7F4' : '#FFFFFF' }}>
    {options.map(option => {
      const selected = value === option.value;
      return <MotionPressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label}
        accessibilityState={{ selected }} aria-selected={selected} onPress={() => onChange(option.value)}
        className="min-h-12 min-w-0 flex-1 items-center justify-center rounded-control px-2"
        style={{ backgroundColor: selected ? tone === 'subtle' ? '#2F6CC9' : '#245399' : tone === 'subtle' ? '#D9E7F4' : '#FFFFFF' }}>
        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 16, color: selected ? '#FFFFFF' : '#245399', textAlign: 'center' }}>{option.label}</Text>
      </MotionPressable>;
    })}
  </View>;
}
