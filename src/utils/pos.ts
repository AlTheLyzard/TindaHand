import type { PosProduct, ProductCategory, ProductSelection } from '@/types/pos';

/** Preserve cart name/price snapshots while checking the current live catalog. */
export function stockConflicts(selection: ProductSelection, products: readonly PosProduct[]) {
  const catalog = new Map(products.map(product => [product.id, product]));
  return Object.values(selection).filter(line => !catalog.has(line.productId) || line.quantity > catalog.get(line.productId)!.stock).map(line => line.productId);
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
