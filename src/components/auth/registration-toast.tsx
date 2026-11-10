import { IconButton } from '@/components/ui/button';
import { MotionRegion } from '@/components/ui/motion-content';
import { useTranslation } from '@/i18n/use-translation';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { SuccessMark } from '@/components/auth/success-mark';

export function RegistrationToast({ expiresAt, onDismiss, title, message }: { expiresAt: number | null; onDismiss: () => void; title?: string; message?: string }) {
  const { t } = useTranslation();
  const [slotHeight, setSlotHeight] = useState(52);
  useEffect(() => {
    if (expiresAt === null) return;
    const timer = setTimeout(onDismiss, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt, onDismiss]);

  // Keep the slot stable when dismissed so the success card does not jump.
  return (
    <View className="mt-5 items-end" style={{ minHeight: slotHeight }}>
      {expiresAt !== null && (
        <MotionRegion accessibilityRole="alert" accessibilityLiveRegion="polite"
          onLayout={(event) => setSlotHeight(Math.max(52, event.nativeEvent.layout.height))}
          className="min-h-[52px] w-full max-w-[300px] flex-row items-center gap-2 rounded-[10px] border border-[#28652F] bg-[#E8F5E9] py-2 pl-2 pr-12"
          style={{ boxShadow: '0 3px 4px rgba(0,0,0,0.25)' }}>
          <SuccessMark small />
          <View className="min-w-0 flex-1">
            <Text className="font-poppins text-[11px] leading-[16px] text-black">{title ?? t('auth.toast.title')}</Text>
            <Text className="font-poppins text-[10px] leading-[15px] text-[#28652F]">{message ?? t('auth.toast.message')}</Text>
          </View>
          <IconButton accessibilityLabel={t('auth.toast.dismiss')} onPress={onDismiss} className="absolute right-0 top-0" icon={({ color }) => <Text accessible={false} style={{ color, fontSize: 20 }}>×</Text>} />
        </MotionRegion>
      )}
    </View>
  );
}
