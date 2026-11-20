import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { authenticationService } from '@/services/authentication';
import { useAuthFlow } from '@/state/auth-flow';

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
  return { profile, loading: result?.key !== key, error: result?.key === key ? result.error : '', reload: useCallback(() => setAttempt(value => value + 1), []) };
}
