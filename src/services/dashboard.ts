import { dashboardDemo } from '@/data/dashboard';
import type { MockSale } from '@/types/pos';
import { dashboardWithSales } from '@/utils/pos-records';

// TODO(BACKEND): Replace historical fixtures plus session sales with authorized
// dashboard reads using one reporting clock/window. No pagination or API runs here.
// See docs/backend-handoff.md#dashboard-and-cash and docs/api-contract.md#dashboard.
export function getDashboardData(sales: readonly MockSale[] = []) {
  return dashboardWithSales(dashboardDemo, sales);
}
