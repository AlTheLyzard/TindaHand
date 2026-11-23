import { KeyboardAwareScrollView as ScrollView, KeyboardViewport as KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { BackButton } from "@/components/ui/back-button";
import tokens from "@/constants/design-tokens.json";
import { useNavigationHeight } from "@/state/navigation-motion";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, type ReactNode } from "react";
import { BackHandler, Image, Keyboard, Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export const settingsRoot = "/owner-menu/settings" as const;
export function SettingsFrame({
  title,
  parent = settingsRoot,
  landing = false,
  storefrontArtwork = true,
  navigationRole = 'owner',
  showBack = true,
  children,
}: {
  title: string;
  parent?: Href;
  landing?: boolean;
  storefrontArtwork?: boolean;
  navigationRole?: 'owner' | 'operator';
  showBack?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
  const { fontScale } = useWindowDimensions();
  const back = useCallback(() => {
    Keyboard.dismiss();
    router.dismissTo(parent);
  }, [parent]);
  useFocusEffect(
    useCallback(() => {
      const listener = BackHandler.addEventListener("hardwareBackPress", () => {
        back();
        return true;
      });
      return () => listener.remove();
    }, [back]),
  );
  return (
    <View className={`flex-1 ${storefrontArtwork ? '' : 'bg-canvas'}`}>
      {storefrontArtwork && <Image
        source={require('@/assets/images/auth/background.png')}
        resizeMode="cover"
        accessible={false}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />}
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1" style={storefrontArtwork ? { backgroundColor: 'transparent' } : undefined}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom:
              insets.bottom + (landing ? navigationHeight + 24 : 24),
          }}
        >
          <View
            className="w-full max-w-[460px] flex-1 self-center px-6"
            style={{ paddingTop: tokens.spacing.headerTitleGap }}
          >
            <View
              className={`flex-row items-center gap-2 ${landing ? "mb-3" : "mb-4"}`}
            >
              {showBack && (
                <BackButton
                  accessibilityLabel="Go back"
                  onPress={back}
                />
              )}
              <Text
                accessibilityRole="header"
                className="min-w-0 flex-1 type-h1-display text-brand"
                style={{ lineHeight: tokens.typography.h1Display.lineHeight * fontScale }}
              >
                {title}
              </Text>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {landing && (
        <DashboardNavigation
          onHome={() => router.navigate(navigationRole === 'operator' ? '/operator-pos' : '/owner-dashboard')}
          onPos={() => router.navigate(navigationRole === 'operator' ? '/operator-pos' : '/owner-pos')}
          onUnavailable={() => {}}
        />
      )}
      </SafeAreaView>
    </View>
  );
}
