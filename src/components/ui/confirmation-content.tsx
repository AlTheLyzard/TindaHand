import { Button, IconButton } from '@/components/ui/button';
import type { ViewInstance } from 'react-native';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';

/** Content only: render inside the active modal to avoid stacking native Modal windows. */
export function ConfirmationContent({ title, message, cancelLabel, confirmLabel, onCancel, onConfirm, variant = 'default', balancedActions = false, stackedActions = false }: {
  title: string; message: string; cancelLabel: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void;
  variant?: 'default' | 'quickAdd';
  balancedActions?: boolean;
  stackedActions?: boolean;
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
      <IconButton ref={close} accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-4 -top-4 min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={20} color={color} />} />
    </View>
    <Text className="mb-4 font-poppins text-[14px] leading-[21px] text-[#102342]">{message}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: tokens.spacing.two }}>
      <Button fullWidth={false} variant="destructiveOutline" onPress={onCancel} style={{ minWidth: 0, flex: 1, paddingHorizontal: tokens.spacing.two }}>{cancelLabel}</Button>
      <Button fullWidth={false} variant="destructive" onPress={onConfirm} style={{ minWidth: 0, flex: 1, paddingHorizontal: tokens.spacing.two }}>{confirmLabel}</Button>
    </View>
  </View>;
  return <View accessibilityViewIsModal className="w-full max-w-[412px] self-center rounded-control bg-white p-5" style={{ boxShadow: '0 3px 6px #00000040' }}>
    <View className="mb-3 flex-row items-center gap-2 border-b border-[#ADC9EE] pb-3 pr-8">
      <PosIcon name="alert" size={24} color="#B4232C" />
      <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px] text-[#B4232C]">{title}</Text>
      <IconButton ref={close} accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-3 -top-3" icon={({ color }) => <Text accessible={false} style={{ color, fontSize: 20 }}>×</Text>} />
    </View>
    <Text className="mb-5 font-poppins text-[14px] leading-[22px] text-[#102342]">{message}</Text>
    <View style={{ flexDirection: stackedActions ? 'column' : 'row', flexWrap: stackedActions || balancedActions ? 'nowrap' : 'wrap', alignItems: 'stretch', justifyContent: 'center', gap: tokens.spacing.two + (balancedActions ? 0 : tokens.spacing.one) }}>
      {stackedActions && <Button variant="destructive" onPress={onConfirm}>{confirmLabel}</Button>}
      <Button fullWidth={stackedActions} variant="destructiveOutline" onPress={onCancel} style={{ minWidth: balancedActions || stackedActions ? 0 : 120, flex: stackedActions ? undefined : 1, ...(balancedActions ? { paddingHorizontal: tokens.spacing.two } : {}) }}>{cancelLabel}</Button>
      {!stackedActions && <Button fullWidth={false} variant="destructive" onPress={onConfirm} style={{ minWidth: balancedActions ? 0 : 120, flex: 1, ...(balancedActions ? { paddingHorizontal: tokens.spacing.two } : {}) }}>{confirmLabel}</Button>}
    </View>
  </View>;
}
