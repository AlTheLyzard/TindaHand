import { posProducts } from './pos';
import type { BusinessAsset, InventoryProduct } from '../types/inventory';

/** Existing POS catalog is retained and enriched, never copied into editable seeds. */
// TODO(backend): Replace demo products with the authenticated store inventory.
// - Method/Action: GET / Fetch inventory products
// - Expected Input/Payload: None (authenticated store session and applied filters)
// - Expected Response: InventoryProduct[] including stable IDs, centavo prices/costs, batches, and expiry dates
// - UI State to Wire: Replace product fixtures and refresh lists, stock totals, and POS availability
export const inventoryProducts: readonly InventoryProduct[] = [
  { id: 'demo-delata', name: 'Delata Premium Rice', category: 'canned', unitPriceCentavos: 2500, costCentavos: 1800, stock: 12, expirationDate: '2027-02-05' },
  { id: 'demo-sunsilk', name: 'Sunsilk', category: 'personalCare', unitPriceCentavos: 2000, costCentavos: 1600, stock: 3, expirationDate: '2027-03-11' },
  { id: 'demo-dinorado', name: 'Dinorado Rice 5kg', category: 'groceries', unitPriceCentavos: 18500, costCentavos: 17700, stock: 0, expirationDate: '2027-07-30' },
  { id: 'demo-c2', name: 'C2 Solo', category: 'drinks', unitPriceCentavos: 1700, costCentavos: 1200, stock: 8, expirationDate: '2027-07-17' },
  { id: 'demo-charmee', name: 'Charmee', category: 'personalCare', unitPriceCentavos: 1200, costCentavos: 900, stock: 2, expirationDate: '2028-01-01' },
  { id: 'demo-zonrox', name: 'Zonrox', category: 'household', unitPriceCentavos: 3500, costCentavos: 2800, stock: 14, expirationDate: '2027-01-01' },
  { id: 'demo-biscuits', name: 'Butter Biscuits', category: 'snacks', unitPriceCentavos: 1000, costCentavos: 700, stock: 20, expirationDate: '2026-11-01' },
  ...posProducts.map(product => ({ ...product, costCentavos: Math.floor(product.unitPriceCentavos * 0.8), expirationDate: '2027-06-01' })),
];
// TODO(backend): Replace fictional asset records with the Owner's store assets.
// - Method/Action: GET / Fetch business assets
// - Expected Input/Payload: None (authenticated Owner session)
// - Expected Response: BusinessAsset[] with stable IDs, centavo values, classifications, and date-only recordedDate
// - UI State to Wire: Populate asset screens and recompute displayed totals from the response
export const businessAssets: readonly BusinessAsset[] = [
  { id: 'demo-cash', name: 'Cash on Hand', valueCentavos: 1245000, usefulLifeYears: 0, classification: 'current', recordedDate: '2026-10-19' },
  { id: 'demo-shelves', name: 'Shelves', valueCentavos: 209000, usefulLifeYears: 5, classification: 'furniture', recordedDate: '2026-03-02' },
  { id: 'demo-refrigerator', name: 'Refrigerator', valueCentavos: 1599900, usefulLifeYears: 10, classification: 'equipment', recordedDate: '2026-03-02' },
];
/** Fictional historical sale lines for demo rankings; payment previews add no sales. */
// TODO(backend): Replace historical sale lines with confirmed sales analytics.
// - Method/Action: GET / Fetch product sales history
// - Expected Input/Payload: Authenticated store session and reporting period
// - Expected Response: Array<{ productId: string; quantity: number; occurredAt: string }>
// - UI State to Wire: Drive product ranking and sales summaries from server-confirmed events
export const inventorySales = [
  { productId: 'demo-delata', quantity: 28, occurredAt: '2026-10-19T08:00:00.000Z' },
  { productId: 'demo-sunsilk', quantity: 9, occurredAt: '2026-10-19T08:00:00.000Z' },
  { productId: 'demo-c2', quantity: 40, occurredAt: '2026-10-19T08:00:00.000Z' },
] as const;
