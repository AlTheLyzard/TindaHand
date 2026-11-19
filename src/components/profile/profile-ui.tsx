import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { resolveOwnerAvatarId } from '@/constants/profile-avatar-ids';
import { SettingsCard } from '@/components/settings/settings-ui';
import { Button } from '@/components/ui/button';
import { useAuthFlow } from '@/state/auth-flow';
import { useProfileSnapshot } from '@/hooks/use-owner-profile';
import { useSettings } from '@/state/settings';
import { ProfileAvatar } from './profile-avatar';

export { ProfileAvatar } from './profile-avatar';
export function OwnerProfileAvatar(props: ComponentProps<typeof ProfileAvatar>) {
  return <ProfileAvatar {...props} avatarId={resolveOwnerAvatarId(props.avatarId)} />;
}
export function OwnerAvatar({ size = 36 }: { size?: number }) {
  const { owner, deviceSession } = useAuthFlow();
  const profiles = useProfileSnapshot();
  const settings = useSettings();
  if (deviceSession?.role === 'operator') {
    const operator = settings.cashiers(deviceSession.ownerId).find(item => item.id === deviceSession.operatorId);
    return <ProfileAvatar size={size} avatarId={operator?.avatarId} />;
  }
  return <OwnerProfileAvatar size={size} avatarId={owner ? profiles.get(owner.id)?.avatarId : null} />;
}
export function ProfileText({ children, bold = false, small = false }: { children: ReactNode; bold?: boolean; small?: boolean }) {
  return <Text className={`${bold ? 'font-poppins-bold' : 'font-poppins'} ${small ? 'text-[12px] leading-[18px] text-text-secondary' : 'text-[14px] leading-[22px] text-[#102342]'}`}>{children}</Text>;
}
export function ProfileSection({ children }: { children: string }) {
  return <Text className="mb-3 mt-5 font-poppins-semibold text-[12px] leading-[18px] text-[#7399CC]">{children}</Text>;
}
export function ProfileNotice({ title, children }: { title: string; children: ReactNode }) {
  return <View className="gap-1 rounded-control bg-[#D1E2F8] p-4"><Text className="font-poppins-bold text-[12px] leading-[18px] text-brand">{title}</Text><ProfileText small>{children}</ProfileText></View>;
}
export function AccountBadge({ status }: { status: 'Owner' | 'May-Ari' | 'active' | 'inactive' }) {
  const color = status === 'active' ? '#28733A' : status === 'inactive' ? '#B4232C' : '#245399';
  return <View className="self-start rounded-pill px-3 py-1" style={{ backgroundColor: status === 'active' ? '#E8F5E9' : status === 'inactive' ? '#FFEBEE' : '#D1E2F8' }}>
    <Text className="font-poppins-bold text-[10px] leading-[15px]" style={{ color }}>{status === 'Owner' ? 'May-Ari' : status === 'May-Ari' ? 'May-Ari' : status === 'active' ? 'Active' : 'Inactive'}</Text>
  </View>;
}
export function ProfileError({ message, retry }: { message: string; retry?: () => void }) {
  return <View className="gap-3 py-3"><Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="font-poppins text-[12px] leading-[18px] text-[#B42318]">{message}</Text>{retry && <Button variant="secondary" onPress={retry}>Retry</Button>}</View>;
}
export function ProfileUnavailable({ loading, error, retry }: { loading: boolean; error?: string; retry: () => void }) {
  return <SettingsCard>{loading ? <Text accessibilityRole="progressbar" className="font-poppins text-brand">Loading profile…</Text> : <ProfileError message={error || 'Profile unavailable.'} retry={retry} />}</SettingsCard>;
}
