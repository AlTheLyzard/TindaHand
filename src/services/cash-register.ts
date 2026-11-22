import { addCashMovement, getDashboardData } from '@/services/dashboard';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import type { OwnerIdentity } from '@/types/auth';
import { createCashRegisterStore } from '@/utils/cash-register';
import { parsePaymentAmount } from '@/utils/pos-payment';
import { summarizeDashboard } from '@/utils/dashboard';

export function createCashRegisterService() {
  const store = createCashRegisterStore();
  return {
    begin: () => store.begin(),
    async add(owner: OwnerIdentity | null, token: number, value: string): Promise<number | null> {
      if (!owner) return null;
      if (!MOCK_AUTH_ENABLED && owner.mode === 'confirmed') {
        // Real path: POST to backend, return a non-null sentinel so the caller
        // knows it succeeded. The dashboard screen re-fetches the live totals.
        const centavos = parsePaymentAmount(value);
        if (centavos === null || centavos <= 0) return null;
        await addCashMovement(centavos, 'Cash added');
        return centavos;
      }
      return store.add(token, value, summarizeDashboard('daily', getDashboardData()).cashCentavos);
    },
  };
}
