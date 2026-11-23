import type { Ref } from 'react';
import { Text, View, type ViewInstance } from 'react-native';
import { FieldLabel } from '@/components/ui/field-label';
import { MotionPressable } from '@/components/ui/motion-pressable';
import { MotionRegion } from '@/components/ui/motion-content';
import { PosIcon } from '@/components/pos/pos-icon';
import { expenseCategories } from '@/data/quick-add';
import { expenseCategoryLabel } from '@/utils/expenses';
import tokens from '@/constants/design-tokens.json';

const categoryIcons = {
  'Water Expense': 'droplet',
  'Electricity Expense': 'lightning',
  'Others Expense': 'briefcase',
} as const;
const categoryOrder: readonly (typeof expenseCategories)[number][] = ['Water Expense', 'Electricity Expense', 'Others Expense'];

export function ExpenseCategoryField({ value, onChange, error, triggerRef }: {
  value: string; onChange: (value: string) => void; error?: string; triggerRef?: Ref<ViewInstance>;
}) {
  return <View style={{ gap: tokens.spacing.one }}>
    <FieldLabel label="Category" required />
    <View accessibilityRole="radiogroup" accessibilityLabel="Category" style={{ gap: 4 }}>
      {categoryOrder.map((category, index) => {
        const selected = value === category;
        return <MotionPressable key={category} ref={index === 0 ? triggerRef : undefined}
          testID={`expense-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
          accessibilityRole="radio" accessibilityLabel={expenseCategoryLabel(category)} accessibilityState={{ checked: selected }} aria-checked={selected}
          onPress={() => onChange(category)}
          style={{ minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16,
            borderWidth: 1, borderColor: tokens.color.borderOutline, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard }}>
          <PosIcon name={categoryIcons[category]} color={tokens.color.black} size={30} />
          <Text style={{ flex: 1, fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.bodyPrimary.fontSize,
            lineHeight: tokens.typography.bodyPrimary.lineHeight, color: tokens.color.darkNavy }}>{expenseCategoryLabel(category)}</Text>
          <View accessibilityElementsHidden style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: tokens.color.royalBlue,
            alignItems: 'center', justifyContent: 'center' }}>
            {selected && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: tokens.color.royalBlue }} />}
          </View>
        </MotionPressable>;
      })}
    </View>
    {!!error && <MotionRegion><Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ marginTop: tokens.spacing.two,
      fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.helper.fontSize,
      lineHeight: tokens.typography.helper.lineHeight, color: tokens.color.errorBase }}>{error}</Text></MotionRegion>}
  </View>;
}
