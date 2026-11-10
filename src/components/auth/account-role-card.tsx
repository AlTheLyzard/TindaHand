import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { useTranslation } from '@/i18n/use-translation';
import { StyleSheet, Text, View } from 'react-native';

import type { AccountRole } from '@/types/auth';

export const accountOptions = [
  { role: 'owner', name: 'roles.owner', description: 'roles.ownerDescription', action: 'auth.login.ownerTitle' },
  { role: 'cashier', name: 'roles.cashier', description: 'roles.cashierDescription', action: 'auth.login.cashierTitle' },
] as const;

type Props = {
  option: (typeof accountOptions)[number];
  selected: boolean;
  action?: 'auth.choice.addCashier' | 'auth.choice.createOwner';
  onPress: (role: AccountRole) => void;
};

export function RoleIcon({ owner, color: suppliedColor }: { owner: boolean; color?: string }) {
  const color = suppliedColor ?? (owner ? '#FFFFFF' : '#101820');
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ width: 48, height: 48 }}>
      {owner ? (
        <View style={[styles.shop, { borderColor: color }]}>
          <View style={styles.awning}>
            {[0, 1, 2].map((index) => <View key={index} style={[styles.scallop, { borderColor: color }]} />)}
          </View>
          <View style={[styles.door, { borderColor: color }]} />
        </View>
      ) : (
        <>
          {[0, 1, 2, 3].map((corner) => (
            <View key={corner} style={[styles.corner, {
              borderColor: color, top: corner < 2 ? 1 : undefined, bottom: corner >= 2 ? 1 : undefined,
              left: corner % 2 === 0 ? 1 : undefined, right: corner % 2 === 1 ? 1 : undefined,
              transform: [{ rotate: `${[0, 90, 270, 180][corner]}deg` }],
            }]} />
          ))}
          <View style={[styles.horizontal, { backgroundColor: color }]} />
          <View style={[styles.vertical, { backgroundColor: color }]} />
        </>
      )}
    </View>
  );
}

export function AccountRoleCard({ option, selected, onPress, action }: Props) {
  const { t } = useTranslation();
  const owner = option.role === 'owner';
  const color = owner ? '#FFFFFF' : '#102342';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('auth.choice.roleAccessibility', { name: t(option.name), description: t(option.description), action: t(action ?? option.action) })}
      accessibilityHint={t(action === 'auth.choice.addCashier' ? 'auth.choice.cashierUnavailable' : action === 'auth.choice.createOwner' ? 'auth.choice.createOwnerHint' : 'auth.choice.roleHint')}
      accessibilityState={{ selected }}
      onPress={() => onPress(option.role)}
      // Keep styles as data: NativeWind interop merges className into style.
      // A Pressable style callback can be swallowed during that merge.
      style={[styles.card, {
        backgroundColor: owner ? '#153370' : '#D9E7F5',
        borderColor: selected ? '#2675DB' : 'transparent',
      }]}
      className="web:focus-visible:outline web:focus-visible:outline-2 web:focus-visible:outline-offset-4 web:focus-visible:outline-action">
      <View className="flex-row items-center gap-6 px-1 pb-4">
        <RoleIcon owner={owner} />
        <View className="min-w-0 flex-1">
          <Text style={{ color }} className="font-poppins text-[16px] leading-6">{t(option.name)}</Text>
          <Text style={{ color }} className="font-poppins text-[10px] leading-[15px]">{t(option.description)}</Text>
        </View>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: color }} className="min-h-12 flex-row items-center justify-between gap-3 pt-2">
        <Text style={{ color }} className="flex-1 font-poppins-bold text-[12px] leading-[18px]">
          {t(action ?? option.action)}{selected ? t('common.selectedSuffix') : ''}
        </Text>
        <Text accessible={false} style={{ color }} className="text-[28px] leading-8">›</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', minHeight: 148, flexShrink: 0, alignSelf: 'stretch',
    paddingHorizontal: 22, paddingTop: 28, paddingBottom: 4,
    borderRadius: 11, borderWidth: 2, boxShadow: '0 4px 3px rgba(0, 0, 0, 0.28)',
  },
  shop: { width: 46, height: 47, borderWidth: 2.5, borderRadius: 6, alignItems: 'center' },
  awning: { position: 'absolute', top: 8, left: 0, right: 0, flexDirection: 'row' },
  scallop: { flex: 1, height: 10, borderWidth: 2.5, borderTopWidth: 0, borderBottomLeftRadius: 7, borderBottomRightRadius: 7 },
  door: { position: 'absolute', bottom: 0, width: 17, height: 18, borderWidth: 2.5, borderBottomWidth: 0, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  corner: { position: 'absolute', width: 14, height: 14, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 6 },
  horizontal: { position: 'absolute', left: 11, top: 22.75, width: 26, height: 2.5 },
  vertical: { position: 'absolute', left: 22.75, top: 11, width: 2.5, height: 26 },
});
