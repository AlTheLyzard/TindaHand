/**
 * Returns the Kahera list for the current owner.
 * - Mock auth on: reads from the local mock settings service (in-memory).
 * - Mock auth off: fetches from GET /auth/kahera/list, re-fetches on focus.
 */
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { listKaheras } from '@/services/kahera-api';
import { useSettings } from '@/state/settings';
import { useAuthFlow } from '@/state/auth-flow';
import type { Cashier } from '@/types/settings';
import type { AvatarId } from '@/types/profile';

function toAvatarId(raw: string | null | undefined): AvatarId {
  return (raw ?? 'avatar-01') as AvatarId;
}

export function useKaheraList(): { cashiers: Cashier[]; loading: boolean; reload: () => void } {
  const { owner } = useAuthFlow();
  const mockService = useSettings();

  const [realCashiers, setRealCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(!MOCK_AUTH_ENABLED);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Real path only — skip when mock is on.
    if (MOCK_AUTH_ENABLED || !owner) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    listKaheras().then(records => {
      if (!active) return;
      setRealCashiers(records.map(r => ({
        id: r.id,
        ownerId: r.ownerId,
        name: r.name,
        status: r.status,
        avatarId: toAvatarId(r.avatarId),
      })));
      setLoading(false);
    });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner?.id, tick]);

  // Re-fetch when screen regains focus so newly created Kaheras appear immediately.
  useFocusEffect(useCallback(() => {
    if (!MOCK_AUTH_ENABLED) setTick(t => t + 1);
  }, []));

  const reload = useCallback(() => setTick(t => t + 1), []);

  if (MOCK_AUTH_ENABLED) {
    const cashiers = owner ? mockService.cashiers(owner.id) : [];
    return { cashiers, loading: false, reload: () => {} };
  }

  return { cashiers: realCashiers, loading, reload };
}
