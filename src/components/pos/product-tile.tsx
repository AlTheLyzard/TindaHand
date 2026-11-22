import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';

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
  const outOfStock = noStock || remaining <= 0;
  const disabled = outOfStock;
  const selected = quantity > 0;
  const lowStock = !outOfStock && remaining <= inventoryPolicy.lowStock;
  const stockLabel = outOfStock ? t('pos.noStock') : t('pos.stock', { count: remaining });

  return <Pressable accessibilityRole="button" accessibilityLabel={t('pos.addLabel', { name: product.name, count: remaining })}
    accessibilityState={{ disabled, selected }} accessibilityValue={{ text: t('pos.selected', { count: quantity }) }}
    accessibilityHint={disabled ? stockLabel : t('pos.tile.addHint')}
    disabled={disabled} onPress={() => { if (!disabled) onAdd(product.id); }}>
    {({ pressed }) => {
      const active = pressed && !disabled;
      const filled = selected && !active && !noStock;
      const ink = noStock ? tokens.color.textSecondary : selected ? tokens.button.primary.default : tokens.color.textPrimary;
      return <MotionSurface testID={`product-tile-${product.id}`} className="rounded-control border p-2" style={{
        minHeight: metrics.tileHeight,
        backgroundColor: noStock ? tokens.color.surfaceSubtle : filled ? tokens.color.accentContainer : tokens.color.surfaceCard,
        borderColor: selected || active ? tokens.color.accentBase : tokens.color.borderOutline,
      }}>
        <View accessible={false} className="mb-4 w-full overflow-hidden rounded" style={{ aspectRatio: 1.4, backgroundColor: noStock || filled ? tokens.color.primaryDisabled : tokens.color.surfaceSubtle }}>
          {!!product.photoUri && <Image source={{ uri: product.photoUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessible={false} />}
        </View>
        <View className="absolute right-3 top-3 rounded border px-1 py-0.5" style={{ maxWidth: '85%',
          backgroundColor: outOfStock ? tokens.color.errorTint : lowStock ? tokens.color.warningTint : tokens.color.successTint,
          borderColor: outOfStock ? tokens.color.errorBase : lowStock ? tokens.color.warningBase : tokens.color.successBase }}>
          <Text className=" type-helper" style={{ color: outOfStock ? tokens.color.errorBase : lowStock ? tokens.color.warningText : tokens.color.successBase }}>{stockLabel}</Text>
        </View>
        <Text numberOfLines={nameLines} className=" type-micro-caption" style={{ minHeight: Math.ceil(fontScale * 17) * nameLines, color: ink }}>{product.name}</Text>
        <Text className=" type-button-cta" style={{ color: noStock ? tokens.color.textDisabled : tokens.color.accentBase }}>{formatPesos(product.unitPriceCentavos)}</Text>
        <View className="mt-auto items-end pt-1">
          <View accessible={false} className="items-center justify-center" style={{ width: Math.max(40, Math.ceil(fontScale * 24) + 16), height: Math.max(36, Math.ceil(fontScale * 24) + 8) }}>
            {selected ? <View testID={`product-quantity-badge-${product.id}`} className="items-center justify-center rounded-full" style={{ minWidth: quantityBadgeSize, minHeight: quantityBadgeSize, maxWidth: '100%', paddingHorizontal: 7 * fontScale, paddingVertical: 1,
              backgroundColor: tokens.color.surfaceCard }}>
              <Text testID={`product-quantity-${product.id}`} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}
                className="text-center type-button-cta leading-[24px]" style={{ color: tokens.color.textPrimary }}>{quantity}</Text>
            </View> : <Text className="text-center font-poppins text-[28px] leading-[28px]" style={{ color: ink }}>+</Text>}
          </View>
        </View>
      </MotionSurface>;
    }}
  </Pressable>;
}
