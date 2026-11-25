import { useTranslation } from '@/i18n/use-translation';
import { Text, View } from 'react-native';

import { AccountIdCard } from '@/components/auth/account-id-card';
import { RegistrationResultLayout } from '@/components/auth/registration-result-layout';
import { Button } from '@/components/ui/button';
import { DEFAULT_OWNER_AVATAR_ID } from '@/constants/profile-avatar-ids';
import { useLeaveOnce } from '@/hooks/use-leave-once';
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
      <View className="mx-2">
        <AccountIdCard
          avatarId={DEFAULT_OWNER_AVATAR_ID}
          nameLabel={t('auth.details.ownerName')}
          name={completion.name}
          idLabel={t('fields.ownerId')}
          id={completion.id}
          footerText={t('auth.details.permanence')}
        />
      </View>
      <View className="mx-3 mt-5 rounded-[16px] border border-bright-blue bg-ice-container px-4 py-4">
        <Text accessibilityRole="header" className="type-h3-heading leading-[27px] text-action">{t('auth.details.reminderTitle')}</Text>
        <Text className="mt-2 text-justify type-micro-financial-rate leading-5 text-text-secondary">{t('auth.details.reminder')}</Text>
      </View>
    </RegistrationResultLayout>
  );
}
