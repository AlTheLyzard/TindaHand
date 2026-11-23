import { FieldLabel } from '@/components/ui/field-label';
import { Text, View, useWindowDimensions } from 'react-native';
import { Button, IconButton } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { PosIcon } from './pos-icon';
import { useInventory } from '@/state/inventory';
import type { ProductSelection } from '@/types/pos';
import { selectProduct, setSelectedQuantity } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';
import { quickAddStyles } from '@/components/dashboard/quick-add-ui';
import tokens from '@/constants/design-tokens.json';

/** Compact reference rows share POS snapshots and quantity constraints, with no stock mutations. */
export function CreditProductSelector({ selection, onChange, onRemove, onBrowse, error, fullPage = false }: {
  selection: ProductSelection; onChange: (update: (previous: ProductSelection) => ProductSelection) => void;
  onRemove: (id: string, reason: 'remove' | 'quantity-zero') => void; onBrowse: () => void; error?: string; fullPage?: boolean;
}) {
  const { store: { products } } = useInventory();
  const lines = Object.values(selection);
  const { fontScale } = useWindowDimensions();
  const browseButton = <View style={{ marginTop: lines.length ? 0 : 8 }}><Button compact variant={fullPage ? 'primary' : 'text'} onPress={onBrowse}>{fullPage ? 'Select Products' : '+ Select Products'}</Button></View>;
  return <View style={{ gap: 8 }}>
    <FieldLabel label="Products taken on credit" required style={quickAddStyles.label} />
    {fullPage && browseButton}
    {!lines.length && <Text accessibilityRole={error ? 'alert' : undefined} style={[quickAddStyles.note, error ? { color: tokens.color.errorBase } : undefined]}>No products added yet. Search for items taken on credit.</Text>}
    {lines.map(line => {
      const product = products.find(item => item.id === line.productId);
      return <View key={line.productId} className="items-center gap-1 rounded-surface px-3 py-1" style={{ minHeight: 64, flexDirection: fullPage || fontScale > 1.25 ? 'column' : 'row', alignItems: fullPage || fontScale > 1.25 ? 'stretch' : 'center', backgroundColor: fullPage ? tokens.color.surfaceCard : tokens.color.surfaceSubtle, paddingVertical: fullPage ? 16 : 4 }}>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: 18, color: tokens.color.textPrimary }}>{line.itemName}</Text>
          <Text className="mt-0.5 type-micro-caption leading-4 text-text-secondary">{formatPesos(line.unitPriceCentavos)} each</Text>
        </View>
        <View className="flex-row flex-wrap items-center" style={{ flexShrink: 0 }}>
              <QuantityStepper compact value={line.quantity} valueLabel={`Quantity ${line.quantity}`} valueTextClassName="type-micro-caption text-text-primary"
            decreaseLabel={`Decrease ${line.itemName}`} increaseLabel={`Increase ${line.itemName}`}
            onDecrease={() => {
              if (line.quantity === 1) onRemove(line.productId, 'quantity-zero');
              else if (product) onChange(previous => setSelectedQuantity(previous, product, line.quantity - 1));
            }}
            onIncrease={() => { if (product) onChange(previous => selectProduct(previous, product)); }}
            increaseDisabled={!product || line.quantity >= product.stock} />
          <IconButton accessibilityLabel={`Remove ${line.itemName}`} onPress={() => onRemove(line.productId, 'remove')} className="min-h-12 min-w-12 items-center justify-center" variant="destructiveText" icon={({ color }) => <PosIcon name="trash" size={22} color={color} />} />
          {fullPage && <Text className="ml-auto type-button-cta text-brand">{formatPesos(line.quantity * line.unitPriceCentavos)}</Text>}
        </View>
      </View>;
    })}
    {error && lines.length > 0 && <Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text>}
    {!fullPage && browseButton}
  </View>;
}
