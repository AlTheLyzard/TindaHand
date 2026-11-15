import { useTranslation } from '@/i18n/use-translation';
import { useCallback } from 'react';
import { Text, View } from 'react-native';

import { RegistrationResultLayout } from '@/components/auth/registration-result-layout';
import { RegistrationToast } from '@/components/auth/registration-toast';
import { SuccessMark } from '@/components/auth/success-mark';
import { Button } from '@/components/ui/button';
import { useLeaveOnce } from '@/hooks/use-leave-once';
import { useAuthFlow } from '@/state/auth-flow';
import type { RegistrationCompletion } from '@/types/auth';

export function AccountCreatedScreen({ completion, onContinue }: { completion: RegistrationCompletion; onContinue: () => void }) {
  const { t } = useTranslation();
  const leave = useLeaveOnce();
  const { setCompletion } = useAuthFlow();
  const dismissToast = useCallback(() => setCompletion((current) => current ? { ...current, toastExpiresAt: null } : null), [setCompletion]);
  return (
    <RegistrationResultLayout step={1}
      notice={<>
        {completion.mode === 'preview' && <Text accessibilityRole="alert" className="mt-4 font-poppins text-[12px] leading-[18px] text-text-secondary">{t('auth.confirmation.preview')}</Text>}
        <RegistrationToast expiresAt={completion.toastExpiresAt} onDismiss={dismissToast} />
      </>}
      footer={<>
        <Text className="mb-3 text-center font-poppins-bold text-[12px] leading-[18px] text-brand">{t('auth.confirmation.reminder')}</Text>
        <Button onPress={() => leave(onContinue)}>{t('common.continue')}</Button>
      </>}>
      <View className="mx-1 px-7 py-8" style={{ boxShadow: 'inset 0 0 16px rgba(115,153,204,0.14)' }}>
        <SuccessMark animate eventKey={completion.id} />
        <Text accessibilityRole="header" className="mt-6 font-poppins-bold text-[30px] leading-[44px] text-brand">{t('auth.confirmation.title')}</Text>
        <Text className="font-poppins text-[10px] leading-[15px] text-text-secondary">{t('auth.confirmation.subtitle')}</Text>
        <View className="mt-6 rounded-[10px] bg-white px-6 py-5" style={{ boxShadow: '0 4px 3px rgba(0,0,0,0.28)' }}>
          <Text className="font-poppins-bold text-[12px] leading-[18px] text-text-secondary">{t('roles.owner')}</Text>
          <Text className="font-poppins-bold text-[20px] leading-[30px] text-[#102342]">{completion.name}</Text>
        </View>
      </View>
    </RegistrationResultLayout>
  );
}
