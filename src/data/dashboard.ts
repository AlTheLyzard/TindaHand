import type { DashboardActivity, DemoSale } from '@/types/dashboard';

/** Fictional reference-day data, never associated with a registered store. */
export const dashboardDemo = {
  asOf: '2026-10-10T12:00:00+08:00',
  openingCashCentavos: 1010000,
  movements: [
    { id: 'demo-cash-in', amountCentavos: 320000 },
    { id: 'demo-cash-out', amountCentavos: -85000 },
  ],
  products: [
    { id: 'demo-noodles', name: 'Lucky Me! Pancit Canton (CM)', category: 'groceries', stock: 0, lowStockThreshold: 10 },
    { id: 'demo-cola', name: 'Coca-Cola 250ml', category: 'drinks', stock: 4, lowStockThreshold: 10 },
    { id: 'demo-beer', name: 'Red Horse 500ml', category: 'drinks', stock: 8, lowStockThreshold: 10 },
    { id: 'demo-rice', name: 'Rice', stock: 0, lowStockThreshold: 5 },
    { id: 'demo-soap', name: 'Soap', stock: 0, lowStockThreshold: 5 },
    { id: 'demo-coffee', name: 'Coffee', stock: 5, lowStockThreshold: 10 },
    { id: 'demo-sugar', name: 'Sugar', stock: 2, lowStockThreshold: 5 },
    { id: 'demo-milk', name: 'Milk', stock: 3, lowStockThreshold: 5 },
  ],
  sales: [
    { id: 'demo-sale-noodles', occurredAt: '2026-10-10T10:00:00+08:00', productId: 'demo-noodles', itemName: 'Lucky Me! Pancit Canton (CM)', unitPriceCentavos: 1500, quantity: 86 },
    { id: 'demo-sale-cola', occurredAt: '2026-10-10T10:15:00+08:00', productId: 'demo-cola', itemName: 'Coca-Cola 250ml', unitPriceCentavos: 5000, quantity: 84 },
    { id: 'demo-sale-beer', occurredAt: '2026-10-10T10:30:00+08:00', productId: 'demo-beer', itemName: 'Red Horse 500ml', unitPriceCentavos: 14500, quantity: 48 },
  ] satisfies DemoSale[],
  previousSalesCentavos: 1111607,
  activity: [
    { id: 'demo-activity-1', kind: 'sale', direction: 'in', occurredAt: '2026-10-10T10:42:00+08:00', amountCentavos: 9000 },
    { id: 'demo-activity-2', kind: 'sale', direction: 'in', occurredAt: '2026-10-10T09:15:00+08:00', amountCentavos: 5500 },
    { id: 'demo-activity-3', kind: 'payment', direction: 'in', occurredAt: '2026-10-10T08:30:00+08:00', amountCentavos: 25000 },
  ] satisfies DashboardActivity[],
};
