import type { PosProduct, ProductCategory } from '@/types/pos';

export const paymentQuickAmountsCentavos = [5000, 10000, 20000, 50000, 100000] as const;

export const posCategories: readonly ProductCategory[] = ['drinks', 'canned', 'snacks', 'coldCuts', 'groceries', 'household', 'personalCare'];
/** Fictional MA-POS-001 catalog. Distinct sizes/products from dashboard fixtures. */
export const posProducts: readonly PosProduct[] = [
  { id: 'demo-argentina-corned-beef', name: 'Argentina Corned Beef', category: 'canned', unitPriceCentavos: 3200, stock: 12 },
  { id: 'demo-ariel-red', name: 'Ariel Powder (Red)', category: 'household', unitPriceCentavos: 1200, stock: 3 },
  { id: 'demo-bear-brand-powder', name: 'Bear Brand Milk Powder', category: 'drinks', unitPriceCentavos: 1300, stock: 12 },
  { id: 'demo-brown-sugar', name: 'Brown Sugar', category: 'groceries', unitPriceCentavos: 2300, stock: 6 },
  { id: 'demo-cola-1-5l', name: 'Coca-Cola 1.5L', category: 'drinks', unitPriceCentavos: 7000, stock: 12 },
  { id: 'demo-cream-silk-green', name: 'Cream Silk (Green)', category: 'personalCare', unitPriceCentavos: 1500, stock: 0 },
];
