import type { MockSale } from '@/types/pos';
import type { dashboardDemo } from '@/data/dashboard';
import type { DashboardActivity } from '@/types/dashboard';

export function saleLines(sales: readonly MockSale[]) {
  return sales.flatMap(sale => Object.values(sale.items).map(line => ({ ...line, saleId: sale.id, id: `${sale.id}:${line.productId}`, occurredAt: sale.occurredAt })));
}

/** Each sale contributes once; its linked debt is not a second sale or cash receipt. */
export function dashboardWithSales(data: typeof dashboardDemo, sales: readonly MockSale[]) {
  if (!sales.length) return data;
  const asOf = sales.reduce((latest, sale) => Date.parse(sale.occurredAt) > Date.parse(latest) ? sale.occurredAt : latest, data.asOf);
  return { ...data, asOf, previousSalesCentavos: 0,
    sales: [...saleLines(sales), ...data.sales],
    movements: [...data.movements, ...sales.map(sale => ({ id: `cash-${sale.id}`, amountCentavos:
      sale.payment.tenders.filter(tender => tender.method === 'cash').reduce((sum, tender) => sum + tender.receivedCentavos, 0) - sale.payment.cashChangeCentavos }))],
    activity: [...sales.map((sale): DashboardActivity => ({ id: sale.id, kind: 'sale', direction: sale.payment.appliedCentavos > 0 ? 'in' : 'neutral', label: `POS sale · ${sale.payment.method === 'partial' ? 'Partial Payment' : sale.payment.method === 'split' ? 'Split Payment' : sale.payment.method === 'gcash' ? 'GCash' : 'Cash'}`, occurredAt: sale.occurredAt, amountCentavos: sale.payment.appliedCentavos })), ...data.activity],
  };
}
