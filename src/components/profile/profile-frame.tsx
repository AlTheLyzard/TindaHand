import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { useCallback, type ReactNode } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { BackHandler, Image, Keyboard, Platform, Text, View } from 'react-native';
import { AuthBackground } from '@/components/auth/auth-background';
import { DashboardAction, DashboardIcon, dashboardIcons } from '@/components/dashboard/dashboard-ui';
import { BackButton } from '@/components/ui/back-button';
import { useAuthFlow } from '@/state/auth-flow';
import { useProfileSnapshot } from '@/hooks/use-owner-profile';
import { OwnerProfileAvatar as ProfileAvatar } from './profile-ui';
import tokens from '@/constants/design-tokens.json';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const profileRoot = '/owner-menu/profile' as const;
export const operatorsRoot = '/owner-menu/profile/operators' as const;
export function ProfileFrame({ title, subtitle, children, onBack, onNavigate, busy = false, feedback }: {
  title: string; subtitle?: string; children: ReactNode; onBack?: () => void;
  onNavigate?: (action: () => void) => void; busy?: boolean; feedback?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { owner } = useAuthFlow();
  const profiles = useProfileSnapshot();
  const back = useCallback(() => {
    Keyboard.dismiss();
    if (busy) return;
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/owner-dashboard');
  }, [onBack, busy]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]));
  function navigate(action: () => void) { if (!busy) { Keyboard.dismiss(); if (onNavigate) onNavigate(action); else action(); } }
  return <AuthBackground headerWave>
    <View className="border-b border-[#ADC9EE] bg-white">
      <View className="w-full max-w-[460px] flex-row items-center gap-2 self-center px-4 py-2">
        <Image source={require('@/assets/images/brand/tindahand-mark.png')} style={{ width: 32, height: 34 }} resizeMode="contain" accessible={false} />
        <Text className="min-w-0 flex-1 font-poppins-bold text-[20px] leading-[30px] text-brand">TindaHand</Text>
        <DashboardAction label="Settings" onPress={() => navigate(() => router.navigate('/owner-menu/settings'))}><DashboardIcon source={dashboardIcons.settings} size={24} /></DashboardAction>
        <DashboardAction label="Profile" selected interactionBackgroundColor={tokens.color.surfaceSubtle} onPress={() => navigate(() => router.dismissTo(profileRoot))}><ProfileAvatar size={32} backgroundColor={tokens.color.surfaceSubtle} avatarId={owner ? profiles.get(owner.id)?.avatarId : null} /></DashboardAction>
      </View>
    </View>
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
        <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-6 pt-3">
          <View className="mb-2 flex-row items-center gap-1">
            <BackButton accessibilityLabel="Go back" disabled={busy} onPress={back} />
            <Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-[22px] leading-[32px] text-brand">{title}</Text>
          </View>
          {!!subtitle && <Text className="mb-5 font-poppins text-[12px] leading-[18px] text-text-secondary">{subtitle}</Text>}
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    {feedback && <View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: insets.bottom + tokens.spacing.three }}>{feedback}</View>}
  </AuthBackground>;
}
