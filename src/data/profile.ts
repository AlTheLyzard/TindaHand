import type { ProfileDraft } from '@/types/profile';
import { DEFAULT_OWNER_AVATAR_ID } from '@/constants/profile-avatar-ids';

/** Fictional store details used only by the explicitly enabled development adapter. */
// TODO(backend): Replace the demo profile with the authenticated Owner profile response.
// - Method/Action: GET / Fetch Owner profile
// - Expected Input/Payload: None (authenticated Owner session)
// - Expected Response: OwnerProfile with ownerId, name, storeName, email, avatarId, and pendingEmail
// - UI State to Wire: Populate profile screens and avatar assignment state from the response
export const demoProfile: Omit<ProfileDraft, 'name' | 'email'> = { storeName: 'Demo Sari-Sari Store', avatarId: DEFAULT_OWNER_AVATAR_ID };
