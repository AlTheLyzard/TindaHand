import { useCallback, type ReactNode } from 'react';
import { BackHandler, Keyboard, Platform, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { KeyboardAwareScrollView as ScrollView, KeyboardViewport } from '@/components/ui/keyboard-aware-scroll-view';
import { AuthBackground } from '@/components/auth/auth-background';
import { BackButton } from '@/components/ui/back-button';
import { OperatorHeader } from '@/components/operator/operator-header';

export function OperatorProfileFrame({ title, subtitle, children, onBack, footer, busy = false }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  footer?: ReactNode;
  busy?: boolean;
}) {
  const back = useCallback(() => {
    Keyboard.dismiss();
    if (busy) return;
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/operator-pos');
  }, [busy, onBack]);
  useFocusEffect(useCallback(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => subscription.remove();
  }, [back]));

  return <AuthBackground headerWave>
    <View className="flex-1">
      <OperatorHeader activeAction="profile" onNavigate={action => { if (!busy) { Keyboard.dismiss(); action(); } }} />
      <KeyboardViewport className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-5 pt-3">
            <View className="mb-3 flex-row items-center gap-1">
              <BackButton accessibilityLabel="Go back" disabled={busy} onPress={back} />
              <Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-[22px] leading-[32px] text-brand">{title}</Text>
            </View>
            {subtitle && <Text className="mb-5 -mt-2 font-poppins text-[12px] leading-[18px] text-text-secondary">{subtitle}</Text>}
            {children}
          </View>
        </ScrollView>
      </KeyboardViewport>
      {footer && <View className="px-5 pb-3 pt-3">
        <View className="w-full max-w-[460px] self-center">{footer}</View>
      </View>}
    </View>
  </AuthBackground>;
}
