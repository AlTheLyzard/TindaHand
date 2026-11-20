import type { ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
import { AuthBackground } from '@/components/auth/auth-background';
import { BackButton } from '@/components/ui/back-button';
import { KeyboardAwareScrollView as ScrollView, KeyboardViewport } from '@/components/ui/keyboard-aware-scroll-view';

export function ProfilePageLayout({ header, title, subtitle, children, footer, onBack, busy = false }: {
  header: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack: () => void;
  busy?: boolean;
}) {
  return <AuthBackground headerWave>
    <View className="flex-1">
      {header}
      <KeyboardViewport className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="w-full max-w-[460px] flex-1 self-center px-5 pb-6 pt-3">
            <View className="mb-2 flex-row items-center gap-1">
              <BackButton accessibilityLabel="Go back" disabled={busy} onPress={onBack} />
              <Text accessibilityRole="header" className="min-w-0 flex-1 font-poppins-bold text-[22px] leading-[32px] text-brand">{title}</Text>
            </View>
            {!!subtitle && <Text className="mb-5 font-poppins text-[12px] leading-[18px] text-text-secondary">{subtitle}</Text>}
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
