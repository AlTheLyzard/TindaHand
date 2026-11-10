import { MotionContent } from '@/components/ui/motion-content';
import { usePushOnce } from '@/hooks/use-push-once';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { PosDialog } from '@/components/pos/pos-dialog';
import { PosBackButton } from '@/components/pos/pos-back-button';
import { PosFrame } from '@/components/pos/pos-frame';
import { PosIcon } from '@/components/pos/pos-icon';
import { Button, IconButton } from '@/components/ui/button';
import tokens from '@/constants/design-tokens.json';
import { useInventory } from '@/state/inventory';
import { useTranslation } from '@/i18n/use-translation';
import { usePos } from '@/state/pos';
import type { OwnerIdentity } from '@/types/auth';
import { formatPesos } from '@/utils/dashboard';
import { selectionSummary } from '@/utils/pos';
import { EmptyState, useContentPreview } from '@/components/ui/content-state';
import { RecordSkeleton } from '@/components/ui/content-skeletons';
import { usePosMetrics } from './pos-metrics';

type Confirmation = { kind: 'remove' | 'zero'; productId: string; name: string } | { kind: 'clear' };

const moveRow = LinearTransition.duration(200).reduceMotion(ReduceMotion.System);
const removeRow = FadeOut.duration(160).reduceMotion(ReduceMotion.System);

