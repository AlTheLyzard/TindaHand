import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Image, Keyboard, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { DashboardAction, DashboardIcon, dashboardIcons } from '@/components/dashboard/dashboard-ui';
import { OwnerAvatar } from '@/components/profile/profile-ui';
import { Button } from '@/components/ui/button';
import { PosBackButton } from '@/components/pos/pos-back-button';
import { useNavigationHeight } from '@/state/navigation-motion';
import { useAuthFlow } from '@/state/auth-flow';
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

export function PosFrame({ owner, step, onPos, children, backAction, basePath = '/owner-pos' }: {
  owner: OwnerIdentity; step: 'select' | 'cart' | 'payment'; onPos: () => void; children: ReactNode;
  backAction?: { label: string; onPress: () => void };
  basePath?: PosRouteBase;
}) {
  const { t } = useTranslation();
  const { deviceSession } = useAuthFlow();
  const metrics = usePosMetrics();
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
  const showNavigation = step !== 'payment' && !keyboardVisible;
  const operatorSession = basePath === '/operator-pos' && deviceSession?.role === 'operator' ? deviceSession : null;
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
    <View className="border-b border-[#ADC9EE] bg-white">
      <View className="w-full max-w-[460px] flex-row items-center gap-2 self-center px-5 py-2">
        <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 32, height: 34 }} resizeMode="contain" accessible={false} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} className="min-w-0 flex-1 font-poppins-bold text-[20px] leading-[30px] text-brand">TindaHand</Text>
        {owner && basePath === '/owner-pos' && <>
          <DashboardAction label={t('navigation.settings')} onPress={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'settings' } })}><DashboardIcon source={dashboardIcons.settings} size={26} /></DashboardAction>
          <DashboardAction label={t('navigation.profile')} onPress={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'profile' } })}><OwnerAvatar /></DashboardAction>
        </>}
        {operatorSession && <View accessible accessibilityLabel={`Operator ${operatorSession.displayName}; store ${owner.name}; store owner ID ${operatorSession.ownerId}`} className="ml-auto max-w-[146px] items-end">
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} className="font-poppins-bold text-[11px] leading-[16px] text-brand">{operatorSession.displayName}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} className="font-poppins text-[10px] leading-[14px] text-text-secondary">{owner.name}</Text>
        </View>}
      </View>
    </View>
    <View className="w-full max-w-[460px] self-center" style={{ paddingHorizontal: metrics.gutter, paddingTop: metrics.titleTop }}>
      <View className="flex-row items-center gap-2">
        {backAction && <PosBackButton {...backAction} />}
        <Text testID="pos-title" accessibilityRole="header" className="flex-1 font-poppins-bold text-brand" style={{ fontSize: metrics.titleSize, lineHeight: metrics.titleLine }}>{t('pos.title')}</Text>
      </View>
      <View className="flex-row gap-2" style={{ marginTop: metrics.stepsTop, marginBottom: metrics.stepsBottom }}>
        {(['select', 'cart', 'payment'] as const).map(value => <View key={value} className="flex-1 border-t-2 pt-2" style={{ borderColor: value === 'select' || step === 'payment' || (value === 'cart' && step === 'cart') ? '#245399' : '#D9E7F4' }}>
          <Text accessibilityState={{ selected: value === step }} className="font-poppins-bold text-[10px]" style={{ color: value === 'select' || step === 'payment' || (value === 'cart' && step === 'cart') ? '#245399' : '#4A607A' }}>{t(`pos.step.${value}`)}</Text>
        </View>)}
      </View>
    </View>
    <View className="flex-1" style={{ paddingBottom: showNavigation ? navigationSpace : insets.bottom }}>{children}</View>
    {showNavigation && <DashboardNavigation onHome={() => { Keyboard.dismiss(); router.navigate(basePath === '/owner-pos' ? '/owner-dashboard' : posHref(basePath)); }} onPos={onPos} onUnavailable={setNotice} />}
    <Modal visible={!!notice} onRequestClose={() => setNotice(null)}>
      <View className="flex-1 items-center justify-center px-6"><View accessibilityViewIsModal className="w-full max-w-[412px] gap-4 rounded-card bg-white p-6">
        <Text accessibilityRole="header" className="font-poppins-bold text-[18px] text-brand">{t('dashboard.comingSoon')}</Text>
        <Text className="font-poppins text-[14px] text-text-secondary">{notice ? t('dashboard.unavailable', { feature: t(notice) }) : ''}</Text>
        <Button onPress={() => setNotice(null)}>{t('common.close')}</Button>
      </View></View>
    </Modal>
  </SafeAreaView>;
}
