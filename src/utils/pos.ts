import type { PosCatalogFilters, PosProduct, ProductCategory, ProductSelection } from '@/types/pos';
import { inventoryRules } from '@/constants/inventory-rules';

export const defaultPosCatalogFilters: PosCatalogFilters = {
  category: 'all', priceRange: 'all', sort: 'az', availability: 'all',
};

export function hasPosCatalogFilters(filters: PosCatalogFilters) {
  return filters.category !== 'all' || filters.priceRange !== 'all'
    || filters.sort !== 'az' || filters.availability !== 'all';
}

/** Local POS catalog filtering; prices remain integer centavos. */
export function filterPosCatalogProducts(products: readonly PosProduct[], query: string, filters: PosCatalogFilters) {
  const search = query.trim().toLocaleLowerCase('en');
  const filtered = products.filter(product => {
    const price = product.unitPriceCentavos;
    const matchesPrice = filters.priceRange === 'all'
      || (filters.priceRange === 'under50' && price <= 5_000)
      || (filters.priceRange === '50to100' && price > 5_000 && price <= 10_000)
      || (filters.priceRange === 'over100' && price > 10_000);
    const matchesAvailability = filters.availability === 'all'
      || (filters.availability === 'inStock' && product.stock > inventoryRules.lowStock)
      || (filters.availability === 'lowStock' && product.stock > 0 && product.stock <= inventoryRules.lowStock)
      || (filters.availability === 'outOfStock' && product.stock <= 0);
    return product.name.toLocaleLowerCase('en').includes(search)
      && (filters.category === 'all' || product.category === filters.category)
      && matchesPrice && matchesAvailability;
  });
  if (filters.sort === 'default') return filtered;
  return filtered.sort((a, b) => filters.sort === 'za'
    ? b.name.localeCompare(a.name, 'en') : a.name.localeCompare(b.name, 'en'));
}

/** Preserve cart name/price snapshots while checking the current live catalog. */
export function stockConflicts(selection: ProductSelection, products: readonly PosProduct[]) {
  const catalog = new Map(products.map(product => [product.id, product]));
  return Object.values(selection).filter(line => !catalog.has(line.productId) || line.quantity > catalog.get(line.productId)!.stock).map(line => line.productId);
}

export type CartStockStatus = { kind: 'unavailable' | 'insufficient' | 'depleted' | 'low'; available: number };

/** Stock remaining after this cart line's requested quantity is accounted for. */
export function cartStockStatus(stock: number | undefined, quantity: number, lowStockThreshold: number): CartStockStatus | null {
  if (stock === undefined || stock <= 0) return { kind: 'unavailable', available: 0 };
  if (quantity > stock) return { kind: 'insufficient', available: stock };
  const available = stock - quantity;
  if (available === 0) return { kind: 'depleted', available };
  if (available <= lowStockThreshold) return { kind: 'low', available };
  return null;
}

export function filterProducts(products: readonly PosProduct[], query: string, category: ProductCategory | null, letter: string | null) {
  const search = query.trim().toLocaleLowerCase('en');
  return products.filter(product => product.name.toLocaleLowerCase('en').includes(search)
    && (!category || product.category === category)
    && (!letter || product.name.toUpperCase().startsWith(letter)))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** Functional state update makes rapid repeated taps obey the same stock ceiling. */
export function selectProduct(selection: ProductSelection, product: PosProduct): ProductSelection {
  const previous = selection[product.id];
  const quantity = previous?.quantity ?? 0;
  if (quantity >= product.stock || product.stock <= 0) return selection;
  return { ...selection, [product.id]: previous
    ? { ...previous, quantity: quantity + 1 }
    : { productId: product.id, itemName: product.name, unitPriceCentavos: product.unitPriceCentavos, quantity: 1 } };
}

export function selectionSummary(selection: ProductSelection) {
  return Object.values(selection).reduce((summary, item) => ({
    quantity: summary.quantity + item.quantity,
    totalCentavos: summary.totalCentavos + item.quantity * item.unitPriceCentavos,
  }), { quantity: 0, totalCentavos: 0 });
}

export function cartCountsLabel(selection: ProductSelection) {
  const products = Object.keys(selection).length;
  const { quantity } = selectionSummary(selection);
  return `${products} ${products === 1 ? 'product' : 'products'} · ${quantity} ${quantity === 1 ? 'unit' : 'units'}`;
}

/** Positive quantities only; zero is a separate, explicitly confirmed removal. */
export function setSelectedQuantity(selection: ProductSelection, product: PosProduct, quantity: number): ProductSelection {
  const line = selection[product.id];
  if (!line || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > product.stock || quantity === line.quantity) return selection;
  return { ...selection, [product.id]: { ...line, quantity } };
}

export function removeSelectedProduct(selection: ProductSelection, productId: string): ProductSelection {
  if (!selection[productId]) return selection;
  const next = { ...selection };
  delete next[productId];
  return next;
}
