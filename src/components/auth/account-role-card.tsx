import tokens from '@/constants/design-tokens.json';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { useTranslation } from '@/i18n/use-translation';
import { StyleSheet, Text, View } from 'react-native';

import type { AccountRole, RegisteredOwner } from '@/types/auth';

export const accountOptions = [
  { role: 'owner', name: 'roles.owner', description: 'roles.ownerDescription', action: 'auth.login.ownerTitle' },
  { role: 'cashier', name: 'roles.cashier', description: 'roles.cashierDescription', action: 'auth.login.cashierTitle' },
] as const;

type Props = {
  option: (typeof accountOptions)[number];
  selected: boolean;
  action?: 'auth.choice.addCashier' | 'auth.choice.createOwner';
  account?: RegisteredOwner;
  onPress: (role: AccountRole, ownerId?: string) => void;
};

export function RoleIcon({ owner, color: suppliedColor }: { owner: boolean; color?: string }) {
  const color = suppliedColor ?? (owner ? tokens.color.surfaceCard : tokens.color.textPrimary);
  return (
    <PosIcon name={owner ? 'store' : 'scan'} size={48} color={color} />
  );
}

export function AccountRoleCard({ option, selected, onPress, action, account }: Props) {
  const { t } = useTranslation();
  const owner = option.role === 'owner';
  const color = owner ? tokens.color.surfaceCard : tokens.color.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={account
        ? `${account.name}, May-Ari ID ${account.id}, ${t(option.action)}`
        : t('auth.choice.roleAccessibility', { name: t(option.name), description: t(option.description), action: t(action ?? option.action) })}
      accessibilityHint={account ? t('auth.choice.ownerAccountHint') : t(action === 'auth.choice.addCashier' ? 'auth.choice.cashierUnavailable' : action === 'auth.choice.createOwner' ? 'auth.choice.createOwnerHint' : 'auth.choice.roleHint')}
      accessibilityState={{ selected }}
      onPress={() => onPress(option.role, account?.id)}
      // Keep styles as data: NativeWind interop merges className into style.
      // A Pressable style callback can be swallowed during that merge.
      style={[styles.card, {
        backgroundColor: owner ? tokens.color.darkNavy : tokens.color.iceContainer,
        borderColor: selected ? tokens.color.brightBlue : 'transparent',
      }]}
      className="web:focus-visible:outline web:focus-visible:outline-2 web:focus-visible:outline-offset-4 web:focus-visible:outline-action">
      <View className="flex-row items-center gap-3 px-1 pb-2">
        <RoleIcon owner={owner} />
        <View className="min-w-0 flex-1">
          <Text style={{ color }} className=" type-body-primary leading-6">{account?.name ?? t(option.name)}</Text>
          <Text style={{ color }} className=" type-helper leading-[15px]">{account ? `May-Ari ID: ${account.id}` : t(option.description)}</Text>
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: color }} className="min-h-11 flex-row items-center justify-between gap-3 pt-2">
        <Text style={{ color }} className="flex-1 type-label-nav leading-[18px]">
          {t(action ?? option.action)}{selected ? t('common.selectedSuffix') : ''}
        </Text>
        <PosIcon name="chevronRight" size={18} color={color} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', minHeight: 136, flexShrink: 0, alignSelf: 'stretch',
    paddingHorizontal: 22, paddingTop: 28, paddingBottom: 4,
    borderRadius: 11, borderWidth: 2,
  },
});
