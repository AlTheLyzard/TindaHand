import { dashboardDemo } from '@/data/dashboard';
import { getLocaleFormats } from '@/i18n';
import type { DemoSale, SalesPeriod } from '@/types/dashboard';

export function formatPesos(centavos: number) {
  return `₱${(centavos / 100).toLocaleString(getLocaleFormats().number, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Manila calendar periods, with one reference clock and Monday week starts. */
export function summarizeDashboard(period: SalesPeriod, data: Omit<typeof dashboardDemo, 'sales'> & { sales: readonly DemoSale[] } = dashboardDemo, cashAddedCentavos = 0) {
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
  const moneyIn = data.movements.reduce((total, movement) => total + Math.max(0, movement.amountCentavos), cashAddedCentavos);
  const moneyOut = data.movements.reduce((total, movement) => total + Math.max(0, -movement.amountCentavos), 0);
  return {
    saleCount: new Set(sales.map(sale => sale.saleId ?? sale.id)).size,
    totalSalesCentavos,
    // Only the daily comparison is supplied; do not fabricate weekly/monthly growth.
    growth: period === 'daily' && data.previousSalesCentavos > 0 ? Math.round((totalSalesCentavos / data.previousSalesCentavos - 1) * 100) : null,
    bestSellers: [...ranked.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 3),
    moneyIn, moneyOut, cashCentavos: data.openingCashCentavos + moneyIn - moneyOut,
    outOfStock: data.products.filter((product) => product.stock === 0).length,
    lowStock: data.products.filter((product) => product.stock > 0 && product.stock <= product.lowStockThreshold).length,
  };
}
