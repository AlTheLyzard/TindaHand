import { getDashboardData } from '@/services/dashboard';
import type { OwnerIdentity } from '@/types/auth';
import { createCashRegisterStore } from '@/utils/cash-register';
import { summarizeDashboard } from '@/utils/dashboard';

// TODO(BACKEND): Cash additions are session-only adjustments to a fixture balance.
// Authorize and validate a persistent cash movement with durable idempotency;
// confirm it before reporting success. See docs/backend-handoff.md#dashboard-and-cash.
export function createCashRegisterService() {
  const store = createCashRegisterStore();
  return {
    begin: () => store.begin(),
    async add(owner: OwnerIdentity | null, token: number, value: string): Promise<number | null> {
      if (!owner) return null;
      // TODO(BACKEND): Submit with durable idempotency, then refresh authoritative
      // register cash here. Propagate failures for retry; never post this as a sale.
      return store.add(token, value, summarizeDashboard('daily', getDashboardData()).cashCentavos);
    },
  };
}
