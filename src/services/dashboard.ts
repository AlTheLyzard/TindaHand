import { dashboardDemo } from '@/data/dashboard';
import type { MockSale } from '@/types/pos';
import { dashboardWithSales } from '@/utils/pos-records';
import { apiFetch } from '@/services/api';

// ── Legacy sync helper (used by existing dashboard screen + cash-register service) ──────────
// TODO(BACKEND): Remove once owner-dashboard-screen.tsx is updated to call getDashboardSummary()
export function getDashboardData(sales: readonly MockSale[] = []) {
  return dashboardWithSales(dashboardDemo, sales);
}

// ── Real API functions ────────────────────────────────────────────────────────────────────

export interface TopProduct {
  productId: number;
  productName: string;
  unitsSold: number;
  revenueCentavos: number;
}

export interface DashboardSummary {
  cashOnHandCentavos: number;
  todaySalesCentavos: number;
  monthSalesCentavos: number;
  totalReceivablesCentavos: number;
  totalPayablesCentavos: number;
  topProducts: TopProduct[];
}

export interface CashMovement {
  id: number;
  amountCentavos: number;
  note: string;
  occurredAt: string;
}

/** Fetches live dashboard summary from the backend (replaces getDashboardData). */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>('/dashboard');
}

export async function getCashMovements(): Promise<CashMovement[]> {
  return apiFetch<CashMovement[]>('/dashboard/cash-movements');
}

export async function addCashMovement(amountCentavos: number, note: string): Promise<CashMovement> {
  return apiFetch<CashMovement>('/dashboard/cash-movements', {
    method: 'POST',
    body: JSON.stringify({ amountCentavos, note }),
  });
}
