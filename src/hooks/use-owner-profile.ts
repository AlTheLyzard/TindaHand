import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from 'expo-router';
import { authenticationService } from '@/services/authentication';
import { useAuthFlow } from '@/state/auth-flow';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { getOwnerProfile } from '@/services/settings';
import type { AvatarId, OwnerProfile } from '@/types/profile';

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

  // Real profile fetched from the backend (confirmed sessions only).
  const [realProfile, setRealProfile] = useState<OwnerProfile | undefined>(undefined);

  useEffect(() => {
    if (!MOCK_AUTH_ENABLED) {
      // Real path — fetch owner profile from GET /settings/profile.
      if (!owner) return;
      let active = true;
      getOwnerProfile()
        .then(data => {
          if (!active) return;
          setRealProfile({
            ownerId: owner.id,
            name: data.name,
            avatarId: (data.avatarId as AvatarId | null) ?? null,
            storeName: data.storeName ?? '',
            email: data.email ?? '',
            pendingEmail: null,
          });
          setResult({ key, error: '' });
        })
        .catch(() => {
          if (active) setResult({ key, error: 'Profile unavailable. Please retry.' });
        });
      return () => { active = false; };
    }
    let active = true;
    void authenticationService.profile.read().then(result => {
      if (active) setResult({ key, error: result.ok ? '' : result.message });
    }).catch(() => { if (active) setResult({ key, error: 'Profile unavailable. Please retry.' }); });
    return () => { active = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch profile when the screen comes back into focus (e.g. after editing).
  // Only for real sessions — mock sessions read from an in-memory store already.
  useFocusEffect(
    useCallback(() => {
      if (!MOCK_AUTH_ENABLED) setAttempt(value => value + 1);
    }, []),
  );

  const resolvedProfile = MOCK_AUTH_ENABLED ? profile : realProfile;

  return { profile: resolvedProfile, loading: result?.key !== key, error: result?.key === key ? result.error : '', reload: useCallback(() => setAttempt(value => value + 1), []) };
}