export function CartReviewScreen({ owner }: { owner: OwnerIdentity }) {
  const push = usePushOnce();
  const metrics = usePosMetrics();
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
  const browse = () => router.navigate('/owner-pos');
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

  const title = confirmation?.kind === 'zero' ? t('pos.cart.zeroTitle') : confirmation?.kind === 'clear' ? 'Discard Changes?' : t('pos.cart.removeTitle');
  const message = confirmation?.kind === 'zero' ? t('pos.cart.zeroHelp', { name: confirmation.name })
    : confirmation?.kind === 'remove' ? t('pos.cart.removeHelp', { name: confirmation.name })
    : 'You have unsaved changes. Are you sure you want to close without saving?';

  return <PosFrame owner={owner} step="cart" onPos={browse}>
    <ScrollView showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tokens.spacing.four }}>
      <MotionContent changeKey={preview.mode} className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.gutter }}>
        <View className="mb-5 mt-2 flex-row items-center justify-between gap-3">
          <PosBackButton label={t('pos.cart.back')} onPress={browse} />
          <Text accessibilityRole="header" className="flex-1 font-poppins-bold text-[16px] text-[#102342]">{t('pos.cart.title')}</Text>
          <Text accessibilityLiveRegion="polite" className="font-poppins-bold text-[11px] text-text-secondary">{preview.loading ? 'Loading cart' : t(items.length === 1 ? 'pos.cart.lineCountOne' : 'pos.cart.lineCount', { count: items.length })}</Text>
        </View>
        {preview.loading ? <RecordSkeleton kind="cart" count={items.length || 2} /> : <>
        <View collapsable={false}>
          {visibleItems.map(item => {
            const stock = products.find(product => product.id === item.productId)?.stock ?? 0;
            const atLimit = item.quantity >= stock;
            return <Animated.View key={item.productId} collapsable={false} layout={moveRow} exiting={removeRow} style={{ marginBottom: tokens.spacing.three, borderRadius: tokens.radius.card, backgroundColor: '#FFFFFF', padding: tokens.spacing.three }}>
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="font-poppins-bold text-[15px] text-[#102342]">{item.itemName}</Text>
                  <Text className="mt-1 font-poppins text-[12px] text-text-secondary">{t('pos.cart.unitPrice', { price: formatPesos(item.unitPriceCentavos) })}</Text>
                </View>
                <IconButton accessibilityLabel={t('pos.cart.removeLabel', { name: item.itemName })} onPress={() => requestConfirmation({ kind: 'remove', productId: item.productId, name: item.itemName })} className="min-h-12 min-w-12 items-center justify-center" variant="destructiveText" icon={({ color }) => <PosIcon name="trash" color={color} />} />
              </View>
              <View className="mt-3 flex-row flex-wrap items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <IconButton variant="primary" accessibilityLabel={t('pos.cart.decrease', { name: item.itemName })} onPress={() => item.quantity === 1 ? requestConfirmation({ kind: 'zero', productId: item.productId, name: item.itemName }) : changeQuantity(item.productId, -1)}
                    style={{ minWidth: 40, minHeight: 40 }}
                    icon={({ color }) => <Text style={{ fontFamily: tokens.button.fontFamily, fontSize: 18, color }}>−</Text>} />
                  <Text accessibilityLabel={t('pos.cart.quantity', { name: item.itemName, count: item.quantity })} className="min-w-6 text-center font-poppins-bold text-[16px] text-[#102342]">{item.quantity}</Text>
                  <IconButton variant="primary" accessibilityLabel={t('pos.cart.increase', { name: item.itemName })} disabled={atLimit} onPress={() => changeQuantity(item.productId, 1)}
                    style={{ minWidth: 40, minHeight: 40 }}
                    icon={({ color }) => <Text style={{ fontFamily: tokens.button.fontFamily, fontSize: 18, color }}>+</Text>} />
                </View>
                <View className="ml-auto items-end">
                  <Text className="font-poppins text-[11px] text-text-secondary">{item.quantity} × {formatPesos(item.unitPriceCentavos)}</Text>
                  <Text className="mt-1 font-poppins-bold text-[16px] text-brand">{formatPesos(item.quantity * item.unitPriceCentavos)}</Text>
                </View>
              </View>
              {atLimit && <Text className="mt-2 font-poppins-bold text-[11px] text-text-secondary">{t('pos.cart.stockLimit')}</Text>}
            </Animated.View>;
          })}
        </View>
        <Animated.View layout={moveRow}>
        {items.length > 5 && <Button variant="text" fullWidth={false} compact accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}>
          {expanded ? 'Show less' : `View all ${items.length} products`}
        </Button>}
        {!preview.empty && hasStockConflict && <Text accessibilityRole="alert" className="my-3 font-poppins text-[12px] text-[#972020]">{t('pos.catalogChanged')}</Text>}
        {items.length === 0 && <EmptyState icon="cart" title={t('pos.cart.empty')} description={t('pos.cart.emptyHelp')} action={t('pos.cart.browse')} onAction={() => { preview.reset(); browse(); }} />}
        <View accessibilityLiveRegion="polite" className="mt-6 rounded-card bg-[#D1E1F5] p-5">
          <Text accessibilityRole="header" className="font-poppins-bold text-[17px] text-[#102342]">{t('pos.cart.summary')}</Text>
          <View className="mt-4 flex-row flex-wrap justify-between gap-2 border-b border-[#ADC9EE] pb-4">
            <Text className="font-poppins text-[14px] text-brand">{t('pos.cart.subtotal')}</Text>
            <Text className="font-poppins-bold text-[14px] text-[#102342]">{formatPesos(summary.totalCentavos)}</Text>
          </View>
          <Text className="mt-3 font-poppins-bold text-[11px] text-[#102342]">{t('pos.cart.total')}</Text>
          <Text className="mt-2 font-poppins-bold text-[28px] text-brand">{formatPesos(summary.totalCentavos)}</Text>
        </View>
        <View className="mt-6 flex-row gap-4">
          <View className="flex-1"><Button variant="secondary" disabled={items.length === 0} onPress={() => requestConfirmation({ kind: 'clear' })}>{t('pos.cart.emptyAction')}</Button></View>
          <View className="flex-1"><Button disabled={items.length === 0 || hasStockConflict} onPress={() => push('/owner-pos/payment')}>{t('pos.cart.checkout')}</Button></View>
        </View>
        </Animated.View>
        </>}
        {preview.control}
      </MotionContent>
    </ScrollView>
    <PosDialog visible={!!confirmation} title={title} message={message} destructive onClose={close} onConfirm={confirm}
      cancelLabel={confirmation?.kind === 'clear' ? 'Keep Editing' : undefined}
      confirmLabel={confirmation?.kind === 'clear' ? 'Discard Changes' : t('pos.cart.remove')} />
  </PosFrame>;
}
