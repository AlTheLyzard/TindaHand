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
      // BACKEND TODO: Derive actor/store from the authenticated session, reauthenticate
      // the Owner server-side with throttling, validate fields and immutable Owner ID.
      // Request is editable fields + request-only PIN; return canonical profile/pending email.
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
      // BACKEND TODO: Persist atomically and audit actor/account changes without PINs.
      // Recheck at commit, after the async boundary. A failed replacement keeps
      // the previous assignment reserved and leaves the caller's draft intact.
      const result = avatars.replace(current.ownerId, current.ownerId, clean.avatarId!, () => {
        options.onIdentity(updated); put(updated);
      });
      return result.ok ? { ok: true, value: updated } : fail(result.message);
    }),
    email: action => operation('email', current => {
      // BACKEND TODO: Implement server-owned pending-email lifecycle, single-use expiring
      // links, delivery/resend limits, cancellation and atomic verified-email replacement.
      // A current PIN is reauthentication only; it never proves new-email ownership.
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
      // BACKEND TODO: Hydrate/migrate account avatar assignments transactionally
      // at the service boundary, never by persisting a fallback during rendering.
      if (!enabled || snapshot.has(owner.id)) return;
      const result = avatars.initializeStore(owner.id, { id: owner.id, avatarId: DEFAULT_OWNER_AVATAR_ID });
      if (result.ok) put({ ownerId: owner.id, name: owner.name, email: email.trim().toLowerCase(), storeName: demo ? demoProfile.storeName : '', avatarId: result.value.get(owner.id)!, pendingEmail: null });
    },
    /** Test/development failures; never rendered as normal product controls. */
    failNext(kind: Operation) { if (enabled) failure = kind; },
  });
}
