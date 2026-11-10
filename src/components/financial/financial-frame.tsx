import { router, useFocusEffect } from 'expo-router';
import { Image as BackgroundImage } from 'expo-image';
import { useCallback, type ReactNode } from 'react';
import { BackHandler, Image, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { DashboardAction, DashboardCircle } from '@/components/dashboard/dashboard-ui';
import { PosIcon } from '@/components/pos/pos-icon';
import { IconButton } from '@/components/ui/button';
import { useTranslation } from '@/i18n/use-translation';
import { useAuthFlow } from '@/state/auth-flow';
import tokens from '@/constants/design-tokens.json';

export const financialRoot = '/owner-menu/financial-statements' as const;
export function FinancialFrame({ title, landing = false, children, refreshing = false, onRefresh }: {
  title: string; landing?: boolean; children: ReactNode; refreshing?: boolean; onRefresh?: () => void;
}) {
  const { t } = useTranslation();
  const { owner } = useAuthFlow();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const back = useCallback(() => router.dismissTo(landing ? '/owner-dashboard' : financialRoot), [landing]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => listener.remove();
  }, [back]));
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false} accessibilityElementsHidden>
      <BackgroundImage source={require('@/assets/images/financial/report-background.svg')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} />
      <Image source={require('@/assets/images/financial/store-background.png')} resizeMode="stretch" style={{ position: 'absolute', bottom: landing ? tokens.navigation.height + insets.bottom : 0, width: '100%', height: 80, opacity: landing ? 1 : 0.22 }} />
    </View>
    <View className="border-b border-[#ADC9EE] bg-white">
      <View className="w-full max-w-[460px] flex-row items-center gap-2 self-center px-5 py-2">
        <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 32, height: 34 }} resizeMode="contain" accessible={false} />
        <Text className="min-w-0 flex-1 font-poppins-bold text-[20px] text-brand">TindaHand</Text>
        {!landing && <>
          <DashboardAction label={t('navigation.settings')} onPress={() => router.navigate('/owner-menu/settings')}><PosIcon name="settings" color="#112F6F" /></DashboardAction>
          <DashboardAction label={t('navigation.profile')} onPress={() => router.navigate({ pathname: '/owner-menu/[tool]', params: { tool: 'profile' } })}><DashboardCircle><Text className="font-poppins-bold text-action">{owner?.name.trim().charAt(0).toUpperCase()}</Text></DashboardCircle></DashboardAction>
        </>}
      </View>
    </View>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + (landing ? tokens.navigation.height + 24 : 24) }}>
      <View className="w-full max-w-[460px] flex-1 self-center px-6 pt-6">
        <View className="mb-5 flex-row items-center gap-1">
          <IconButton accessibilityLabel={t('common.back')} onPress={back} className="-ml-3" icon={({ color }) => <PosIcon name="back" size={22} color={color} />} />
          <Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-brand" style={{ fontSize: landing ? width < 360 ? 20 : 26 : 22, lineHeight: landing ? 38 : 32 }}>{title}</Text>
          {!landing && onRefresh && <IconButton accessibilityLabel={t('financial.refresh')} disabled={refreshing} onPress={onRefresh} icon={({ color }) => <PosIcon name="history" size={20} color={color} />} />}
        </View>
        {children}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    {landing && <DashboardNavigation onHome={() => router.navigate('/owner-dashboard')} onPos={() => router.navigate('/owner-pos')} onUnavailable={() => {}} />}
  </SafeAreaView>;
}
