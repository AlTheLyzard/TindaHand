import { useTranslation } from '@/i18n/use-translation';
import { useState } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountRoleCard, accountOptions } from '@/components/auth/account-role-card';
import { Button } from '@/components/ui/button';
import { router } from 'expo-router';
import { AuthHeader } from '@/components/auth/auth-header';
import { useAuthFlow } from '@/state/auth-flow';
import type { AccountRole } from '@/types/auth';

export function AccountChoiceScreen({ onBack, onSelect }: { onBack: () => void; onSelect: (role: AccountRole) => void }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [cashierNotice, setCashierNotice] = useState(false);
  const { mockAuthEnabled, accounts, registrationPreview, selectedRole, setSelectedRole } = useAuthFlow();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F8FF' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5 pt-5">
          <AuthHeader onBack={onBack} backLabel={registrationPreview ? t('common.backToRegistration') : t('common.back')} />
          <View className="mt-12">
            <Text className="font-poppins-bold text-[22px] leading-[30px] text-[#2D6DCF]">{t('auth.choice.welcome')}</Text>
            <Text accessibilityRole="header" className="mt-3 font-poppins-bold text-brand"
              style={{ fontSize: width < 360 ? 24 : 28, lineHeight: width < 360 ? 34 : 40 }}>{t('auth.choice.title')}</Text>
            <Text className="mt-1 font-poppins text-[10px] leading-[15px] text-black">{t('auth.choice.instructions')}</Text>
          </View>
          <View className="mt-5 gap-7" style={{ alignSelf: 'stretch', flexShrink: 0 }}>
            {accountOptions.filter((option) => option.role === 'owner' || accounts.owner || accounts.cashier).map((option) => (
              <AccountRoleCard key={option.role} option={option} selected={selectedRole === option.role}
                action={option.role === 'owner' && !accounts.owner ? 'auth.choice.createOwner' : option.role === 'cashier' && !accounts.cashier ? 'auth.choice.addCashier' : undefined}
                onPress={(role) => {
                  if (role === 'cashier' && !accounts.cashier) { setCashierNotice(true); return; }
                  setCashierNotice(false);
                  setSelectedRole(role);
                  onSelect(role);
                }} />
            ))}
          </View>
          {mockAuthEnabled && <View className="mt-5"><Button variant="secondary" onPress={() => { setSelectedRole('owner'); router.navigate({ pathname: '/login', params: { role: 'owner' } }); }}>{t('auth.mock.open')}</Button></View>}
          {cashierNotice && !accounts.cashier && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="mt-5 font-poppins text-[12px] leading-[18px] text-text-secondary">{t('auth.choice.cashierUnavailable')}</Text>}
          {registrationPreview && (
            <Text accessibilityRole="alert" className="mt-5 font-poppins text-[12px] leading-[18px] text-text-secondary">{t('auth.choice.preview')}</Text>
          )}
          <View className="min-h-24 flex-1" />
          <Text className="text-center font-poppins text-[10px] leading-[15px] text-brand">{t('auth.choice.reminder')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
