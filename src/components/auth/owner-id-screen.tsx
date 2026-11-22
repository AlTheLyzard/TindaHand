import { useTranslation } from '@/i18n/use-translation';
import { Text, View } from 'react-native';

import { RegistrationResultLayout } from '@/components/auth/registration-result-layout';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { Button } from '@/components/ui/button';
import { useLeaveOnce } from '@/hooks/use-leave-once';
import { DEFAULT_OWNER_AVATAR_ID } from '@/constants/profile-avatar-ids';
import type { RegistrationCompletion } from '@/types/auth';

export function OwnerIdScreen({ completion, onSkip, onSetup }: { completion: RegistrationCompletion; onSkip: () => void; onSetup: () => void }) {
  const { t } = useTranslation();
  const leave = useLeaveOnce();
  return (
    <RegistrationResultLayout step={2}
      notice={completion.mode === 'preview' && <Text accessibilityRole="alert" className="mt-2 type-micro-caption leading-4 text-text-secondary">{t('auth.details.preview')}</Text>}
      footer={<>
        <Text className="mb-3 text-center type-label-nav leading-[18px] text-brand">{t('auth.details.next')}</Text>
        <View className="gap-3">
          <Button onPress={() => leave(onSetup)}>{t('auth.details.continueSetup')}</Button>
          <Button variant="secondary" onPress={() => leave(onSkip)}>{t('auth.details.skip')}</Button>
        </View>
      </>}>
      <View className="mx-3 rounded-[20px] border border-outline bg-brand px-5 py-4">
        <View className="flex-row items-center justify-between gap-3">
          <ProfileAvatar avatarId={DEFAULT_OWNER_AVATAR_ID} size={48} />
          <Text className=" type-helper leading-[15px] text-white">{t('auth.details.idTitle')}</Text>
        </View>
        <Text className="mt-4 type-label-nav leading-[18px] text-white">{t('auth.details.ownerName')}</Text>
        <Text className="mt-2 type-large-metric leading-[44px] text-white">{completion.name}</Text>
        <View className="my-3 h-px bg-white/50" />
        <Text className=" type-label-nav leading-[18px] text-white">{t('auth.details.uniqueId')}</Text>
        <Text className="mt-2 type-large-metric leading-[44px] text-white">{completion.id}</Text>
        <Text className="mt-1 type-helper leading-[15px] text-white">{t('auth.details.permanence')}</Text>
      </View>
      <View className="mx-3 mt-5 rounded-[16px] border border-bright-blue bg-ice-container px-4 py-4">
        <Text accessibilityRole="header" className="type-h3-heading leading-[27px] text-action">{t('auth.details.reminderTitle')}</Text>
        <Text className="mt-2 text-justify type-micro-financial-rate leading-5 text-text-secondary">{t('auth.details.reminder')}</Text>
      </View>
    </RegistrationResultLayout>
  );
}
