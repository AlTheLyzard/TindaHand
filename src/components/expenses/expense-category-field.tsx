import type { Ref } from 'react';
import { Keyboard, Text, View, type ViewInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { MotionDisclosure, MotionRegion } from '@/components/ui/motion-content';
import { PosIcon } from '@/components/pos/pos-icon';
import { quickAddShadow, quickAddStyles } from '@/components/dashboard/quick-add-ui';
import { expenseCategories } from '@/data/quick-add';

export function ExpenseCategoryField({ value, onChange, error, open, onOpenChange, triggerRef }: {
  value: string; onChange: (value: string) => void; error?: string;
  open: boolean; onOpenChange: (open: boolean) => void; triggerRef?: Ref<ViewInstance>;
}) {
  return <View style={{ gap: 4 }}>
    <Text style={quickAddStyles.label}>Select expense category (Required)</Text>
    <Pressable ref={triggerRef} accessibilityRole="button" accessibilityLabel={`Expense category: ${value || 'Select an option'}`} accessibilityHint={error}
      accessibilityState={{ expanded: open }} onPress={() => { Keyboard.dismiss(); onOpenChange(!open); }}
      style={{ minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: error ? '#CC333B' : open ? '#2675FF' : '#FFFFFF', borderRadius: 10, backgroundColor: '#FFFFFF', boxShadow: quickAddShadow }}>
      <Text className="flex-1 font-poppins text-[12px] leading-[18px] text-[#102342]">{value || 'Select an option'}</Text>
      <PosIcon name={open ? 'chevronUp' : 'chevronDown'} size={16} color="#111111" />
    </Pressable>
    <MotionDisclosure visible={open}><View className="rounded-control border border-[#ADC9EE] bg-white">
      {expenseCategories.map(category => <Pressable key={category} accessibilityRole="radio" accessibilityState={{ checked: value === category }}
        onPress={() => { onChange(category); onOpenChange(false); }} className="min-h-12 flex-row items-center px-4 active:bg-canvas">
        <Text className="flex-1 font-poppins text-[12px] leading-[18px] text-[#102342]">{category}</Text>
        {value === category && <PosIcon name="check" size={16} color="#245399" />}
      </Pressable>)}
    </View></MotionDisclosure>
    {!!error && <MotionRegion><Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text></MotionRegion>}
  </View>;
}
