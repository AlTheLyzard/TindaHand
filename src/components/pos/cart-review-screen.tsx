import { MotionContent } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { PosDialog } from '@/components/pos/pos-dialog';
import { PosFrame, posHref, type PosRouteBase } from '@/components/pos/pos-frame';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button, IconButton } from '@/components/ui/button';
import { QuantityStepper } from '@/components/ui/quantity-stepper';
import tokens from '@/constants/design-tokens.json';
import { warningStockStatusColor } from '@/constants/stock-status-colors';
import { inventoryRules } from '@/constants/inventory-rules';
import { useInventory } from '@/state/inventory';
import { useTranslation } from '@/i18n/use-translation';
import { usePos } from '@/state/pos';
import type { OwnerIdentity } from '@/types/auth';
import { formatPesos } from '@/utils/dashboard';
import { cartStockStatus, selectionSummary } from '@/utils/pos';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import { usePosMetrics } from './pos-metrics';

type Confirmation = { kind: 'remove' | 'zero'; productId: string } | { kind: 'clear' };

const moveRow = LinearTransition.duration(200).reduceMotion(ReduceMotion.System);
const removeRow = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

export function CartReviewScreen({ owner, basePath = '/owner-pos' }: { owner: OwnerIdentity; basePath?: PosRouteBase }) {
  const push = usePushOnce();
  const metrics = usePosMetrics();
  const insets = useSafeAreaInsets();
  const { store: { products } } = useInventory();
  const { t } = useTranslation();
  const { selection, changeQuantity, remove, clear, hasStockConflict } = usePos();
  const preview = useContentPreview();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [expanded, setExpanded] = useState(false);
  const pendingConfirmation = useRef<Confirmation | null>(null);
  const removed = useRef(new Set<string>());
  useEffect(() => { for (const id of removed.current) if (selection[id]) removed.current.delete(id); }, [selection]);
  const items = preview.empty ? [] : Object.values(selection);
  const visibleItems = expanded ? items : items.slice(0, 5);
  const summary = selectionSummary(preview.empty ? {} : selection);
  const browse = () => router.navigate(posHref(basePath));
  const close = () => { pendingConfirmation.current = null; setConfirmation(null); };
  function requestConfirmation(next: Confirmation) {
    if (pendingConfirmation.current || (next.kind !== 'clear' && removed.current.has(next.productId))) return;
    pendingConfirmation.current = next;
    setConfirmation(next);
  }

  function confirm() {
    const pending = pendingConfirmation.current;
    if (!pending) return;
    pendingConfirmation.current = null;
    if (pending.kind === 'clear' || items.length <= 6) setExpanded(false);
    if (pending.kind === 'remove' || pending.kind === 'zero') { removed.current.add(pending.productId); remove(pending.productId); }
    if (pending.kind === 'clear') clear();
    close();
  }

  const title = confirmation?.kind === 'zero' ? t('pos.cart.zeroTitle') : confirmation?.kind === 'clear' ? 'Cancel Order?' : t('pos.cart.removeTitle');
  const message = confirmation?.kind === 'zero' ? t('pos.cart.zeroHelp')
    : confirmation?.kind === 'remove' ? t('pos.cart.removeHelp')
    : 'Are you sure you want to cancel this order? All selected items will be removed from your cart.';

  return <PosFrame owner={owner} basePath={basePath} step="cart" onPos={browse} backAction={{ label: t('pos.cart.back'), onPress: browse }}>
    <View className="flex-1">
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tokens.spacing.four }}>
      <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.gutter }}>
        <View className="mb-5 mt-2 flex-row items-center justify-between gap-3">
          <Text accessibilityRole="header" className="flex-1 type-list-financial text-text-primary">{t('pos.cart.title')}</Text>
          <Text accessibilityLiveRegion="polite" className=" type-label-nav text-text-secondary">{preview.loading ? 'Loading cart' : t(items.length === 1 ? 'pos.cart.lineCountOne' : 'pos.cart.lineCount', { count: items.length })}</Text>
        </View>
        {preview.loading ? <RecordSkeleton kind="cart" count={items.length || 2} /> : <>
        <View collapsable={false}>
          {visibleItems.map(item => {
            const product = products.find(product => product.id === item.productId);
            const stock = product?.stock ?? 0;
            const atLimit = item.quantity >= stock;
            const stockStatus = cartStockStatus(product?.stock, item.quantity, inventoryRules.lowStock);
            const blocking = stockStatus?.kind === 'unavailable' || stockStatus?.kind === 'insufficient';
            const status = stockStatus?.kind === 'unavailable' ? 'Product unavailable. Remove it from the cart.'
              : stockStatus?.kind === 'insufficient' ? `Insufficient stock. Only ${stockStatus.available} available.`
              : stockStatus?.kind === 'depleted' ? 'Out of stock. Requested quantity is available; no additional units remain.'
              : stockStatus?.kind === 'low' ? `Low Stock: ${stockStatus.available} available. Requested quantity is available.` : null;
            return <Animated.View key={item.productId} collapsable={false} layout={moveRow} exiting={removeRow} style={{ marginBottom: tokens.spacing.three, borderRadius: tokens.radius.card, backgroundColor: tokens.color.surfaceCard, padding: tokens.spacing.three }}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className=" type-list-financial text-text-primary">{item.itemName}</Text>
                  <Text className="mt-1 type-micro-caption text-text-secondary">{t('pos.cart.unitPrice', { price: formatPesos(item.unitPriceCentavos) })}</Text>
                </View>
                <IconButton accessibilityLabel={t('pos.cart.removeLabel', { name: item.itemName })} onPress={() => requestConfirmation({ kind: 'remove', productId: item.productId })} className="min-h-12 min-w-12 items-center justify-center" variant="destructiveText" icon={({ color }) => <PosIcon name="trash" color={color} />} />
              </View>
              <View className="mt-3 flex-row flex-wrap items-center justify-between gap-3">
                <QuantityStepper value={item.quantity} valueLabel={t('pos.cart.quantity', { name: item.itemName, count: item.quantity })}
                  decreaseLabel={t('pos.cart.decrease', { name: item.itemName })} increaseLabel={t('pos.cart.increase', { name: item.itemName })}
                  onDecrease={() => item.quantity === 1 ? requestConfirmation({ kind: 'zero', productId: item.productId }) : changeQuantity(item.productId, -1)}
                  onIncrease={() => changeQuantity(item.productId, 1)} increaseDisabled={atLimit} />
                <View className="ml-auto items-end">
                  <Text className="mt-1 type-list-financial text-brand">{formatPesos(item.quantity * item.unitPriceCentavos)}</Text>
                </View>
              </View>
              <View className="mt-2 flex-row items-start gap-2" style={{ minHeight: 16 }}>
                {!!status && stockStatus?.kind !== 'unavailable' && stockStatus?.kind !== 'insufficient' && <View accessible={false} style={{ marginTop: 3, width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: warningStockStatusColor }} />}
                {!!status && <Text accessibilityRole={blocking ? 'alert' : undefined} className="flex-1 type-label-nav leading-[16px]"
                  style={{ color: blocking ? tokens.color.errorBase : stockStatus?.kind === 'low' || stockStatus?.kind === 'depleted' ? warningStockStatusColor : tokens.color.textSecondary }}>{status}</Text>}
              </View>
            </Animated.View>;
          })}
        </View>
        <Animated.View layout={moveRow}>
        {items.length > 5 && <Button variant="text" fullWidth={false} compact accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
          {expanded ? 'Show less' : `View all ${items.length} products`}
        </Button>}
        {!preview.empty && hasStockConflict && <Text accessibilityRole="alert" className="my-3 type-micro-caption" style={{ color: tokens.color.errorBase }}>{t('pos.catalogChanged')}</Text>}
        {items.length === 0 && <EmptyState icon="cart" title={t('pos.cart.empty')} description={t('pos.cart.emptyHelp')} action={t('pos.cart.browse')} onAction={() => { preview.reset(); browse(); }} />}
        </Animated.View>
        </>}
        {preview.control}
      </MotionContent>
    </ScrollView>
    <View testID="pos-cart-total-panel" className="w-full rounded-t-[14px] bg-white" style={{ paddingHorizontal: metrics.gutter, paddingTop: tokens.spacing.two, paddingBottom: tokens.spacing.two + insets.bottom, borderWidth: 1, borderBottomWidth: 0, borderColor: tokens.color.borderOutline }}>
      <View className="w-full max-w-[460px] self-center">
        <View accessibilityLiveRegion="polite" className="flex-row items-center justify-between gap-3 border-b border-outline pb-2">
          <Text className=" type-micro-financial-rate text-brand">{t('pos.cart.subtotal')}</Text>
          <Text className=" type-button-cta text-text-primary">{formatPesos(summary.totalCentavos)}</Text>
        </View>
        <View className="flex-row items-center justify-between gap-3 py-2">
          <Text className="uppercase type-label-nav text-text-primary">{t('pos.cart.total')}</Text>
          <Text className=" type-large-metric text-brand">{formatPesos(summary.totalCentavos)}</Text>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1"><Button variant="secondary" disabled={items.length === 0} onPress={() => requestConfirmation({ kind: 'clear' })}>{t('common.cancel')}</Button></View>
          <View className="flex-1"><Button disabled={items.length === 0 || hasStockConflict} onPress={() => push(posHref(basePath, 'payment'))}>{t('pos.cart.checkout')}</Button></View>
        </View>
      </View>
    </View>
    </View>
    <PosDialog visible={!!confirmation} title={title} message={message} destructive onClose={close} onConfirm={confirm}
      cancelLabel={confirmation?.kind === 'clear' ? 'Keep Editing' : undefined}
      confirmLabel={confirmation?.kind === 'clear' ? 'Cancel Order' : t('pos.cart.remove')} />
  </PosFrame>;
}
