import { dashboardDemo } from "@/data/dashboard";
import { apiFetch } from "@/services/api";
import type { LocalSale } from "@/types/pos";
import { dashboardWithSales } from "@/utils/pos-records";

// ── Legacy sync helper (used by existing dashboard screen + cash-register service) ──────────
// TODO(BACKEND): Remove once owner-dashboard-screen.tsx is updated to call getDashboardSummary()
export function getDashboardData(sales: readonly LocalSale[] = []) {
  return dashboardWithSales(dashboardDemo, sales);
}

// ── Real API functions ────────────────────────────────────────────────────────────────────

export interface TopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenueCentavos: number;
}

export interface DashboardSummary {
  cashBalanceCentavos: number;
  totalSalesTodayCentavos: number;
  totalSalesThisWeekCentavos: number;
  totalSalesThisMonthCentavos: number;
  totalSalesCentavos: number;
  totalReceivablesCentavos: number;
  totalPayablesCentavos: number;
  totalMoneyOutCentavos: number;
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
  return apiFetch<DashboardSummary>("/dashboard");
}

export async function getCashMovements(): Promise<CashMovement[]> {
  return apiFetch<CashMovement[]>("/dashboard/cash-movements");
}

export async function addCashMovement(
  amountCentavos: number,
  note: string,
): Promise<CashMovement> {
  return apiFetch<CashMovement>("/dashboard/cash-movements", {
    method: "POST",
    body: JSON.stringify({ amountCentavos, note, occurredAt: new Date().toISOString() }),
  });
}
