import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { MotionSurface } from '@/components/ui/motion-content';
import tokens from '@/constants/design-tokens.json';
import { useTranslation } from '@/i18n/use-translation';
import type { PosProduct } from '@/types/pos';
import { formatPesos } from '@/utils/dashboard';
import { inventoryPolicy } from '@/utils/inventory';

/** One press target includes the quantity control, so a tap adds exactly once. */
export function ProductTile({ product, quantity, onAdd }: {
  product: PosProduct; quantity: number; onAdd: (productId: string) => void;
}) {
  const { t } = useTranslation();
  const { fontScale } = useWindowDimensions();
  const remaining = Math.max(0, product.stock - quantity);
  const noStock = product.stock <= 0;
  const disabled = noStock || remaining <= 0;
  const selected = quantity > 0;
  const lowStock = !noStock && remaining <= inventoryPolicy.lowStock;
  const stockLabel = noStock ? t('pos.noStock') : remaining === 0 ? t('pos.selectedStock') : t('pos.stock', { count: remaining });

  return <Pressable accessibilityRole="button" accessibilityLabel={t('pos.addLabel', { name: product.name, count: remaining })}
    accessibilityState={{ disabled, selected }} accessibilityValue={{ text: t('pos.selected', { count: quantity }) }}
    accessibilityHint={disabled ? stockLabel : t('pos.tile.addHint')}
    disabled={disabled} onPress={() => { if (!disabled) onAdd(product.id); }}>
    {({ pressed }) => {
      const active = pressed && !disabled;
      const ink = active ? '#FFFFFF' : noStock ? '#4A607A' : '#102342';
      return <MotionSurface className="rounded-control border p-2" style={{
        backgroundColor: active ? tokens.color.accentBase : noStock ? tokens.color.surfaceSubtle : '#FFFFFF',
        borderColor: selected ? tokens.color.accentBase : tokens.color.borderOutline,
      }}>
        <View accessible={false} className="mb-2 w-full rounded" style={{ aspectRatio: 1.35, backgroundColor: noStock ? tokens.color.primaryDisabled : tokens.color.surfaceSubtle }} />
        <View className="absolute right-3 top-3 rounded border px-1 py-0.5" style={{ maxWidth: '85%',
          backgroundColor: noStock ? '#FFEBEE' : lowStock ? '#FFF8E1' : '#E8F5E9',
          borderColor: noStock ? '#CC333B' : lowStock ? tokens.color.warningBase : '#36833C' }}>
          <Text className="font-poppins-bold text-[8px]" style={{ color: noStock ? '#972020' : lowStock ? '#7A5000' : '#286B2C' }}>{stockLabel}</Text>
        </View>
        <Text className="font-poppins-bold text-[11px]" style={{ minHeight: Math.ceil(fontScale * 17) * 2, color: ink }}>{product.name}</Text>
        <Text className="font-poppins text-[12px]" style={{ color: active ? '#FFFFFF' : noStock ? '#4A607A' : '#112F6F' }}>{formatPesos(product.unitPriceCentavos)}</Text>
        <View className="items-end">
          <View accessible={false} className="items-center justify-center" style={{ width: tokens.size.touchTarget, height: Math.max(tokens.size.touchTarget, Math.ceil(fontScale * 20) + 8) }}>
            {selected ? <View className="items-center justify-center rounded" style={{ minWidth: 20, minHeight: 20, maxWidth: '100%', paddingHorizontal: 4,
              backgroundColor: noStock ? tokens.color.primaryDisabled : tokens.color.accentContainer }}>
              <Text testID={`product-quantity-${product.id}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}
                className="text-center font-poppins-bold text-[10px] leading-[16px] text-brand">{quantity}</Text>
            </View> : <Text className="text-center font-poppins-bold text-[24px]" style={{ color: ink }}>+</Text>}
          </View>
        </View>
      </MotionSurface>;
    }}
  </Pressable>;
}
