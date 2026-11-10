/** Frontend fixtures only; these are not backend response contracts. */
export type SalesPeriod = 'daily' | 'weekly' | 'monthly';
/** Internal chart input. A future adapter must validate/map the agreed API schema. */
export type GrowthMetrics = {
  source: 'demo' | 'backend';
  reportingPeriod: SalesPeriod;
  metric: 'sales';
  unit: 'centavos';
  percentageChange: number | null;
  /** Ordered ISO timestamps with finite metric values in integer centavos. */
  points: readonly { timestamp: string; metricValue: number }[];
};
export type DemoSale = {
  id: string;
  saleId?: string;
  occurredAt: string;
  productId: string;
  itemName: string;
  unitPriceCentavos: number;
  quantity: number;
};
export type DashboardActivity = {
  id: string;
  kind: 'sale' | 'payment' | 'customerDebt' | 'storeDebt' | 'expense';
  label?: string;
  occurredAt: string;
  amountCentavos: number;
  /** Direction of the recorded money movement; debt principal can be neutral. */
  direction: 'in' | 'out' | 'neutral';
};
