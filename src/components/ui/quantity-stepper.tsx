import { Text, View } from 'react-native';
import { ButtonSurface } from '@/components/ui/button';
import { PosIcon } from '@/components/pos/pos-icon';

/** Shared, compact quantity controls for cart and product-selection rows. */
export function QuantityStepper({ value, valueLabel, decreaseLabel, increaseLabel, onDecrease, onIncrease,
  decreaseDisabled = false, increaseDisabled = false, compact = false, valueTextClassName = 'font-poppins-bold text-[16px] text-[#102342]' }: {
  value: number; valueLabel: string; decreaseLabel: string; increaseLabel: string;
  onDecrease: () => void; onIncrease: () => void;
  decreaseDisabled?: boolean; increaseDisabled?: boolean; compact?: boolean; valueTextClassName?: string;
}) {
  const buttonSize = compact ? 32 : 40;
  const iconSize = compact ? 14 : 18;
  return <View className="flex-row items-center" style={{ gap: 4 }}>
    <ButtonSurface variant="primary" accessibilityLabel={decreaseLabel} disabled={decreaseDisabled} onPress={onDecrease}
      hitSlop={compact ? 8 : 4} style={{ width: buttonSize, height: buttonSize, minWidth: buttonSize, minHeight: buttonSize, padding: 0, aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
      {({ color }) => <PosIcon name="minus" size={iconSize} color={color} active />}
    </ButtonSurface>
    <Text accessibilityLabel={valueLabel} numberOfLines={1} className={`min-w-7 text-center ${valueTextClassName}`}
      style={{ minWidth: 28, flexShrink: 0 }}>{value}</Text>
    <ButtonSurface variant="primary" accessibilityLabel={increaseLabel} disabled={increaseDisabled} onPress={onIncrease}
      hitSlop={compact ? 8 : 4} style={{ width: buttonSize, height: buttonSize, minWidth: buttonSize, minHeight: buttonSize, padding: 0, aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
      {({ color }) => <PosIcon name="plus" size={iconSize} color={color} active />}
    </ButtonSurface>
  </View>;
}
