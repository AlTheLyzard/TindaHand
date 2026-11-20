import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { authenticationService } from '@/services/authentication';
import { useAuthFlow } from '@/state/auth-flow';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import type { OwnerProfile } from '@/types/profile';

export function useProfileSnapshot() {
  return useSyncExternalStore(authenticationService.profile.subscribe, authenticationService.profile.getSnapshot, authenticationService.profile.getSnapshot);
}
export function useAvatarSnapshot() {
  const service = authenticationService.profile.avatars;
  return useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);
}
export function useOwnerProfile() {
  const { owner } = useAuthFlow();
  const profiles = useProfileSnapshot();
  const profile = owner ? profiles.get(owner.id) : undefined;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; error: string } | null>(null);
  const key = `${owner?.id ?? ''}:${attempt}`;

  useEffect(() => {
    // When mock auth is off, we're using a real JWT session. The mock profile
    // service won't work (it's gated behind enabled()). Instead, build a minimal
    // profile directly from the owner identity we already have from the JWT.
    // We mark the result as ok immediately — no network call needed.
    if (!MOCK_AUTH_ENABLED) {
      setResult({ key, error: '' });
      return;
    }
    let active = true;
    // TODO(backend): Read the current Owner profile from the authenticated profile API.
    // - Method/Action: GET / Fetch Owner profile
    // - Expected Input/Payload: Authenticated Owner session
    // - Expected Response: OwnerProfile or a safe unavailable/authorization error
    // - UI State to Wire: Drive profile loading/error and reload state from the request result
    void authenticationService.profile.read().then(result => {
      if (active) setResult({ key, error: result.ok ? '' : result.message });
    }).catch(() => { if (active) setResult({ key, error: 'Profile unavailable. Please retry.' }); });
    return () => { active = false; };
  }, [key]);

  // When mock is off, synthesize a minimal profile from the JWT-sourced owner identity.
  const realProfile: OwnerProfile | undefined = !MOCK_AUTH_ENABLED && owner ? {
    ownerId: owner.id,
    name: owner.name,
    avatarId: null,
    storeName: '',
    email: '',
    pendingEmail: null,
  } : undefined;

  const resolvedProfile = MOCK_AUTH_ENABLED ? profile : realProfile;

  return { profile: resolvedProfile, loading: result?.key !== key, error: result?.key === key ? result.error : '', reload: useCallback(() => setAttempt(value => value + 1), []) };
}
