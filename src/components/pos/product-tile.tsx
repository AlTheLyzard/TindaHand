import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { MotionSurface } from '@/components/ui/motion-content';
import tokens from '@/constants/design-tokens.json';
import { useTranslation } from '@/i18n/use-translation';
import type { PosProduct } from '@/types/pos';
import { formatPesos } from '@/utils/dashboard';
import { inventoryPolicy } from '@/utils/inventory';
import { usePosMetrics } from './pos-metrics';

/** One press target includes the quantity control, so a tap adds exactly once. */
export function ProductTile({ product, quantity, onAdd }: {
  product: PosProduct; quantity: number; onAdd: (productId: string) => void;
}) {
  const { t } = useTranslation();
  const { fontScale, width } = useWindowDimensions();
  const quantityBadgeSize = Math.ceil(fontScale * 24) + 2;
  const nameLines = width < 360 || fontScale > 1.1 ? 2 : 1;
  const metrics = usePosMetrics();
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
      const filled = selected && !active && !noStock;
      const ink = noStock ? tokens.color.textSecondary : selected ? tokens.button.primary.default : '#102342';
      return <MotionSurface testID={`product-tile-${product.id}`} className="rounded-control border p-2" style={{
        minHeight: metrics.tileHeight,
        backgroundColor: noStock ? tokens.color.surfaceSubtle : filled ? tokens.color.accentContainer : '#FFFFFF',
        borderColor: selected || active ? tokens.color.accentBase : tokens.color.borderOutline,
      }}>
        <View accessible={false} className="mb-4 w-full rounded" style={{ aspectRatio: 1.4, backgroundColor: noStock || filled ? tokens.color.primaryDisabled : tokens.color.surfaceSubtle }} />
        <View className="absolute right-3 top-3 rounded border px-1 py-0.5" style={{ maxWidth: '85%',
          backgroundColor: noStock ? '#FFEBEE' : lowStock ? '#FFF8E1' : '#E8F5E9',
          borderColor: noStock ? '#CC333B' : lowStock ? tokens.color.warningBase : '#36833C' }}>
          <Text className="font-poppins text-[9px]" style={{ color: noStock ? '#972020' : lowStock ? '#7A5000' : '#286B2C' }}>{stockLabel}</Text>
        </View>
        <Text numberOfLines={nameLines} className="font-poppins text-[11px]" style={{ minHeight: Math.ceil(fontScale * 17) * nameLines, color: ink }}>{product.name}</Text>
        <Text className="font-poppins-bold text-[13px]" style={{ color: noStock ? '#91AACB' : tokens.color.accentBase }}>{formatPesos(product.unitPriceCentavos)}</Text>
        <View className="mt-auto items-end pt-1">
          <View accessible={false} className="items-center justify-center" style={{ width: Math.max(40, Math.ceil(fontScale * 24) + 16), height: Math.max(36, Math.ceil(fontScale * 24) + 8) }}>
            {selected ? <View testID={`product-quantity-badge-${product.id}`} className="items-center justify-center rounded-full" style={{ minWidth: quantityBadgeSize, minHeight: quantityBadgeSize, maxWidth: '100%', paddingHorizontal: 7 * fontScale, paddingVertical: 1,
              backgroundColor: tokens.color.surfaceCard }}>
              <Text testID={`product-quantity-${product.id}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}
                className="text-center font-poppins-bold text-[14px] leading-[24px]" style={{ color: tokens.color.textPrimary }}>{quantity}</Text>
            </View> : <Text className="text-center font-poppins text-[28px] leading-[28px]" style={{ color: ink }}>+</Text>}
          </View>
        </View>
      </MotionSurface>;
    }}
  </Pressable>;
}
