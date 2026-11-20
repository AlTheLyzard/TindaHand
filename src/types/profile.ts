import type { AuthResult } from './auth';

export type AvatarId = 'avatar-01' | 'avatar-02' | 'avatar-03' | 'avatar-04' | 'avatar-05' | 'avatar-06' | 'avatar-07' | 'avatar-08' | 'avatar-09' | 'avatar-10' | 'avatar-11' | 'avatar-12';
export type ProfileDraft = { name: string; storeName: string; email: string; avatarId: AvatarId | null };
export type PendingEmail = { address: string; status: 'pending' | 'expired' | 'failed'; expiresAt: number; resendAt: number };
// TODO(backend): Verify Owner profile and pending-email fields against the profile API schema.
// - Method/Action: GET / Read profile; PATCH / Save profile or email lifecycle action
// - Expected Input/Payload: ProfileDraft and request-only Owner PIN for reauthentication
// - Expected Response: OwnerProfile with canonical identity, avatar assignment, and pendingEmail state
// - UI State to Wire: Refresh profile/avatar snapshots and retain edits when validation or requests fail
export type OwnerProfile = Readonly<ProfileDraft & { ownerId: string; pendingEmail: PendingEmail | null }>;
export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;
export type ProfileSnapshot = ReadonlyMap<string, OwnerProfile>;
/** PROPOSED adapter contract, not established HTTP endpoints. No credentials in records. */
export interface ProfileService {
  readonly avatars: Pick<import('@/services/avatars').AvatarService, 'subscribe' | 'getSnapshot'>;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ProfileSnapshot;
  read(): Promise<AuthResult<OwnerProfile>>;
  save(input: { draft: ProfileDraft; ownerPin: string }): Promise<AuthResult<OwnerProfile>>;
  email(action: 'resend' | 'cancel' | 'check' | 'simulate-verified'): Promise<AuthResult<OwnerProfile>>;
  readonly developmentMock: boolean;
}
