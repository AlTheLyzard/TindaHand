import { MotionSurface, MotionText } from '@/components/ui/motion-content';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';

import tokens from '@/constants/design-tokens.json';

/** Reference-sized pills inside full touch targets; text can wrap when scaled. */
export function PosChip({ label, accessibilityLabel, selected, onPress, radio = false, stretch = false, compact = false }: {
  label: string; accessibilityLabel?: string; selected: boolean; onPress: () => void; radio?: boolean; stretch?: boolean; compact?: boolean;
}) {
  return <Pressable accessibilityRole={radio ? 'radio' : 'button'} accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={radio ? { checked: selected } : { selected }} onPress={onPress}
    className="justify-center" style={{ minHeight: tokens.size.touchTarget, minWidth: tokens.size.touchTarget, flexShrink: 0, flex: stretch ? 1 : undefined }}>
    <MotionSurface className="items-center justify-center rounded-pill py-1.5" style={{ minHeight: 32, paddingHorizontal: compact ? 8 : 12, backgroundColor: selected ? '#245399' : tokens.color.surfaceSubtle }}>
      <MotionText className="text-center font-poppins-bold leading-[18px]" style={{ fontSize: compact ? 10 : 11, color: selected ? '#FFFFFF' : '#102342' }}>{label}</MotionText>
    </MotionSurface>
  </Pressable>;
}
