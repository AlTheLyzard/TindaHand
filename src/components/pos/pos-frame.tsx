import tokens from '@/constants/design-tokens.json';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { MainHeader } from '@/components/dashboard/main-header';
import { OperatorHeader } from '@/components/operator/operator-header';
import { Button } from '@/components/ui/button';
import { PosBackButton } from '@/components/pos/pos-back-button';
import { useNavigationHeight } from '@/state/navigation-motion';
import type { NavigationLabelKey } from '@/i18n';
import { useTranslation } from '@/i18n/use-translation';
import type { OwnerIdentity } from '@/types/auth';
import { usePosMetrics } from './pos-metrics';

export type PosRouteBase = '/owner-pos' | '/operator-pos';
export function posHref(basePath: PosRouteBase, child?: 'cart' | 'payment') {
  if (basePath === '/owner-pos') {
    return child === 'cart' ? '/owner-pos/cart' : child === 'payment' ? '/owner-pos/payment' : '/owner-pos';
  }
  return child === 'cart' ? '/operator-pos/cart' : child === 'payment' ? '/operator-pos/payment' : '/operator-pos';
}

export function PosFrame({ owner, step, onPos, children, backAction, basePath = '/owner-pos', title }: {
  owner: OwnerIdentity; step: 'select' | 'cart' | 'payment'; onPos: () => void; children: ReactNode;
  backAction?: { label: string; onPress: () => void };
  basePath?: PosRouteBase;
  title?: string;
}) {
  const { t } = useTranslation();
  const metrics = usePosMetrics();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const [notice, setNotice] = useState<NavigationLabelKey | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const navigationSpace = navigationHeight + insets.bottom;
  const showNavigation = step === 'select' && !keyboardVisible;
  const contentBottomPadding = showNavigation ? navigationSpace : step === 'cart' ? 0 : insets.bottom;
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
    {step === 'select' && (owner && basePath === '/owner-pos' ? <MainHeader /> : <OperatorHeader />)}
    <View className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.gutter, paddingTop: metrics.titleTop }}>
      <View className="flex-row items-center gap-2">
        {backAction && <PosBackButton {...backAction} />}
        <Text testID="pos-title" accessibilityRole="header" className="flex-1 type-h1-display text-brand" style={{ lineHeight: tokens.typography.h1Display.lineHeight * fontScale }}>{title ?? t('pos.title')}</Text>
      </View>
      <View className="flex-row gap-2" style={{ marginTop: metrics.stepsTop, marginBottom: metrics.stepsBottom }}>
        {(['select', 'cart', 'payment'] as const).map(value => <View key={value} className="flex-1 border-t-2 pt-2" style={{ borderColor: value === 'select' || step === 'payment' || (value === 'cart' && step === 'cart') ? tokens.color.royalBlue : tokens.color.iceContainer }}>
          <Text accessibilityState={{ selected: value === step }} className=" type-helper" style={{ color: value === 'select' || step === 'payment' || (value === 'cart' && step === 'cart') ? tokens.color.royalBlue : tokens.color.textSecondary }}>{t(`pos.step.${value}`)}</Text>
        </View>)}
      </View>
    </View>
    <View className="flex-1" style={{ paddingBottom: contentBottomPadding }}>{children}</View>
    {showNavigation && <DashboardNavigation onHome={() => { Keyboard.dismiss(); router.navigate(basePath === '/owner-pos' ? '/owner-dashboard' : posHref(basePath)); }} onPos={onPos} onUnavailable={setNotice} />}
    <Modal visible={!!notice} onRequestClose={() => setNotice(null)}>
      <View className="flex-1 items-center justify-center px-6"><View accessibilityViewIsModal className="w-full max-w-[412px] gap-4 rounded-card bg-white p-6">
        <Text accessibilityRole="header" className=" type-h3-heading text-brand">{t('dashboard.comingSoon')}</Text>
        <Text className=" type-micro-financial-rate text-text-secondary">{notice ? t('dashboard.unavailable', { feature: t(notice) }) : ''}</Text>
        <Button onPress={() => setNotice(null)}>{t('common.close')}</Button>
      </View></View>
    </Modal>
  </SafeAreaView>;
}
