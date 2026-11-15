import { Keyboard, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { MotionRegion } from '@/components/ui/motion-content';
import { FieldLabel } from '@/components/ui/field-label';
import tokens from '@/constants/design-tokens.json';
import type { AssetClassification } from '@/types/inventory';
import { assetLabels } from '@/utils/inventory';

const illustrations = {
  current: require('@/assets/images/inventory/asset-current.svg'),
  equipment: require('@/assets/images/inventory/asset-equipment.svg'),
  furniture: require('@/assets/images/inventory/asset-furniture.svg'),
};
const descriptions: Record<AssetClassification, string> = {
  current: 'Money currently available in your business.',
  equipment: 'Machines, tools, and business equipment.',
  furniture: 'Tables, chairs, shelves, and store fixtures.',
};

/** MA-AST-002 uses visible radio cards; it has no dropdown or chevron. */
export function AssetClassificationField({ label, value, onChange, error }: {
  label: string; value: AssetClassification | ''; onChange: (value: AssetClassification) => void; error?: string;
}) {
  return <View style={{ gap: tokens.spacing.two }}>
    <FieldLabel label={label} style={{ fontFamily: 'Poppins_700Bold', color: tokens.button.primary.default }} />
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: tokens.spacing.three }}>
      {(Object.keys(assetLabels) as AssetClassification[]).map(key => {
        const selected = key === value, current = key === 'current';
        return <MotionPressable key={key} testID={`asset-classification-${key}`} accessibilityRole="radio"
          accessibilityLabel={assetLabels[key]} accessibilityHint={descriptions[key]} accessibilityState={{ checked: selected }} aria-checked={selected}
          onPress={() => { Keyboard.dismiss(); onChange(key); }}
          style={{ minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: 20, padding: tokens.spacing.three,
            borderWidth: 1, borderColor: error ? '#D32F2F' : tokens.color.borderOutline, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard }}>
          <Image source={illustrations[key]} accessible={false} contentFit="contain" style={{ width: 26, height: 26, flexShrink: 0 }} />
          <View style={{ flex: 1, minWidth: 0, gap: 4, paddingRight: 20 }}>
            <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, lineHeight: 21, color: tokens.button.primary.default }}>{assetLabels[key]}</Text>
            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: tokens.color.textSecondary }}>{descriptions[key]}</Text>
            <View style={{ alignSelf: 'flex-start', borderWidth: 1, borderColor: current ? '#36843B' : '#2F6CC9', borderRadius: tokens.radius.pill, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: current ? '#E7F3E8' : tokens.color.surfaceSubtle, boxShadow: '0 2px 3px #00000030' }}>
              <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 9, lineHeight: 14, color: current ? tokens.color.successBase : tokens.button.primary.default }}>{current ? 'Current Asset' : 'Non-Current Asset'}</Text>
            </View>
          </View>
          <View accessible={false} style={{ position: 'absolute', right: 16, top: 16, width: 20, height: 20, borderWidth: 2, borderColor: tokens.button.primary.default, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' }}>
            {selected && <View style={{ width: 12, height: 12, borderRadius: tokens.radius.pill, backgroundColor: tokens.button.primary.default }} />}
          </View>
        </MotionPressable>;
      })}
    </View>
    {!!error && <MotionRegion><Text accessibilityRole="alert" style={{ fontFamily: 'Poppins_400Regular', fontSize: 10, color: tokens.color.errorBase }}>{error}</Text></MotionRegion>}
  </View>;
}
