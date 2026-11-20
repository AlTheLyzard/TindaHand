import type { AvatarId, ProfileDraft } from '@/types/profile';
import { applyAvatar } from './profile';
import { resolveOwnerAvatarId } from '@/constants/profile-avatar-ids';

export type ProfileEditorState = { saved: ProfileDraft; draft: ProfileDraft; phase: 'edit' | 'avatar' | 'verify'; preview: AvatarId | null };
export type ProfileEditorAction =
  | { type: 'field'; field: keyof ProfileDraft; value: string }
  | { type: 'pick' }
  | { type: 'preview'; avatarId: AvatarId }
  | { type: 'apply-avatar'; avatarId?: AvatarId }
  | { type: 'cancel-step' }
  | { type: 'verify' }
  | { type: 'discard' };
export function createProfileEditor(saved: ProfileDraft): ProfileEditorState {
  const initial = { ...saved, avatarId: resolveOwnerAvatarId(saved.avatarId) };
  return { saved: { ...initial }, draft: { ...initial }, phase: 'edit', preview: initial.avatarId };
}
export function profileEditor(state: ProfileEditorState, action: ProfileEditorAction): ProfileEditorState {
  switch (action.type) {
    case 'field': return { ...state, draft: { ...state.draft, [action.field]: action.value } };
    case 'pick': return { ...state, phase: 'avatar', preview: state.draft.avatarId };
    case 'preview': return { ...state, preview: action.avatarId };
    case 'apply-avatar': {
      const avatarId = action.avatarId ?? state.preview;
      return { ...state, phase: 'edit', preview: avatarId, draft: applyAvatar(state.draft, avatarId, true) };
    }
    case 'cancel-step': return { ...state, phase: 'edit', preview: state.draft.avatarId };
    case 'verify': return { ...state, phase: 'verify' };
    case 'discard': return createProfileEditor(state.saved);
  }
}
