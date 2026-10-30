import type { ScrollViewInstance } from 'react-native';
import { MotionPressable as Pressable } from '@/components/ui/motion-pressable';
import { router } from 'expo-router';
import { useRef, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { PosIcon } from '@/components/pos/pos-icon';
import tokens from '@/constants/design-tokens.json';
import { useDashboardNavigation } from '@/hooks/use-dashboard-navigation';
import { useNavigationHeight } from '@/state/navigation-motion';

export function MenuFrame({ title, children }: { title: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const navigation = useDashboardNavigation();
  const navigationHeight = useNavigationHeight();
  const scroll = useRef<ScrollViewInstance>(null);
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace('/owner-dashboard');
  }
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-white">
    <ScrollView ref={scroll} onScroll={navigation.onScroll} scrollEventThrottle={16}
      contentContainerStyle={{ paddingBottom: insets.bottom + navigationHeight + tokens.navigation.expandedLift + tokens.spacing.two + tokens.spacing.four }}>
      <View className="w-full max-w-[460px] self-center px-5 pt-10">
        <View className="mb-6 flex-row items-center gap-3">
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back} className="min-h-12 min-w-12 items-center justify-center rounded-pill active:bg-[#F0F8FF]"><PosIcon name="back" color="#112F6F" /></Pressable>
          <Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-[24px] leading-9 text-brand">{title}</Text>
        </View>
        {children}
      </View>
    </ScrollView>
    <DashboardNavigation bottomInset={insets.bottom} expanded={navigation.expanded}
      onHome={() => router.navigate('/owner-dashboard')} onPos={() => router.navigate('/owner-pos')}
      onUnavailable={() => {}}
      renderIcon={(name, selected) => <PosIcon name={name} active={selected} color={selected ? '#102342' : '#4A607A'} size={tokens.size.navigationIcon} />} />
  </SafeAreaView>;
}
