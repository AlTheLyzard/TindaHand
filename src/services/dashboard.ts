import { dashboardDemo } from '@/data/dashboard';
import type { MockSale } from '@/types/pos';
import { dashboardWithSales } from '@/utils/pos-records';

// TODO(backend): Replace fixture projection with an authorized dashboard snapshot read.
// - Method/Action: GET / Fetch dashboard summary and activity
// - Expected Input/Payload: Authenticated store session and reporting period/timezone
// - Expected Response: Dashboard totals, cash movements, products, activity, and growth metrics
// - UI State to Wire: Refresh all derived dashboard cards from one timestamped response and expose loading/errors
export function getDashboardData(sales: readonly MockSale[] = []) {
  return dashboardWithSales(dashboardDemo, sales);
}
