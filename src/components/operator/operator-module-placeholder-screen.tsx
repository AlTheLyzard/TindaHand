import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { OperatorHeader } from '@/components/operator/operator-header';
import { MotionModal as Modal } from '@/components/ui/motion-modal';
import { Button } from '@/components/ui/button';
import type { NavigationLabelKey } from '@/i18n';
import { useTranslation } from '@/i18n/use-translation';
import { useAuthFlow } from '@/state/auth-flow';
import { useNavigationHeight } from '@/state/navigation-motion';
import { posHref } from '@/components/pos/pos-frame';
import tokens from '@/constants/design-tokens.json';

export function OperatorModulePlaceholderScreen({ title, description, showSignOut = false, activeAction }: {
  title: string; description: string; showSignOut?: boolean; activeAction?: 'settings';
}) {
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const { clear } = useAuthFlow();
  const { t } = useTranslation();
  const [notice, setNotice] = useState<NavigationLabelKey | null>(null);

  function signOut() {
    clear();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/choose-account');
  }

  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
    <OperatorHeader activeAction={activeAction} />
    <View className="w-full max-w-[460px] flex-1 self-center px-5" style={{ paddingTop: tokens.spacing.headerTitleGap, paddingBottom: navigationHeight + insets.bottom + 16 }}>
      <Text accessibilityRole="header" className=" type-large-metric text-brand" style={{ lineHeight: 36 * fontScale }}>{title}</Text>
      <Text className="mt-3 type-micro-financial-rate text-text-secondary" style={{ lineHeight: 22 * fontScale }}>{description}</Text>
      {showSignOut && <View className="mt-auto pt-8"><Button variant="secondary" onPress={signOut}>Sign Out</Button></View>}
    </View>
    <DashboardNavigation onHome={() => router.navigate(posHref('/operator-pos'))} onPos={() => router.navigate(posHref('/operator-pos'))} onUnavailable={setNotice} />
    <Modal visible={!!notice} onRequestClose={() => setNotice(null)}>
      <View className="flex-1 items-center justify-center px-6"><View accessibilityViewIsModal className="w-full max-w-[412px] gap-4 rounded-card bg-white p-6">
        <Text accessibilityRole="header" className=" type-h3-heading text-brand">{t('dashboard.comingSoon')}</Text>
        <Text className=" type-micro-financial-rate text-text-secondary">{notice ? t('dashboard.unavailable', { feature: t(notice) }) : ''}</Text>
        <Button onPress={() => setNotice(null)}>{t('common.close')}</Button>
      </View></View>
    </Modal>
  </SafeAreaView>;
}
