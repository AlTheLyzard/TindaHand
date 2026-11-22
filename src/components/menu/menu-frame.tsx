import { BackButton } from '@/components/ui/back-button';
import type { ScrollViewInstance } from 'react-native';
import { router } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { useNavigationHeight } from '@/state/navigation-motion';
import tokens from '@/constants/design-tokens.json';

export function MenuFrame({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const scroll = useRef<ScrollViewInstance>(null);
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/owner-dashboard');
  }
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
    <ScrollView ref={scroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + navigationHeight + 24 }}>
      <View className="w-full max-w-[460px] self-center px-5" style={{ paddingTop: tokens.spacing.safeAreaTitleGap }}>
        <View className="mb-6 flex-row items-center gap-3">
          <BackButton accessibilityLabel="Go back" onPress={back} />
          <Text accessibilityRole="header" className="min-w-0 flex-1 type-h2-section leading-9 text-brand">{title}</Text>
        </View>
        {children}
      </View>
    </ScrollView>
    <DashboardNavigation
      onHome={() => router.navigate('/owner-dashboard')} onPos={() => router.navigate('/owner-pos')}
      onUnavailable={() => {}} />
  </SafeAreaView>;
}
