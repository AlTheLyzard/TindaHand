import { Text, View, useWindowDimensions } from 'react-native';
import { Button, IconButton } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import { PosIcon } from './pos-icon';
import { useInventory } from '@/state/inventory';
import type { ProductSelection } from '@/types/pos';
import { selectProduct, setSelectedQuantity } from '@/utils/pos';
import { formatPesos } from '@/utils/dashboard';
import { AnimatedPesoValue } from '@/components/receivables/receivables-ui';
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
  const browseButton = <View style={{ marginTop: lines.length ? 0 : 8 }}><Button compact variant="text" onPress={onBrowse}>+ Add Product</Button></View>;
  return <View style={{ gap: fullPage ? tokens.spacing.three : 8 }}>
    {lines.map(line => {
      const product = products.find(item => item.id === line.productId);
      if (fullPage) return <View key={line.productId} className="rounded-card" style={{ backgroundColor: tokens.color.surfaceCard, padding: tokens.spacing.three }}>
        <View className="flex-row items-start justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="type-list-financial text-text-primary">{line.itemName}</Text>
            <Text className="mt-1 type-micro-caption text-text-secondary">{formatPesos(line.unitPriceCentavos)} / each</Text>
          </View>
          <IconButton accessibilityLabel={`Remove ${line.itemName}`} onPress={() => onRemove(line.productId, 'remove')} className="min-h-12 min-w-12 items-center justify-center" variant="destructiveText" icon={({ color }) => <PosIcon name="trash" size={22} color={color} />} />
        </View>
        <View className="mt-3 flex-row flex-wrap items-center justify-between gap-3">
          <QuantityStepper value={line.quantity} valueLabel={`Quantity ${line.quantity}`} decreaseLabel={`Decrease ${line.itemName}`} increaseLabel={`Increase ${line.itemName}`}
            onDecrease={() => {
              if (line.quantity === 1) onRemove(line.productId, 'quantity-zero');
              else if (product) onChange(previous => setSelectedQuantity(previous, product, line.quantity - 1));
            }}
            onIncrease={() => { if (product) onChange(previous => selectProduct(previous, product)); }}
            increaseDisabled={!product || line.quantity >= product.stock} />
          <View className="ml-auto items-end">
            <AnimatedPesoValue centavos={line.quantity * line.unitPriceCentavos} fitContent className="mt-1 type-list-financial text-brand" />
          </View>
        </View>
      </View>;
      return <View key={line.productId} className="items-center gap-1 rounded-surface px-3 py-1" style={{ minHeight: 64, flexDirection: fontScale > 1.25 ? 'column' : 'row', alignItems: fontScale > 1.25 ? 'stretch' : 'center', backgroundColor: fullPage ? tokens.color.surfaceCard : tokens.color.surfaceSubtle, paddingVertical: fullPage ? tokens.spacing.three : tokens.spacing.one }}>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: tokens.typography.weights.semibold, fontSize: tokens.typography.labelNav.fontSize, lineHeight: 18, color: tokens.color.textPrimary }}>{line.itemName}</Text>
          <Text className="mt-0.5 type-micro-caption leading-4 text-text-secondary">{formatPesos(line.unitPriceCentavos)} {fullPage ? '/ isa' : 'each'}</Text>
          {fullPage && <Text className="type-helper text-text-secondary">{line.quantity} × {formatPesos(line.unitPriceCentavos)}</Text>}
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
          {fullPage && <AnimatedPesoValue centavos={line.quantity * line.unitPriceCentavos} fitContent className="ml-auto type-button-cta text-brand" />}
        </View>
      </View>;
    })}
    {error && lines.length > 0 && <Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text>}
    {browseButton}
  </View>;
}
