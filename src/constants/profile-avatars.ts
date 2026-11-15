import type { ImageSourcePropType } from 'react-native';
import type { AvatarId } from '@/types/profile';

export const profileAvatars: Record<AvatarId, { source: ImageSourcePropType; label: string }> = {
  'avatar-01': { source: require('@/assets/images/profile/avatar-01.png'), label: 'Man with short hair, blue shirt' },
  'avatar-02': { source: require('@/assets/images/profile/avatar-02.png'), label: 'Woman with side-parted hair, navy shirt' },
  'avatar-03': { source: require('@/assets/images/profile/avatar-03.png'), label: 'Man with glasses, light blue shirt' },
  'avatar-04': { source: require('@/assets/images/profile/avatar-04.png'), label: 'Woman with hair in a bun' },
  'avatar-05': { source: require('@/assets/images/profile/avatar-05.png'), label: 'Older man with gray hair' },
  'avatar-06': { source: require('@/assets/images/profile/avatar-06.png'), label: 'Older woman with glasses' },
  'avatar-07': { source: require('@/assets/images/profile/avatar-07.png'), label: 'Woman with long hair, blue apron' },
  'avatar-08': { source: require('@/assets/images/profile/avatar-08.png'), label: 'Man with curly hair' },
  'avatar-09': { source: require('@/assets/images/profile/avatar-09.png'), label: 'Woman with short hair, blue shirt' },
  'avatar-10': { source: require('@/assets/images/profile/avatar-10.png'), label: 'Man with a beard, navy shirt' },
  'avatar-11': { source: require('@/assets/images/profile/avatar-11.png'), label: 'Woman with glasses, light blue shirt' },
  'avatar-12': { source: require('@/assets/images/profile/avatar-12.png'), label: 'Man with side-parted hair, blue apron' },
};
export { avatarPickerOrder } from './profile-avatar-ids';
