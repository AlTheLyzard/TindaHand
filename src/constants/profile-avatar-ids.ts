import type { AvatarId } from '@/types/profile';

// Shared with the local asset mapping; keep the supplied picker order stable.
export const avatarPickerOrder = ['avatar-01', 'avatar-02', 'avatar-03', 'avatar-04', 'avatar-05', 'avatar-06', 'avatar-08', 'avatar-07', 'avatar-10', 'avatar-09', 'avatar-12', 'avatar-11'] as const satisfies readonly AvatarId[];
export const DEFAULT_OWNER_AVATAR_ID = avatarPickerOrder[0];

/** Presentation/draft fallback only. Reading a legacy profile never writes it. */
export function resolveOwnerAvatarId(avatarId: AvatarId | null | undefined): AvatarId {
  return avatarId ?? DEFAULT_OWNER_AVATAR_ID;
}
