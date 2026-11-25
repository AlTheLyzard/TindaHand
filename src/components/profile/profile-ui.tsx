import tokens from '@/constants/design-tokens.json';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { resolveOwnerAvatarId } from '@/constants/profile-avatar-ids';
import { SettingsCard } from '@/components/settings/settings-ui';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonBar } from '@/components/ui/content-state';
import { useAuthFlow } from '@/state/auth-flow';
import { useProfileSnapshot } from '@/hooks/use-owner-profile';
import { ProfileAvatar } from './profile-avatar';

export { ProfileAvatar } from './profile-avatar';
export function OwnerProfileAvatar(props: ComponentProps<typeof ProfileAvatar>) {
  return <ProfileAvatar {...props} avatarId={resolveOwnerAvatarId(props.avatarId)} />;
}
export function OwnerAvatar({ size = 36 }: { size?: number }) {
  const { owner, deviceSession } = useAuthFlow();
  const profiles = useProfileSnapshot();
  if (deviceSession?.role === 'operator') {
    // Prefer the avatarId stored in the session (fetched from the real backend
    // at login time). Fall back to the mock-store record so the dev mock path
    // still works when MOCK_AUTH_ENABLED is true.
    const sessionAvatarId = deviceSession.operator.avatarId;
    return <ProfileAvatar size={size} avatarId={sessionAvatarId} />;
  }
  return <OwnerProfileAvatar size={size} avatarId={owner ? profiles.get(owner.id)?.avatarId : null} />;
}
export function ProfileText({ children, bold = false, small = false }: { children: ReactNode; bold?: boolean; small?: boolean }) {
  const textStyle = small ? 'type-label-nav leading-[18px] text-text-secondary' : bold ? 'type-list-financial leading-6 text-text-primary' : 'type-body-primary leading-6 text-text-primary';
  return <Text className={textStyle}>{children}</Text>;
}
export function ProfileSection({ children }: { children: string }) {
  return <Text accessibilityRole="header" className="mb-2 mt-3 type-label-nav leading-[18px] text-text-secondary uppercase">{children}</Text>;
}
export function ProfileNotice({ title, children }: { title: string; children: ReactNode }) {
  return <View className="gap-1 rounded-control border bg-accent-soft p-4" style={{ borderColor: tokens.color.brightBlue }}>
    <Text className="type-button-cta leading-[21px] text-brand">{title}</Text>
    <Text className="type-micro-financial-rate leading-[21px] text-text-secondary">{children}</Text>
  </View>;
}
export function ProfileReadOnlyValue({ children }: { children: ReactNode }) {
  return <View className="rounded-control border bg-accent-soft px-4 py-4" style={{ borderColor: tokens.color.brightBlue }}><ProfileText>{children}</ProfileText></View>;
}
export function AccountBadge({ status }: { status: 'Owner' | 'May-Ari' | 'Kahera' | 'active' | 'inactive' }) {
  const color = status === 'active' ? tokens.color.successBase : status === 'inactive' ? tokens.color.errorBase : tokens.color.royalBlue;
  return <View className="self-start rounded-pill px-3 py-1" style={{ backgroundColor: status === 'active' ? tokens.color.successTint : status === 'inactive' ? tokens.color.errorTint : tokens.color.softBlue }}>
    <Text className="type-label-nav leading-[18px]" style={{ color }}>{status === 'Owner' || status === 'May-Ari' ? 'May-Ari' : status === 'Kahera' ? 'Kahera' : status === 'active' ? 'Active' : 'Deactivated'}</Text>
  </View>;
}
export function ProfileError({ message, retry }: { message: string; retry?: () => void }) {
  return <View className="gap-3 py-3"><Text accessibilityRole="alert" accessibilityLiveRegion="polite" className=" type-micro-caption leading-[18px] text-error-base">{message}</Text>{retry && <Button variant="secondary" onPress={retry}>Retry</Button>}</View>;
}
export function ProfileUnavailable({ loading, error, retry }: { loading: boolean; error?: string; retry: () => void }) {
  if (loading) return <Skeleton label="Loading profile">
    <SettingsCard>
      <View className="gap-4">
        <View className="flex-row items-center gap-3">
          <View style={{ width: 60, height: 60, borderRadius: 9999, backgroundColor: tokens.color.surfaceSubtle }} />
          <View className="flex-1 gap-2"><SkeletonBar width="62%" height={20} /><SkeletonBar width="38%" height={14} /></View>
        </View>
        <View style={{ height: 1, backgroundColor: tokens.color.surfaceSubtle }} />
        <SkeletonBar width="34%" height={14} /><SkeletonBar width="58%" height={18} />
        <SkeletonBar height={48} />
      </View>
    </SettingsCard>
  </Skeleton>;
  return <SettingsCard><ProfileError message={error || 'Profile unavailable.'} retry={retry} /></SettingsCard>;
}
