import tokens from '@/constants/design-tokens.json';
import { Image, View } from 'react-native';
import { PosIcon } from '@/components/pos/pos-icon';
import { profileAvatars } from '@/constants/profile-avatars';
import type { AvatarId } from '@/types/profile';

/** Shared portrait rendering for profile, navigation and account management. */
export function ProfileAvatar({ avatarId, size = 56, backgroundColor = tokens.color.softBlue }: { avatarId?: AvatarId | null; size?: number; backgroundColor?: string }) {
  const asset = avatarId ? profileAvatars[avatarId] : null;
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    {asset ? <Image source={asset.source} resizeMode="cover" style={{ width: size, height: size, borderRadius: size / 2 }} /> : <PosIcon name="profile" size={size * 0.62} color={tokens.color.darkNavy} />}
  </View>;
}
