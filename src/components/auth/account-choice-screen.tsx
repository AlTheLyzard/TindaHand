import { useSyncExternalStore } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AccountRoleCard, accountOptions } from './account-role-card';
import { AuthBackground } from './auth-background';
import { AuthHeader } from './auth-header';
import { useAuthFlow } from '@/state/auth-flow';
import type { AccountRole } from '@/types/auth';
import { authenticationService } from '@/services/authentication';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/use-translation';

export function AccountChoiceScreen({ onBack, onSelect, onCreateAccount }: {
  onBack: () => void;
  onSelect: (role: AccountRole) => void;
  onCreateAccount: () => void;
}) {
  const { selectedRole, setSelectedRole, selectedOwnerId, setSelectedOwnerId } = useAuthFlow();
  const { t } = useTranslation();
  const directory = useSyncExternalStore(authenticationService.subscribeAccountDirectory,
    authenticationService.getAccountDirectorySnapshot, authenticationService.getAccountDirectorySnapshot);
  const ownerOption = accountOptions[0];
  const operatorOption = accountOptions[1];
  const hasAccounts = directory.owners.length > 0 || directory.hasOperators;
  return <AuthBackground headerWave><ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5 pt-5">
      <AuthHeader onBack={onBack} />
      <Text className="mt-8 font-poppins-bold text-[22px] text-[#2D6DCF]">Welcome Back!</Text>
      <Text accessibilityRole="header" className="mt-12 font-poppins-bold text-[28px] leading-[40px] text-brand">Choose your Account</Text>
      <Text className="mt-1 font-poppins text-[10px] leading-[15px] text-black">{hasAccounts ? t('auth.choice.selectAccount') : t('auth.choice.noAccounts')}</Text>
      {hasAccounts ? <View className="mt-6 gap-7">
        {directory.owners.map(account => <AccountRoleCard key={account.id} option={ownerOption} account={account}
          selected={selectedRole === 'owner' && selectedOwnerId === account.id}
          onPress={role => { setSelectedRole(role); setSelectedOwnerId(account.id); onSelect(role); }} />)}
        {directory.hasOperators && <AccountRoleCard option={operatorOption} selected={selectedRole === 'cashier'}
          onPress={role => { setSelectedRole(role); setSelectedOwnerId(null); onSelect(role); }} />}
      </View> : <View className="mt-8 gap-3 rounded-[12px] border border-[#B8CDE6] bg-white/90 p-5">
        <Text accessibilityRole="header" className="font-poppins-bold text-[16px] leading-6 text-brand">{t('auth.choice.createFirst')}</Text>
        <Text className="font-poppins text-[12px] leading-[18px] text-text-secondary">{t('auth.choice.createFirstDescription')}</Text>
        <Button onPress={onCreateAccount} accessibilityHint={t('auth.choice.createOwnerHint')}>{t('auth.choice.createOwner')}</Button>
      </View>}
      {hasAccounts && <Text className="mt-4 text-center font-poppins text-[10px] leading-[15px] text-brand">{t('auth.choice.loginHint')}</Text>}
      <View className="min-h-24 flex-1" />
    </View>
  </ScrollView></AuthBackground>;
}
