import { Button } from '@/components/ui/button';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { demoOwner } from '@/data/mock-auth';
import { useTranslation } from '@/i18n/use-translation';
import { authenticationService } from '@/services/authentication';
import { fetchHasAccounts } from '@/services/kahera-api';
import { getHasKaheras, getHasOwner, markHasKaheras, markHasOwner } from '@/services/token-storage';
import { useAuthFlow } from '@/state/auth-flow';
import type { AccountRole } from '@/types/auth';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AccountRoleCard, accountOptions } from './account-role-card';
import { AuthBackground } from './auth-background';
import { AuthHeader } from './auth-header';

export function AccountChoiceScreen({ onBack, onSelect, onCreateAccount }: {
  onBack: () => void;
  onSelect: (role: AccountRole) => void;
  onCreateAccount: () => void;
}) {
  const { selectedRole, setSelectedRole, setSelectedOwnerId, mockAuthEnabled } = useAuthFlow();
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const directory = useSyncExternalStore(authenticationService.subscribeAccountDirectory,
    authenticationService.getAccountDirectorySnapshot, authenticationService.getAccountDirectorySnapshot);
  const ownerOption = accountOptions[0];
  const operatorOption = accountOptions[1];
  const [localHasOwner, setLocalHasOwner] = useState(false);
  const [localHasKaheras, setLocalHasKaheras] = useState(false);

  useFocusEffect(useCallback(() => {
    if (MOCK_AUTH_ENABLED) return;
    void (async () => {
      // 1. Show cached flags instantly (works offline).
      const cachedOwner = await getHasOwner();
      const cachedKaheras = await getHasKaheras();
      setLocalHasOwner(cachedOwner);
      setLocalHasKaheras(cachedKaheras);

      // 2. Ask the server (no JWT needed). If online, update the display
      //    and cache the result so it works offline next time.
      try {
        const server = await fetchHasAccounts();
        if (server.has_owners) { setLocalHasOwner(true); await markHasOwner(); }
        if (server.has_kaheras) { setLocalHasKaheras(true); await markHasKaheras(); }
      } catch {
        // Offline — cached values already shown above, nothing more to do.
      }
    })();
  }, []));

  const hasOwners = MOCK_AUTH_ENABLED ? directory.owners.length > 0 : localHasOwner;
  const hasOperators = MOCK_AUTH_ENABLED ? directory.hasOperators : localHasKaheras;
  const hasAccounts = hasOwners || hasOperators;

  return <AuthBackground headerWave><ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5 pt-5">
      <AuthHeader onBack={onBack} />
      <View className="mt-16 px-2">
        <Text accessibilityRole="header" className="type-large-metric text-brand" style={{ lineHeight: 42 * fontScale }}>Choose your Account</Text>
        <Text className="mt-2 type-helper text-black" style={{ lineHeight: 15 * fontScale }}>{hasAccounts ? t('auth.choice.selectAccount') : t('auth.choice.noAccounts')}</Text>
      </View>
      {hasAccounts ? <View className="mt-1 gap-4">
        {hasOwners && <AccountRoleCard option={ownerOption}
          selected={selectedRole === 'owner'}
          onPress={role => { setSelectedRole(role); setSelectedOwnerId(null); onSelect(role); }} />}
        {hasOperators && <AccountRoleCard option={operatorOption} selected={selectedRole === 'cashier'}
          onPress={role => { setSelectedRole(role); setSelectedOwnerId(null); onSelect(role); }} />}
      </View> : <View className="mt-8 gap-3 rounded-[12px] border border-outline bg-white/90 p-5">
        <Text accessibilityRole="header" className=" type-list-financial leading-6 text-brand">{t('auth.choice.createFirst')}</Text>
        <Text className=" type-micro-caption leading-[18px] text-text-secondary">{t('auth.choice.createFirstDescription')}</Text>
        <Button onPress={onCreateAccount} accessibilityHint={t('auth.choice.createOwnerHint')}>{t('auth.choice.createOwner')}</Button>
      </View>}
      {mockAuthEnabled && <View className="mt-5">
        <Button variant="secondary" onPress={() => {
          setSelectedRole('owner');
          setSelectedOwnerId(demoOwner.id);
          onSelect('owner');
        }}>{t('auth.mock.open')}</Button>
      </View>}
      {hasAccounts && <Text className="mt-6 text-center type-helper leading-[15px] text-brand">{t('auth.choice.loginHint')}</Text>}
      <View className="min-h-24 flex-1" />
    </View>
  </ScrollView></AuthBackground>;
}
