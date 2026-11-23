import { dashboardDemo } from '@/data/dashboard';
import { getLocaleFormats } from '@/i18n';
import type { DashboardActivity, DemoSale, SalesPeriod } from '@/types/dashboard';
import type { LocalSale } from '@/types/pos';
import type { QuickAddRecord } from '@/types/quick-add';
import type { ReceivablePayment } from '@/types/receivables';

/** Copy before sorting: the full history and its source order remain untouched. */
export function recentDashboardActivity(activity: readonly DashboardActivity[]) {
  return [...activity].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt)).slice(0, 3);
}

export function quickAddDashboardActivity(records: readonly QuickAddRecord[]): DashboardActivity[] {
  return records.filter(record => !record.saleId).map(record => ({
    id: record.id, kind: record.kind, occurredAt: record.occurredAt,
    amountCentavos: record.originalAmountCentavos ?? record.amountCentavos,
    // Recording credit principal is not a receipt. Cash lent and expenses leave the store.
    direction: record.kind === 'expense' || (record.kind === 'customerDebt' && record.borrowing === 'cash') ? 'out' : 'neutral',
    label: `${record.kind === 'customerDebt' ? 'Customer debt' : record.kind === 'storeDebt' ? 'Store debt' : 'Expense'} · ${record.name}`,
  }));
}

export function formatActivityAmount(activity: DashboardActivity) {
  return `${activity.amountCentavos === 0 || activity.direction === 'neutral' ? '' : activity.direction === 'in' ? '+' : '−'}${formatPesos(Math.abs(activity.amountCentavos))}`;
}

export function formatPesos(centavos: number) {
  return `₱${(centavos / 100).toLocaleString(getLocaleFormats().number, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Derive best sellers from real POS sales only — no demo data.
 * Ranked by total quantity sold across all time (not period-filtered,
 * so the ranking reflects the full history the user has built up).
 */
export function bestSellersFromSales(sales: readonly LocalSale[]): { id: string; name: string; quantity: number }[] {
  const ranked = new Map<string, { id: string; name: string; quantity: number }>();
  for (const sale of sales) {
    for (const line of Object.values(sale.items)) {
      const existing = ranked.get(line.productId);
      ranked.set(line.productId, {
        id: line.productId,
        name: line.itemName,
        quantity: (existing?.quantity ?? 0) + line.quantity,
      });
    }
  }
  return [...ranked.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 3);
}

/** Manila calendar periods, with one reference clock and Monday week starts. */
export function summarizeDashboard(
  period: SalesPeriod,
  data: Omit<typeof dashboardDemo, 'sales' | 'activity'> & { sales: readonly DemoSale[]; activity: readonly DashboardActivity[] } = dashboardDemo,
  cashAddedCentavos = 0,
  quickAddRecords: readonly QuickAddRecord[] = [],
  _payablePaymentsCentavos = 0, // kept for backward-compat; no longer deducted (not an expense)
  localSales: readonly LocalSale[] = [],
  receivablePayments: readonly ReceivablePayment[] = [],
) {
  const end = new Date(data.asOf);
  const start = new Date(end.getTime() + 8 * 60 * 60 * 1000);
  start.setUTCHours(0, 0, 0, 0);
  if (period === 'weekly') start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  if (period === 'monthly') start.setUTCDate(1);
  start.setUTCHours(-8);
  const sales = data.sales.filter((sale) => new Date(sale.occurredAt) >= start && new Date(sale.occurredAt) <= end);
  const totalSalesCentavos = sales.reduce((total, sale) => total + sale.quantity * sale.unitPriceCentavos, 0);
  const ranked = new Map<string, { id: string; name: string; quantity: number }>();
  for (const sale of sales) {
    const existing = ranked.get(sale.productId);
    ranked.set(sale.productId, { id: sale.productId, name: sale.itemName, quantity: (existing?.quantity ?? 0) + sale.quantity });
  }

  // Cash received from real POS sales (tenders paid, minus change given back).
  const posCashInCentavos = localSales.reduce((sum, sale) => {
    const tendered = sale.payment.tenders.reduce((t, tender) => t + tender.receivedCentavos, 0);
    return sum + tendered - sale.payment.cashChangeCentavos;
  }, 0);

  // Cash received from customer debt repayments.
  const receivableCashInCentavos = receivablePayments.reduce((sum, p) => sum + p.amountCentavos, 0);

  const baseMoneyIn = data.movements.reduce((total, movement) => total + Math.max(0, movement.amountCentavos), cashAddedCentavos);
  const moneyIn = baseMoneyIn + posCashInCentavos + receivableCashInCentavos;
  const moneyOut = data.movements.reduce((total, movement) => total + Math.max(0, -movement.amountCentavos), 0);

  // Only expenses reduce Pera sa Kaha (cash lent to customers is tracked as receivables, not cash out).
  const expenseOutCentavos = quickAddRecords
    .filter(r => r.kind === 'expense')
    .reduce((sum, r) => sum + r.amountCentavos, 0);
  const totalCashOut = moneyOut + expenseOutCentavos;

  return {
    saleCount: new Set(sales.map(sale => sale.saleId ?? sale.id)).size,
    totalSalesCentavos,
    // Only the daily comparison is supplied; do not fabricate weekly/monthly growth.
    growth: period === 'daily' && data.previousSalesCentavos > 0 ? Math.round((totalSalesCentavos / data.previousSalesCentavos - 1) * 100) : null,
    bestSellers: [...ranked.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 3),
    moneyIn, moneyOut: totalCashOut, cashCentavos: data.openingCashCentavos + moneyIn - totalCashOut,
    outOfStock: data.products.filter((product) => product.stock === 0).length,
    lowStock: data.products.filter((product) => product.stock > 0 && product.stock <= product.lowStockThreshold).length,
  };
}
