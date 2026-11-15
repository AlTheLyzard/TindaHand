import type { AvatarId, OwnerProfile, ProfileDraft, ProfileErrors } from '@/types/profile';
import { validateEmail } from './registration';
import { avatarPickerOrder, resolveOwnerAvatarId } from '@/constants/profile-avatar-ids';

// Proposed frontend limits. Name matches the existing account form's 120 characters.
export const PROFILE_LIMITS = { name: 120, storeName: 120, email: 254 } as const;
export const avatarIds: readonly AvatarId[] = avatarPickerOrder;
export function profileDraft(profile: OwnerProfile): ProfileDraft {
  return { name: profile.name, storeName: profile.storeName, email: profile.email, avatarId: resolveOwnerAvatarId(profile.avatarId) };
}
export function normalizeProfile(draft: ProfileDraft): ProfileDraft {
  return { name: draft.name.trim(), storeName: draft.storeName.trim(), email: draft.email.trim().toLowerCase(), avatarId: resolveOwnerAvatarId(draft.avatarId) };
}
export function profileChanged(draft: ProfileDraft, saved: ProfileDraft): boolean {
  // Raw comparison intentionally catches unsaved whitespace, too.
  return (Object.keys(saved) as (keyof ProfileDraft)[]).some(key => draft[key] !== saved[key]);
}
export function validateProfile(draft: ProfileDraft): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!draft.name.trim()) errors.name = 'Name is required. Please enter your name.';
  else if (draft.name.trim().length > PROFILE_LIMITS.name) errors.name = 'Use 120 characters or fewer.';
  if (draft.storeName.trim().length > PROFILE_LIMITS.storeName) errors.storeName = 'Use 120 characters or fewer.';
  errors.email = validateEmail(draft.email);
  if (draft.email.trim().length > PROFILE_LIMITS.email) errors.email = 'Use 254 characters or fewer.';
  if (draft.avatarId !== null && !avatarIds.includes(draft.avatarId)) errors.avatarId = 'Choose one of the supplied avatars.';
  return Object.fromEntries(Object.entries(errors).filter(([, error]) => error));
}

/** Avatar preview is isolated; Cancel returns the original draft unchanged. */
export function applyAvatar(draft: ProfileDraft, selected: AvatarId | null, apply: boolean): ProfileDraft {
  return apply ? { ...draft, avatarId: selected } : draft;
}
