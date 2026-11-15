import type { ProfileDraft } from '@/types/profile';
import { DEFAULT_OWNER_AVATAR_ID } from '@/constants/profile-avatar-ids';

/** Fictional store details used only by the explicitly enabled development adapter. */
export const demoProfile: Omit<ProfileDraft, 'name' | 'email'> = { storeName: 'Demo Sari-Sari Store', avatarId: DEFAULT_OWNER_AVATAR_ID };
