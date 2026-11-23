import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { PosIcon } from '@/components/pos/pos-icon';
import { SettingsIcon } from './settings-icon';
import type { Cashier } from '@/types/settings';
import type { OwnerIdentity } from '@/types/auth';
import tokens from '@/constants/design-tokens.json';
import { RoleIcon } from '@/components/auth/account-role-card';
import { ProfileAvatar } from '@/components/profile/profile-avatar';
import { useProfileSnapshot } from '@/hooks/use-owner-profile';
import { resolveOwnerAvatarId } from '@/constants/profile-avatar-ids';

export function SettingsDescription({ children }: { children: ReactNode }) {
  return <Text className="mb-5 type-micro-financial-rate leading-[22px] text-text-secondary">{children}</Text>;
}
export function SettingsSection({ children }: { children: string }) {
  return <Text className="mb-4 mt-1 type-label-nav leading-[18px] text-text-secondary">{children}</Text>;
}
export function SettingsCard({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <View className={`rounded-control border bg-white ${compact ? 'p-3' : 'p-4'}`} style={{ borderColor: tokens.color.borderOutline }}>{children}</View>;
}
export function SettingsRow({ title, description, icon, onPress, inCard = false, compact = false }: {
  title: string; description: string; icon: ComponentProps<typeof SettingsIcon>['name']; onPress: () => void;
  inCard?: boolean; compact?: boolean;
}) {
  const cardClassName = compact
    ? 'min-h-12 flex-row items-center gap-2 rounded-control bg-white py-1 active:bg-ice-container'
    : 'min-h-[80px] flex-row items-center gap-3 rounded-control bg-white py-4 active:bg-ice-container';
  return <Pressable accessibilityRole="button" onPress={onPress}
    className={inCard ? cardClassName : 'mb-3 min-h-[80px] flex-row items-center gap-3 rounded-control border bg-white px-4 py-4 active:bg-ice-container'} style={{ borderColor: tokens.color.borderOutline }}>
    <View className="h-12 w-12 items-center justify-center rounded-control bg-canvas"><SettingsIcon name={icon} /></View>
    <View className="min-w-0 flex-1 gap-1">
      <Text className=" type-button-cta leading-[21px] text-text-primary">{title}</Text>
      <Text className=" type-micro-caption leading-[18px] text-text-secondary">{description}</Text>
    </View>
    <PosIcon name="chevronRight" color={tokens.color.darkNavy} size={20} />
  </Pressable>;
}
export function SettingsNotice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="my-3 type-micro-caption leading-[18px]" style={{ color: error ? tokens.color.errorBase : tokens.color.successBase }}>{children}</Text>;
}
export function OwnerStoreCard({ owner, compact = false }: { owner: OwnerIdentity; compact?: boolean }) {
  return <View className="mb-8 flex-row items-center gap-3 rounded-control border border-outline bg-text-disabled p-5">
    <RoleIcon owner color={tokens.color.successBase} />
    <View className="min-w-0 flex-1 gap-1">
      <Text className=" type-label-nav leading-[18px] text-text-primary">{owner.name}</Text>
      <Text className=" type-title-accent leading-[33px] text-success-base">{owner.id}</Text>
      {!compact && <Text className=" type-micro-caption leading-4 text-text-secondary">Associated Owner / Store ID</Text>}
    </View>
  </View>;
}
/** Owner identity used above PIN forms and inside Security & Access. */
export function OwnerSettingsIdentity({ owner }: { owner: OwnerIdentity }) {
  const profiles = useProfileSnapshot();
  const profile = profiles.get(owner.id);
  return <View>
    <View className="flex-row items-center gap-3">
      <ProfileAvatar avatarId={resolveOwnerAvatarId(profile?.avatarId)} size={52} />
      <Text className="min-w-0 flex-1 type-h3-heading leading-[27px] text-brand">{profile?.name || owner.name}</Text>
      <View className="rounded-control bg-soft-blue px-3 py-2">
        <Text className="type-label-nav leading-[18px] text-brand">May-Ari</Text>
      </View>
    </View>
    <View className="mt-5 gap-1">
      <Text className="type-micro-caption leading-[18px] text-text-secondary">May-Ari ID</Text>
      <Text className="type-h3-heading leading-[27px] text-text-primary">{owner.id}</Text>
    </View>
  </View>;
}
export function OwnerSettingsIdentityCard({ owner }: { owner: OwnerIdentity }) {
  return <SettingsCard><OwnerSettingsIdentity owner={owner} /></SettingsCard>;
}
/** Kahera identity used in PIN management and reset flows. */
export function KaheraSettingsIdentityCard({ cashier }: { cashier: Cashier }) {
  return <SettingsCard>
    <View className="flex-row items-center gap-3">
      <ProfileAvatar avatarId={cashier.avatarId} size={52} />
      <Text className="min-w-0 flex-1 type-h3-heading leading-[27px] text-brand">{cashier.name}</Text>
      <View className="rounded-pill px-3 py-2" style={{ backgroundColor: cashier.status === 'active' ? tokens.color.successTint : tokens.color.errorTint }}>
        <Text className="type-label-nav leading-[18px]" style={{ color: cashier.status === 'active' ? tokens.color.successBase : tokens.color.errorBase }}>
          {cashier.status === 'active' ? 'Active' : 'Deactivated'}
        </Text>
      </View>
    </View>
    <View className="mt-5 gap-1">
      <Text className="type-micro-caption leading-[18px] text-text-secondary">Linked Owner ID</Text>
      <Text className="type-h3-heading leading-[27px] text-text-primary">{cashier.ownerId}</Text>
    </View>
  </SettingsCard>;
}
export function CashierIdentity({ cashier }: { cashier: Cashier }) {
  return <View className="flex-row flex-wrap items-center gap-3">
    <ProfileAvatar avatarId={cashier.avatarId} size={36} />
    <View className="min-w-[120px] flex-1 gap-1">
      <Text className=" type-button-cta leading-[21px] text-text-primary">{cashier.name}</Text>
      <Text className=" type-micro-caption leading-[18px] text-text-secondary">{cashier.id}</Text>
    </View>
    <View className="rounded-control border px-3 py-1" style={{ borderColor: cashier.status === 'active' ? tokens.color.successBase : tokens.color.errorBase, backgroundColor: cashier.status === 'active' ? tokens.color.successTint : tokens.color.errorTint }}>
      <Text className=" type-helper leading-[15px]" style={{ color: cashier.status === 'active' ? tokens.color.successBase : tokens.color.errorBase }}>{cashier.status === 'active' ? 'Active' : 'Inactive'}</Text>
    </View>
  </View>;
}
