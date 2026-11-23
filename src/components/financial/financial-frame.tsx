import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { router, useFocusEffect } from 'expo-router';
import { Image as BackgroundImage } from 'expo-image';
import { useCallback, type ReactNode } from 'react';
import { BackHandler, Image, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashboardNavigation } from '@/components/dashboard/dashboard-navigation';
import { MainHeader } from '@/components/dashboard/main-header';
import { BackButton } from '@/components/ui/back-button';
import { useTranslation } from '@/i18n/use-translation';
import tokens from '@/constants/design-tokens.json';

export const financialRoot = '/owner-menu/financial-statements' as const;
export function FinancialFrame({ title, landing = false, children, refreshing = false, onRefresh }: {
  title: string; landing?: boolean; children: ReactNode; refreshing?: boolean; onRefresh?: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const back = useCallback(() => router.dismissTo(landing ? '/owner-dashboard' : financialRoot), [landing]);
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => listener.remove();
  }, [back]));
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-canvas">
    <View pointerEvents="none" collapsable={false} style={[StyleSheet.absoluteFill, { zIndex: 0 }]} accessible={false} accessibilityElementsHidden>
      <BackgroundImage source={require('@/assets/images/financial/report-background.svg')} contentFit="fill" style={StyleSheet.absoluteFill} accessible={false} />
      <Image source={require('@/assets/images/financial/store-background.png')} resizeMode="contain" style={{ position: 'absolute', bottom: landing ? tokens.navigation.height + insets.bottom : 0, width: '100%', aspectRatio: 3.58, opacity: landing ? 1 : 0.68 }} />
    </View>
    <MainHeader showActions={!landing} />
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView style={{ backgroundColor: 'transparent' }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + (landing ? tokens.navigation.height + 24 : 24), backgroundColor: 'transparent' }}>
      <View className="w-full max-w-[460px] flex-1 self-center px-6" style={{ paddingTop: tokens.spacing.headerTitleGap }}>
        <View className="mb-5 flex-row items-center gap-1">
          <BackButton accessibilityLabel={t('common.back')} onPress={back} />
          <Text accessibilityRole="header" adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1}
            className="min-w-0 flex-1 type-h1-display text-brand">{title}</Text>
        </View>
        {children}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    {landing && <DashboardNavigation onHome={() => router.navigate('/owner-dashboard')} onPos={() => router.navigate('/owner-pos')} onUnavailable={() => {}} />}
  </SafeAreaView>;
}
