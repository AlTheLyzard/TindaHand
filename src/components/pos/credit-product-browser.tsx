import { useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { ProductCatalog } from './product-catalog';
import { useInventory } from '@/state/inventory';
import tokens from '@/constants/design-tokens.json';
import type { ProductSelection } from '@/types/pos';
import { selectProduct, selectionSummary, stockConflicts } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';

/** Selection is a local transaction. Confirm publishes snapshots to the debt
 * form only; neither selection nor dismissal writes a sale, debt, or stock. */
export function CreditProductBrowser({ name, selection, onConfirm, onReturn }: {
  name: string; selection: ProductSelection; onConfirm: (selection: ProductSelection) => void; onReturn: () => void;
}) {
  const { store: { products } } = useInventory();
  const [draft, setDraft] = useState(selection);
  const returned = useRef(false);
  const summary = selectionSummary(draft);
  const conflicts = stockConflicts(draft, products);
  const finish = (confirm: boolean) => {
    if (returned.current || (confirm && conflicts.length)) return;
    returned.current = true; Keyboard.dismiss();
    if (confirm) onConfirm(draft); else onReturn();
  };
  return <View testID="credit-product-browser" style={{ flex: 1, minHeight: 0, maxHeight: '100%', backgroundColor: tokens.color.appBackground }}>
    <View style={{ width: '100%', maxWidth: 460, flex: 1, minHeight: 0, alignSelf: 'center', overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: tokens.spacing.safeAreaTitleGap, paddingBottom: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><BackButton accessibilityLabel="Back to debt form" onPress={() => finish(false)} />
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.titleAccent.fontSize, color: tokens.color.textPrimary }}>Select Products</Text></View>
        <Text style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, color: tokens.color.textSecondary }}>Choose items and quantities for this Customer Debt.</Text>
        {!!name.trim() && <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, color: tokens.color.textPrimary }}>Customer: {name}</Text>}
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        <ProductCatalog products={products} selection={draft} onAdd={id => {
          const product = products.find(item => item.id === id);
          if (product) setDraft(previous => selectProduct(previous, product));
        }} />
      </View>
      <View style={{ flexShrink: 0, padding: 16, gap: 12, borderTopWidth: 1, borderColor: tokens.color.borderOutline, backgroundColor: tokens.color.surfaceCard }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: tokens.typography.weights.semibold, color: tokens.color.textSecondary }}>{summary.quantity} selected</Text>
          <Text style={{ fontFamily: tokens.typography.weights.bold, fontSize: tokens.typography.titleAccent.fontSize, color: tokens.color.textPrimary }}>{formatPesos(summary.totalCentavos)}</Text>
        </View>
        {!!conflicts.length && <Text accessibilityRole="alert" style={{ fontFamily: tokens.typography.weights.regular, fontSize: tokens.typography.microCaption.fontSize, color: tokens.color.errorBase }}>Stock changed. Reduce or remove unavailable quantities before confirming.</Text>}
        <Button disabled={!!conflicts.length} onPress={() => finish(true)}>Confirm Products</Button>
      </View>
    </View>
  </View>;
}
