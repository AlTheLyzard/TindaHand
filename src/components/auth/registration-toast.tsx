import { IconButton } from '@/components/ui/button';
import { MotionRegion } from '@/components/ui/motion-content';
import { useToastOverlay } from '@/components/ui/toast-overlay';
import { useTranslation } from '@/i18n/use-translation';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useId } from 'react';
import { Text, View } from 'react-native';

import { SuccessMark } from '@/components/auth/success-mark';

export function RegistrationToast({ expiresAt, onDismiss, title, message }: { expiresAt: number | null; onDismiss: () => void; title?: string; message?: string }) {
  const { t } = useTranslation();
  const { registerToast, unregisterToast } = useToastOverlay();
  const toastId = useId();
  const toastTitle = title ?? t('auth.toast.title');
  const toastMessage = message ?? t('auth.toast.message');
  useFocusEffect(useCallback(() => {
    if (expiresAt === null) return;
    registerToast(toastId, <MotionRegion pointerEvents="auto" accessibilityRole="alert" accessibilityLiveRegion="polite"
      className="min-h-[52px] w-full flex-row items-center gap-2 rounded-[10px] border border-[#28652F] bg-[#E8F5E9] px-3 py-2"
      style={{ boxShadow: '0 3px 4px rgba(0,0,0,0.25)', elevation: 8 }}>
      <SuccessMark small />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-poppins text-[11px] leading-[16px] text-black">{toastTitle}</Text>
        <Text className="font-poppins text-[10px] leading-[15px] text-[#28652F]">{toastMessage}</Text>
      </View>
      <IconButton style={{ flexShrink: 0 }} accessibilityLabel={t('auth.toast.dismiss')} onPress={onDismiss} icon={({ color }) => <Text accessible={false} style={{ color, fontSize: 20 }}>×</Text>} />
    </MotionRegion>);
    return () => unregisterToast(toastId);
  }, [expiresAt, onDismiss, registerToast, t, toastId, toastMessage, toastTitle, unregisterToast]));
  useEffect(() => {
    if (expiresAt === null) return;
    const timer = setTimeout(onDismiss, Math.max(0, expiresAt - Date.now()));
    return () => {
      clearTimeout(timer);
    };
  }, [expiresAt, onDismiss]);
  return null;
}
