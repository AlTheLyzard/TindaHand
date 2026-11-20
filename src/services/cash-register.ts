import { getDashboardData } from '@/services/dashboard';
import type { OwnerIdentity } from '@/types/auth';
import { createCashRegisterStore } from '@/utils/cash-register';
import { summarizeDashboard } from '@/utils/dashboard';

// TODO(backend): Replace session-only cash adjustments with an authoritative register service.
// - Method/Action: GET / Fetch register balance; POST / Record cash movement
// - Expected Input/Payload: Authenticated Owner session, amount, and durable idempotency key
// - Expected Response: Confirmed movement and updated cash balance in integer centavos
// - UI State to Wire: Refresh dashboard cash from the response and map failures to retryable feedback
export function createCashRegisterService() {
  const store = createCashRegisterStore();
  return {
    begin: () => store.begin(),
    async add(owner: OwnerIdentity | null, token: number, value: string): Promise<number | null> {
      if (!owner) return null;
      return store.add(token, value, summarizeDashboard('daily', getDashboardData()).cashCentavos);
    },
  };
}
