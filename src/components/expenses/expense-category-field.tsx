import { FieldLabel } from '@/components/ui/field-label';
import type { Ref } from 'react';
import { Keyboard, Text, View, type ViewInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { MotionRegion } from '@/components/ui/motion-content';
import { PosIcon } from '@/components/pos/pos-icon';
import { quickAddShadow, quickAddStyles } from '@/components/dashboard/quick-add-ui';
import { expenseCategories } from '@/data/quick-add';
import { expenseCategoryLabel } from '@/utils/expenses';
import tokens from '@/constants/design-tokens.json';

export function ExpenseCategoryField({ value, onChange, error, open, onOpenChange, triggerRef }: {
  value: string; onChange: (value: string) => void; error?: string;
  open: boolean; onOpenChange: (open: boolean) => void; triggerRef?: Ref<ViewInstance>;
}) {
  return <View style={{ gap: 4, zIndex: open ? 20 : 0 }}>
    <FieldLabel label="Select expense category" required={false} style={quickAddStyles.label} />
    <View style={{ position: 'relative', zIndex: open ? 10 : 0 }}>
      <Pressable ref={triggerRef} accessibilityRole="button" accessibilityLabel={`Expense category, required: ${value || 'Select an option'}`} accessibilityHint={error}
        accessibilityState={{ expanded: open }} onPress={() => { Keyboard.dismiss(); onOpenChange(!open); }}
        style={{ minHeight: tokens.size.touchTarget, paddingHorizontal: tokens.spacing.three, flexDirection: 'row', alignItems: 'center', borderWidth: 1,
          borderColor: error ? tokens.color.errorBase : open ? tokens.color.accentBase : tokens.color.borderOutline, borderRadius: tokens.radius.control,
          backgroundColor: tokens.color.navigationSurface, boxShadow: quickAddShadow }}>
        <Text style={{ flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: value ? tokens.color.textPrimary : '#9AA8B7' }}>{value ? expenseCategoryLabel(value) : 'e.g. Electricity'}</Text>
        <PosIcon name={open ? 'chevronUp' : 'chevronDown'} size={16} color={tokens.color.textPrimary} />
      </Pressable>
      {open && <MotionRegion testID="expense-category-dropdown" accessibilityLabel="Expense categories"
        style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 20, elevation: 12 }}>
        <View style={{ overflow: 'hidden', borderWidth: 1, borderColor: tokens.color.navigationBorder, borderRadius: tokens.radius.control,
          backgroundColor: tokens.color.navigationSurface, boxShadow: quickAddShadow }}>
          {expenseCategories.map(category => <Pressable key={category} accessibilityRole="radio" accessibilityState={{ checked: value === category }}
            onPress={() => { onChange(category); onOpenChange(false); }} style={{ minHeight: tokens.size.touchTarget, flexDirection: 'row', alignItems: 'center', paddingHorizontal: tokens.spacing.three, backgroundColor: 'transparent' }}>
            <Text style={{ flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 12, lineHeight: 18, color: tokens.color.textPrimary }}>{expenseCategoryLabel(category)}</Text>
            {value === category && <PosIcon name="check" size={16} color={tokens.button.primary.default} />}
          </Pressable>)}
        </View>
      </MotionRegion>}
    </View>
    {!!error && <MotionRegion><Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text></MotionRegion>}
  </View>;
}
