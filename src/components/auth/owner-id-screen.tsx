import { useTranslation } from '@/i18n/use-translation';
import { ScrollView, Text, View } from 'react-native';
import { AuthBackground } from '@/components/auth/auth-background';

import { RegistrationProgress } from '@/components/auth/registration-progress';
import { Button } from '@/components/ui/button';
import type { RegistrationCompletion } from '@/types/auth';

export function OwnerIdScreen({ completion, onSkip, onSetup }: { completion: RegistrationCompletion; onSkip: () => void; onSetup: () => void }) {
  const { t } = useTranslation();
  return (
    <AuthBackground>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5">
          <RegistrationProgress step={2} />
          {completion.mode === 'preview' && <Text accessibilityRole="alert" className="mt-2 font-poppins text-[11px] leading-4 text-text-secondary">{t('auth.details.preview')}</Text>}
          <View className="mx-3 mt-4 rounded-[20px] bg-[#153370] px-5 py-4" style={{ boxShadow: '0 4px 3px rgba(0,0,0,0.28)' }}>
            <View className="flex-row items-center justify-between gap-3">
              <View accessible={false} className="h-10 w-10 items-center justify-center rounded-full bg-[#2D6DCF]">
                <View className="h-5 w-7 rounded border-2 border-white"><View className="mt-1 h-px bg-white" /></View>
              </View>
              <Text className="font-poppins text-[10px] leading-[15px] text-white">{t('auth.details.idTitle')}</Text>
            </View>
            <Text className="mt-4 font-poppins-bold text-[12px] leading-[18px] text-white">{t('auth.details.ownerName')}</Text>
            <Text className="mt-2 font-poppins-bold text-[30px] leading-[44px] text-white">{completion.name}</Text>
            <View className="my-3 h-px bg-[#7399CC]" />
            <Text className="font-poppins-bold text-[12px] leading-[18px] text-white">{t('auth.details.uniqueId')}</Text>
            <Text className="mt-2 font-poppins-bold text-[30px] leading-[44px] text-white">{completion.id}</Text>
            <Text className="mt-1 font-poppins text-[10px] leading-[15px] text-white">{t('auth.details.permanence')}</Text>
          </View>
          <View className="mx-3 mt-5">
            <Text accessibilityRole="header" className="font-poppins-bold text-[16px] leading-6 text-[#102342]">{t('auth.details.reminderTitle')}</Text>
            <Text className="mt-2 text-justify font-poppins text-[13px] leading-5 text-text-secondary">{t('auth.details.reminder')}</Text>
          </View>
          <View className="min-h-3 flex-1" />
          <Text className="mb-3 mt-3 text-center font-poppins-bold text-[12px] leading-[18px] text-brand">{t('auth.details.next')}</Text>
          <View className="gap-3">
            <Button onPress={onSetup}>{t('auth.details.continueSetup')}</Button>
            <Button variant="secondary" onPress={onSkip}>{t('auth.details.skip')}</Button>
          </View>
        </View>
      </ScrollView>
    </AuthBackground>
  );
}
