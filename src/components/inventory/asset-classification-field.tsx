import { Keyboard, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { MotionRegion } from '@/components/ui/motion-content';
import { FieldLabel } from '@/components/ui/field-label';
import tokens from '@/constants/design-tokens.json';
import type { AssetClassification } from '@/types/inventory';

export const assetClassificationIllustrations = {
  current: require('@/assets/images/inventory/asset-current.svg'),
  equipment: require('@/assets/images/inventory/asset-equipment.svg'),
  furniture: require('@/assets/images/inventory/asset-furniture.svg'),
};
const descriptions: Record<AssetClassification, string> = {
  current: 'Money currently available in your business.',
  equipment: 'Machines, tools, and business equipment.',
  furniture: 'Tables, chairs, shelves, and store fixtures.',
};
const optionLabels: Record<AssetClassification, string> = {
  current: 'Cash On Hand',
  equipment: 'Equipment',
  furniture: 'Furniture & Fixtures',
};

/** MA-AST-002 uses visible radio cards; it has no dropdown or chevron. */
export function AssetClassificationField({ label, value, onChange, error }: {
  label: string; value: AssetClassification | ''; onChange: (value: AssetClassification) => void; error?: string;
}) {
  return <View style={{ gap: tokens.spacing.two }}>
    <FieldLabel label={label} style={{ fontFamily: tokens.typography.weights.bold, color: tokens.button.primary.default }} />
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: tokens.spacing.two }}>
      {(['current', 'equipment', 'furniture'] as AssetClassification[]).map(key => {
        const selected = key === value;
        return <MotionPressable key={key} testID={`asset-classification-${key}`} accessibilityRole="radio"
          accessibilityLabel={optionLabels[key]} accessibilityHint={descriptions[key]} accessibilityState={{ checked: selected }} aria-checked={selected}
          onPress={() => { Keyboard.dismiss(); onChange(key); }}
          style={{ minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.two, padding: tokens.spacing.three,
            borderWidth: 1, borderColor: error ? tokens.color.errorBase : tokens.color.borderOutline, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard }}>
          <Image source={assetClassificationIllustrations[key]} accessible={false} contentFit="contain" style={{ width: 26, height: 26, flexShrink: 0 }} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.microFinancialRate.fontSize, lineHeight: 21, color: tokens.button.primary.default }}>{optionLabels[key]}</Text>
            <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, lineHeight: 18, color: tokens.color.textSecondary }}>{descriptions[key]}</Text>
          </View>
          <View accessible={false} style={{ width: 20, height: 20, flexShrink: 0, borderWidth: 2, borderColor: tokens.button.primary.default, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' }}>
            {selected && <View style={{ width: 12, height: 12, borderRadius: tokens.radius.pill, backgroundColor: tokens.button.primary.default }} />}
          </View>
        </MotionPressable>;
      })}
    </View>
    {!!error && <MotionRegion><Text accessibilityRole="alert" style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.helper.fontSize, color: tokens.color.errorBase }}>{error}</Text></MotionRegion>}
  </View>;
}
