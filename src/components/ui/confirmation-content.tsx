import { IconButton } from '@/components/ui/button';
import type { ButtonVariant } from '@/components/ui/button';
import type { ReactNode } from 'react';
import type { ViewInstance } from 'react-native';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { PosIcon } from '@/components/pos/pos-icon';
import { ConfirmationActions } from './confirmation-actions';

/** Content only: render inside the active modal to avoid stacking native Modal windows. */
export function ConfirmationContent({ title, message, cancelLabel, confirmLabel, onCancel, onConfirm, variant = 'default', balancedActions = false, stackedActions = true, leadingIcon, titleColor, destructive = true, cancelVariant }: {
  title: string; message: string; cancelLabel: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void;
  variant?: 'default' | 'quickAdd';
  balancedActions?: boolean;
  stackedActions?: boolean;
  leadingIcon?: ReactNode;
  titleColor?: string;
  destructive?: boolean;
  cancelVariant?: ButtonVariant;
}) {
  const close = useRef<ViewInstance>(null);
  useEffect(() => {
    if (!close.current) return;
    if (Platform.OS === 'web') close.current.focus();
    else AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus');
  }, []);
  if (variant === 'quickAdd') return <View accessibilityViewIsModal className="w-full max-w-[340px] self-center rounded-control bg-white p-[18px]" style={{ boxShadow: '0 3px 4px #00000040' }}>
      <View className="mb-4 flex-row items-center gap-2 border-b border-[#4A607A] pb-3 pr-5">
      {leadingIcon ?? <View className="h-7 w-7 items-center justify-center rounded-pill bg-[#E9A7A7]"><PosIcon name="alert" size={28} color="#B4232C" /></View>}
      <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px] leading-6" style={{ color: titleColor ?? '#B4232C' }}>{title}</Text>
      <IconButton ref={close} accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-4 -top-4 min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={20} color={color} />} />
    </View>
    <Text className="mb-4 font-poppins text-[14px] leading-[21px] text-[#102342]">{message}</Text>
    <ConfirmationActions destructive={destructive} cancelVariant={cancelVariant ?? 'destructiveOutline'} confirmLabel={confirmLabel} cancelLabel={cancelLabel} onConfirm={onConfirm} onCancel={onCancel} />
  </View>;
  return <View accessibilityViewIsModal className="w-full max-w-[412px] self-center rounded-control bg-white p-5" style={{ boxShadow: '0 3px 6px #00000040' }}>
    <View className="mb-3 flex-row items-center gap-2 border-b border-[#ADC9EE] pb-3 pr-8">
      {leadingIcon ?? <PosIcon name="alert" size={24} color="#B4232C" />}
      <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px]" style={{ color: titleColor ?? '#B4232C' }}>{title}</Text>
      <IconButton ref={close} accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-3 -top-3" icon={({ color }) => <Text accessible={false} style={{ color, fontSize: 20 }}>×</Text>} />
    </View>
    <Text className="mb-5 font-poppins text-[14px] leading-[22px] text-[#102342]">{message}</Text>
    <ConfirmationActions destructive={destructive} cancelVariant={cancelVariant} stacked={stackedActions && !balancedActions} confirmLabel={confirmLabel} cancelLabel={cancelLabel} onConfirm={onConfirm} onCancel={onCancel} />
  </View>;
}
