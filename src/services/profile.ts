import { demoProfile } from '@/data/profile';
import type { AuthResult, RegisteredOwner } from '@/types/auth';
import type { OwnerProfile, ProfileService, ProfileSnapshot } from '@/types/profile';
import { normalizeProfile, validateProfile } from '@/utils/profile';
import { DEFAULT_OWNER_AVATAR_ID } from '@/constants/profile-avatar-ids';
import { createAvatarService, type AvatarService } from '@/services/avatars';

type Context = { owner: RegisteredOwner; sessionId: string };
type Operation = 'read' | 'save' | 'email';
/** Development fake server only. All lifecycle mechanics stay behind this replaceable adapter. */
export function createMockProfileService(options: {
  enabled: boolean; context: () => Context | null; verifyPin: (ownerId: string, pin: string) => boolean;
  onIdentity: (profile: OwnerProfile) => void; emailAvailable: (email: string, ownerId: string) => boolean;
  now?: () => number; delayMs?: number; avatars?: AvatarService;
}) {
  let snapshot: ProfileSnapshot = new Map();
  const listeners = new Set<() => void>();
  const locks = new Set<string>();
  let failure: Operation | undefined;
  const now = options.now ?? Date.now;
  const enabled = __DEV__ && options.enabled;
  const avatars = options.avatars ?? createAvatarService();
  const fail = (message: string): AuthResult<never> => ({ ok: false, code: 'invalid', message });
  function put(profile: OwnerProfile) {
    snapshot = new Map(snapshot).set(profile.ownerId, Object.freeze(profile));
    listeners.forEach(listener => listener());
    return { ok: true as const, value: profile };
  }
  async function operation(kind: Operation, work: (current: OwnerProfile) => AuthResult<OwnerProfile>) {
    const context = enabled ? options.context() : null;
    if (!context) return fail('An unlocked Owner session is required.');
    if (locks.has(context.owner.id)) return fail('Another profile request is in progress. Please wait.');
    locks.add(context.owner.id);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, options.delayMs ?? 250));
      if (options.context()?.sessionId !== context.sessionId) return fail('Your session changed. Log in and try again.');
      if (failure === kind) { failure = undefined; return fail('The development service could not complete this request. Please retry.'); }
      const current = snapshot.get(context.owner.id);
      return current ? work(current) : fail('Profile unavailable. Please retry.');
    } finally { locks.delete(context.owner.id); }
  }
  const service: ProfileService = {
    avatars,
    developmentMock: enabled,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    read: () => operation('read', current => {
      if (current.pendingEmail?.status === 'pending' && current.pendingEmail.expiresAt <= now()) return put({ ...current, pendingEmail: { ...current.pendingEmail, status: 'expired' } });
      return { ok: true, value: current };
    }),
    save: ({ draft, ownerPin }) => operation('save', current => {
      // TODO(backend): Save editable profile fields after server-side Owner reauthentication.
      // - Method/Action: PATCH / Update Owner profile
      // - Expected Input/Payload: ProfileDraft and request-only Owner PIN; actor/store come from session
      // - Expected Response: Canonical OwnerProfile, avatar assignment, and pending-email state
      // - UI State to Wire: Replace the profile snapshot only after confirmation; retain draft on failure
      if (!options.verifyPin(current.ownerId, ownerPin)) return fail('The Owner PIN you entered is incorrect.');
      if (Object.keys(validateProfile(draft)).length) return fail('Check the profile fields before saving.');
      const clean = normalizeProfile(draft);
      if (!options.emailAvailable(clean.email, current.ownerId)) return fail('This email address is unavailable. Use a different address.');
      const changedEmail = clean.email !== current.email;
      const updated: OwnerProfile = {
        ...current, ...clean, email: current.email,
        pendingEmail: changedEmail
          ? current.pendingEmail?.address === clean.email ? current.pendingEmail : { address: clean.email, status: 'pending', expiresAt: now() + 900000, resendAt: now() + 30000 }
          : current.pendingEmail,
      };
      // Commit profile and avatar changes atomically; preserve the previous assignment if either fails.
      const result = avatars.replace(current.ownerId, current.ownerId, clean.avatarId!, () => {
        options.onIdentity(updated); put(updated);
      });
      return result.ok ? { ok: true, value: updated } : fail(result.message);
    }),
    email: action => operation('email', current => {
      // TODO(backend): Implement the server-owned pending-email verification lifecycle.
      // - Method/Action: POST / Resend or cancel verification; GET / Check status; Auth / Verify link
      // - Expected Input/Payload: Email action and single-use verification token; PIN is reauthentication only
      // - Expected Response: Canonical OwnerProfile with pending/verified/expired status and absolute deadlines
      // - UI State to Wire: Refresh email status and show server retry/resend timing or request errors
      const pending = current.pendingEmail;
      if (!pending) return fail('There is no pending email change.');
      if (action === 'cancel') return put({ ...current, pendingEmail: null });
      if (action === 'resend') {
        if (now() < pending.resendAt) return fail('Please wait before requesting verification again.');
        return put({ ...current, pendingEmail: { ...pending, status: 'pending', expiresAt: now() + 900000, resendAt: now() + 30000 } });
      }
      if (pending.expiresAt <= now()) {
        put({ ...current, pendingEmail: { ...pending, status: 'expired' } });
        return fail('This verification has expired. Request verification again.');
      }
      if (action === 'check') return { ok: true, value: current };
      // Deliberate development-only simulation, never a production verification mechanism.
      if (!enabled || pending.status !== 'pending') return fail('Request verification again.');
      if (!options.emailAvailable(pending.address, current.ownerId)) {
        put({ ...current, pendingEmail: { ...pending, status: 'failed' } });
        return fail('This address cannot be registered. Cancel or try another address.');
      }
      const updated = { ...current, email: pending.address, pendingEmail: null };
      options.onIdentity(updated);
      return put(updated);
    }),
  };
  return Object.assign(service, {
    initialize(owner: RegisteredOwner, email: string, demo = false) {
      // TODO(backend): Hydrate or migrate profile and avatar assignments transactionally.
      // - Method/Action: GET / Fetch Owner profile and assigned avatar
      // - Expected Input/Payload: Authenticated Owner session
      // - Expected Response: Canonical OwnerProfile and store avatar assignments
      // - UI State to Wire: Initialize snapshots from server data without persisting render-time fallbacks
      if (!enabled || snapshot.has(owner.id)) return;
      const result = avatars.initializeStore(owner.id, { id: owner.id, avatarId: DEFAULT_OWNER_AVATAR_ID });
      if (result.ok) put({ ownerId: owner.id, name: owner.name, email: email.trim().toLowerCase(), storeName: demo ? demoProfile.storeName : '', avatarId: result.value.get(owner.id)!, pendingEmail: null });
    },
    /**
     * Sync the shared profile snapshot from real API data (confirmed sessions).
     * Call this after fetching GET /settings/profile or after a successful save,
     * so the drawer and header always reflect the latest avatarId and name.
     */
    syncFromApi(profile: OwnerProfile) {
      // Always overwrite — real API data is the source of truth.
      put(profile);
      // Keep the avatar store in sync too so avatar-conflict checks stay accurate.
      avatars.initializeStore(profile.ownerId, { id: profile.ownerId, avatarId: profile.avatarId ?? DEFAULT_OWNER_AVATAR_ID });
    },
    /** Test/development failures; never rendered as normal product controls. */
    failNext(kind: Operation) { if (enabled) failure = kind; },
  });
}
