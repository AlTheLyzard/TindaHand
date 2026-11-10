import { IconButton } from '@/components/ui/button';
import type { ScrollViewInstance } from 'react-native';
import { router } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { PosIcon } from '@/components/pos/pos-icon';
import { useNavigationHeight } from '@/state/navigation-motion';

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
      <View className="w-full max-w-[460px] self-center px-5 pt-10">
        <View className="mb-6 flex-row items-center gap-3">
          <IconButton accessibilityLabel="Go back" onPress={back} className="min-h-12 min-w-12 items-center justify-center" icon={({ color }) => <PosIcon name="back" color={color} />} />
          <Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-[24px] leading-9 text-brand">{title}</Text>
        </View>
        {children}
      </View>
    </ScrollView>
    <DashboardNavigation
      onHome={() => router.navigate('/owner-dashboard')} onPos={() => router.navigate('/owner-pos')}
      onUnavailable={() => {}} />
  </SafeAreaView>;
}
