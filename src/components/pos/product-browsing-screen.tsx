import tokens from '@/constants/design-tokens.json';
import { KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Keyboard, Platform, Text, View } from 'react-native';
import { PosFrame, posHref, type PosRouteBase } from './pos-frame';
import { PaymentPreviewToast } from './payment-preview-toast';
import { PosIcon } from './pos-icon';
import { ProductCatalog, type ProductCatalogHandle } from './product-catalog';
import { usePosMetrics } from './pos-metrics';
import { usePushOnce } from '@/hooks/use-push-once';
import { useInventory } from '@/state/inventory';
import { usePos } from '@/state/pos';
import { useTranslation } from '@/i18n/use-translation';
import type { OwnerIdentity } from '@/types/auth';
import { formatPesos } from '@/utils/dashboard';
import { selectionSummary } from '@/utils/pos';
import { listPreviewStates, useContentPreview } from '@/components/ui/content-state';

export function ProductBrowsingScreen({ owner, basePath = '/owner-pos' }: { owner: OwnerIdentity; basePath?: PosRouteBase }) {
  const push = usePushOnce();
  const metrics = usePosMetrics();
  const { preview: previewControl } = useLocalSearchParams<{ preview?: string }>();
  const preview = useContentPreview(listPreviewStates);
  const { store: { products }, refetchProducts } = useInventory();
  // Re-sync with the backend when the POS screen gains focus so Kahera
  // always sees the latest inventory changes from May-Ari.
  useFocusEffect(useCallback(() => { void refetchProducts(); }, [refetchProducts]));
  const { selection, add } = usePos();
  const { t } = useTranslation();
  const catalog = useRef<ProductCatalogHandle>(null);
  const summary = selectionSummary(selection);
  return <PosFrame owner={owner} basePath={basePath} step="select" onPos={() => { Keyboard.dismiss(); catalog.current?.scrollToTop(); }}>
    <PaymentPreviewToast ownerMode={basePath === '/owner-pos'} />
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ProductCatalog ref={catalog} products={preview.empty ? [] : products} selection={selection} onAdd={add} preview={preview}
        control={__DEV__ && previewControl === 'controls' ? preview.control : null} onOpenInventory={() => { preview.reset(); router.navigate(basePath === '/owner-pos' ? '/owner-inventory' : '/operator-inventory'); }} />
      <View testID="pos-cart-sheet" className="w-full justify-center rounded-t-[14px] border border-outline bg-white py-3" style={{ minHeight: metrics.sheetHeight }}>
        <View className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.sheetPadding }}>
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1" accessibilityLiveRegion="polite"><Text className=" type-helper leading-[14px] text-text-secondary">{summary.quantity} {summary.quantity === 1 ? 'Item' : 'Items'} | Total:</Text><Text testID="pos-cart-total" className=" type-h2-section leading-[45px] text-brand">{formatPesos(summary.totalCentavos)}</Text></View>
            <Pressable testID="pos-view-cart" accessibilityRole="button" accessibilityLabel={`${t('pos.viewCart')} →`} onPress={() => { Keyboard.dismiss(); push(posHref(basePath, 'cart')); }} className="min-h-12 min-w-12 flex-row items-center justify-center gap-2 py-2 pl-3">
              <Text testID="pos-view-cart-label" className=" type-button-cta leading-[21px] text-action">{t('pos.viewCart')}</Text>
              <View testID="pos-view-cart-arrow" accessible={false} style={{ transform: [{ rotate: '180deg' }] }}><PosIcon name="back" size={20} color={tokens.color.royalBlue} /></View>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </PosFrame>;
}
