import type { ViewInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { PosIcon } from '@/components/pos/pos-icon';

/** Content only: render inside the active modal to avoid stacking native Modal windows. */
export function ConfirmationContent({ title, message, cancelLabel, confirmLabel, onCancel, onConfirm, variant = 'default' }: {
  title: string; message: string; cancelLabel: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void;
  variant?: 'default' | 'quickAdd';
}) {
  const close = useRef<ViewInstance>(null);
  useEffect(() => {
    if (!close.current) return;
    if (Platform.OS === 'web') close.current.focus();
    else AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus');
  }, []);
  if (variant === 'quickAdd') return <View accessibilityViewIsModal className="w-full max-w-[340px] self-center rounded-control bg-white p-[18px]" style={{ boxShadow: '0 3px 4px #00000040' }}>
    <View className="mb-4 flex-row items-center gap-2 border-b border-[#4A607A] pb-3 pr-5">
      <View className="h-7 w-7 items-center justify-center rounded-pill bg-[#E9A7A7]"><PosIcon name="alert" size={28} color="#B4232C" /></View>
      <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px] leading-6 text-[#B4232C]">{title}</Text>
      <Pressable ref={close} accessibilityRole="button" accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-4 -top-4 min-h-12 min-w-12 items-center justify-center"><PosIcon name="close" size={20} color="#111111" /></Pressable>
    </View>
    <Text className="mb-4 font-poppins text-[14px] leading-[21px] text-[#102342]">{message}</Text>
    <View className="flex-row flex-wrap justify-end gap-2">
      {[{ label: cancelLabel, action: onCancel, primary: false }, { label: confirmLabel, action: onConfirm, primary: true }].map(item => <Pressable key={item.label} accessibilityRole="button" onPress={item.action} className="min-h-12 min-w-[96px] flex-shrink justify-center">
        <View className="min-h-8 items-center justify-center rounded-control border border-[#CC333B] px-3 py-1" style={{ backgroundColor: item.primary ? '#CC333B' : '#FFFFFF', boxShadow: item.primary ? 'inset 0 2px 3px #ECA2A5, 0 3px 4px #CC333B40' : '0 3px 4px #CC333B30' }}>
          <Text className="text-center font-poppins-bold text-[14px] leading-5" style={{ color: item.primary ? '#FFFFFF' : '#CC333B' }}>{item.label}</Text>
        </View>
      </Pressable>)}
    </View>
  </View>;
  return <View accessibilityViewIsModal className="w-full max-w-[412px] self-center rounded-control bg-white p-5" style={{ boxShadow: '0 3px 6px #00000040' }}>
    <View className="mb-3 flex-row items-center gap-2 border-b border-[#ADC9EE] pb-3 pr-8">
      <PosIcon name="alert" size={24} color="#B4232C" />
      <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px] text-[#B4232C]">{title}</Text>
      <Pressable ref={close} accessibilityRole="button" accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-3 -top-3 min-h-12 min-w-12 items-center justify-center"><Text className="text-[20px] text-[#102342]">×</Text></Pressable>
    </View>
    <Text className="mb-5 font-poppins text-[14px] leading-[22px] text-[#102342]">{message}</Text>
    <View className="flex-row flex-wrap gap-3">
      <Pressable accessibilityRole="button" onPress={onCancel} className="min-h-12 min-w-[120px] flex-1 items-center justify-center rounded-control border border-[#CC333B] bg-white px-3 py-3">
        <Text className="text-center font-poppins-bold text-[14px] text-[#B4232C]">{cancelLabel}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onConfirm} className="min-h-12 min-w-[120px] flex-1 items-center justify-center rounded-control border border-[#CC333B] bg-[#CC333B] px-3 py-3">
        <Text className="text-center font-poppins-bold text-[14px] text-white">{confirmLabel}</Text>
      </Pressable>
    </View>
  </View>;
}
