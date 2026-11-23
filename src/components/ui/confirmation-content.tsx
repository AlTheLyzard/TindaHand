import tokens from '@/constants/design-tokens.json';
import { IconButton } from '@/components/ui/button';
import type { ButtonVariant } from '@/components/ui/button';
import type { ReactNode } from 'react';
import type { ViewInstance } from 'react-native';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, Text, View } from 'react-native';
import { PosIcon } from '@/components/pos/pos-icon';
import { ConfirmationActions } from './confirmation-actions';

/** Content only: render inside the active modal to avoid stacking native Modal windows. */
export function ConfirmationContent({ title, message, cancelLabel, confirmLabel, onCancel, onConfirm, variant = 'default', balancedActions = false, stackedActions = true, leadingIcon, titleColor, destructive = true, cancelVariant, iconTone = 'danger', busy = false, confirmDisabled = false }: {
  title: string; message: string; cancelLabel: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void;
  variant?: 'default' | 'quickAdd' | 'quickAddDialog';
  balancedActions?: boolean;
  stackedActions?: boolean;
  leadingIcon?: ReactNode;
  titleColor?: string;
  destructive?: boolean;
  cancelVariant?: ButtonVariant;
  iconTone?: 'danger' | 'blue';
  busy?: boolean;
  confirmDisabled?: boolean;
}) {
  const close = useRef<ViewInstance>(null);
  useEffect(() => {
    if (!close.current) return;
    if (Platform.OS === 'web') close.current.focus();
    else AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus');
  }, []);
  const iconColor = iconTone === 'blue' ? tokens.color.brightBlue : tokens.color.errorBase;
  const iconSurface = iconTone === 'blue' ? tokens.color.softBlue : tokens.color.errorSoft;
  if (variant === 'quickAddDialog') return <View accessibilityViewIsModal className="w-full max-w-[340px] self-center rounded-card bg-white p-4">
      <View className="mb-4 flex-row items-center gap-2 border-b border-outline pb-3 pr-5">
      {leadingIcon ?? <PosIcon name="alert" size={24} color={iconColor} />}
      <Text accessibilityRole="header" className="flex-1 type-list-financial leading-6" style={{ color: titleColor ?? tokens.color.errorBase }}>{title}</Text>
      <IconButton ref={close} accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-4 -top-4 min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={20} color={color} />} />
    </View>
    <Text className="mb-4 type-micro-financial-rate leading-[21px] text-text-primary">{message}</Text>
    <ConfirmationActions destructive={destructive} cancelVariant={cancelVariant ?? 'destructiveOutline'} confirmLabel={confirmLabel} cancelLabel={cancelLabel} onConfirm={onConfirm} onCancel={onCancel} busy={busy} confirmDisabled={confirmDisabled} />
  </View>;
  if (variant === 'quickAdd') return <View accessibilityViewIsModal className="w-full max-w-[340px] self-center rounded-control bg-white p-[18px]">
      <View className="mb-4 flex-row items-center gap-2 border-b border-text-secondary pb-3 pr-5">
      {leadingIcon ?? (iconTone === 'blue'
        ? <View className="h-8 w-8 shrink-0 items-center justify-center rounded-pill" style={{ backgroundColor: iconSurface }}><PosIcon name="alert" size={18} color={iconColor} /></View>
        : <View className="h-7 w-7 items-center justify-center rounded-pill bg-error-tint"><PosIcon name="alert" size={28} color={iconColor} /></View>)}
      <Text accessibilityRole="header" className="flex-1 type-list-financial leading-6" style={{ color: titleColor ?? tokens.color.errorBase }}>{title}</Text>
      <IconButton ref={close} accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-4 -top-4 min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="close" size={20} color={color} />} />
    </View>
    <Text className="mb-4 type-micro-financial-rate leading-[21px] text-text-primary">{message}</Text>
    <ConfirmationActions destructive={destructive} cancelVariant={cancelVariant ?? 'destructiveOutline'} confirmLabel={confirmLabel} cancelLabel={cancelLabel} onConfirm={onConfirm} onCancel={onCancel} busy={busy} confirmDisabled={confirmDisabled} />
  </View>;
  return <View accessibilityViewIsModal className="w-full max-w-[412px] self-center rounded-control bg-white p-5">
    <View className="mb-3 flex-row items-center gap-2 border-b border-outline pb-3 pr-8">
      {leadingIcon ?? <PosIcon name="alert" size={24} color={iconColor} />}
      <Text accessibilityRole="header" className="flex-1 type-list-financial" style={{ color: titleColor ?? tokens.color.errorBase }}>{title}</Text>
      <IconButton ref={close} accessibilityLabel="Close confirmation" onPress={onCancel} className="absolute -right-3 -top-3" icon={({ color }) => <PosIcon name="close" size={20} color={color} />} />
    </View>
    <Text className="mb-5 type-micro-financial-rate leading-[22px] text-text-primary">{message}</Text>
    <ConfirmationActions destructive={destructive} cancelVariant={cancelVariant} stacked={stackedActions && !balancedActions} confirmLabel={confirmLabel} cancelLabel={cancelLabel} onConfirm={onConfirm} onCancel={onCancel} busy={busy} confirmDisabled={confirmDisabled} />
  </View>;
}
