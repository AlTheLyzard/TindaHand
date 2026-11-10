import { Text, View, useWindowDimensions } from 'react-native';
import { Button, ButtonSurface, IconButton } from '@/components/ui/button';
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
  onRemove: (id: string) => void; onBrowse: () => void; error?: string; fullPage?: boolean;
}) {
  const { store: { products } } = useInventory();
  const lines = Object.values(selection);
  const { fontScale } = useWindowDimensions();
  return <View style={{ gap: 8 }}>
    <Text style={quickAddStyles.label}>Products taken on credit (Required)</Text>
    {!lines.length && <Text accessibilityRole={error ? 'alert' : undefined} style={[quickAddStyles.note, error ? { color: '#B4232C' } : undefined]}>No products added yet. Search for items taken on credit.</Text>}
    {lines.map(line => {
      const product = products.find(item => item.id === line.productId);
      return <View key={line.productId} className="items-center gap-1 rounded-surface px-3 py-1" style={{ minHeight: 64, flexDirection: fullPage || fontScale > 1.25 ? 'column' : 'row', alignItems: fullPage || fontScale > 1.25 ? 'stretch' : 'center', backgroundColor: fullPage ? '#FFFFFF' : tokens.color.surfaceSubtle, paddingVertical: fullPage ? 16 : 4 }}>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 12, lineHeight: 18, color: '#102342' }}>{line.itemName}</Text>
          <Text className="mt-0.5 font-poppins text-[11px] leading-4 text-text-secondary">{formatPesos(line.unitPriceCentavos)} each</Text>
        </View>
        <View className="flex-row flex-wrap items-center">
          <QuantityControl label={`Decrease ${line.itemName}`} icon="minus" onPress={() => {
            if (line.quantity === 1) onRemove(line.productId);
            else if (product) onChange(previous => setSelectedQuantity(previous, product, line.quantity - 1));
          }} />
          <Text accessibilityLabel={`Quantity ${line.quantity}`} className="min-w-5 text-center font-poppins text-[12px] text-[#102342]">{line.quantity}</Text>
          <QuantityControl label={`Increase ${line.itemName}`} icon="plus" disabled={!product || line.quantity >= product.stock} onPress={() => { if (product) onChange(previous => selectProduct(previous, product)); }} />
          <IconButton accessibilityLabel={`Remove ${line.itemName}`} onPress={() => onRemove(line.productId)} className="min-h-12 min-w-12 items-center justify-center" variant="destructiveText" icon={({ color }) => <PosIcon name="trash" size={22} color={color} />} />
          {fullPage && <Text className="ml-auto font-poppins-bold text-[14px] text-brand">{formatPesos(line.quantity * line.unitPriceCentavos)}</Text>}
        </View>
      </View>;
    })}
    {error && lines.length > 0 && <Text accessibilityRole="alert" style={quickAddStyles.error}>{error}</Text>}
    <View style={{ marginTop: lines.length ? 0 : 8 }}><Button onPress={onBrowse}>{fullPage ? '+ Add Product' : lines.length ? '+ Add Product' : '+ Select Products'}</Button></View>
  </View>;
}
function QuantityControl({ label, icon, onPress, disabled = false }: { label: string; icon: 'minus' | 'plus'; onPress: () => void; disabled?: boolean }) {
  return <View style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}>
    <ButtonSurface accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={8}
      style={{ minHeight: 32, width: 40, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' }}>
      {({ color }) => <PosIcon name={icon} size={16} color={color} active />}
    </ButtonSurface>
  </View>;
}
