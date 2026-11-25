import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { useAuthFlow } from '@/state/auth-flow';
import type { OwnerIdentity } from '@/types/auth';
import { hasCapability } from '@/utils/operator-access';

// TODO(backend): Keep Kahera Receivables reads and writes on the same owner-scoped ledger so changes reflect for the May-Ari.
/** Returns the active store identity for shared owner/operator store flows. */
export function useStoreOwner(): OwnerIdentity | null {
  const { owner, deviceSession } = useAuthFlow();
  if (owner) return owner;
  if (deviceSession?.role !== 'operator' || !hasCapability(deviceSession, 'receivables')) return null;
  return { ...deviceSession.owner, mode: MOCK_AUTH_ENABLED ? 'mock' : 'confirmed' };
}
