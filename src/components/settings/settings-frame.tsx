import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { PosIcon } from "@/components/pos/pos-icon";
import { IconButton } from "@/components/ui/button";
import tokens from "@/constants/design-tokens.json";
import { useNavigationHeight } from "@/state/navigation-motion";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, type ReactNode } from "react";
import {
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export const settingsRoot = "/owner-menu/settings" as const;
export function SettingsFrame({
  title,
  parent = settingsRoot,
  landing = false,
  children,
}: {
  title: string;
  parent?: Href;
  landing?: boolean;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const navigationHeight = useNavigationHeight();
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
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-canvas">
      <View
        className="border-b bg-white"
        style={{ borderColor: tokens.color.navigationBorder }}
      >
        <View className="w-full max-w-[460px] flex-row items-center gap-3 self-center px-5 py-4">
          <Image
            source={require("@/assets/images/brand/tindahand-mark.png")}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
            accessible={false}
          />
          <Text className="flex-shrink font-poppins-bold text-[20px] leading-[30px] text-brand">
            TindaHand
          </Text>
        </View>
      </View>
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
            style={{ paddingTop: landing ? 16 : 32 }}
          >
            <View
              className={`flex-row items-center gap-2 ${landing ? "mb-1" : "mb-8"}`}
            >
              {!landing && (
                <IconButton
                  accessibilityLabel="Go back"
                  onPress={back}
                  className="-ml-3 min-h-12 min-w-12 items-center justify-center"
                  icon={({ color }) => <PosIcon name="back" color={color} />}
                />
              )}
              <Text
                accessibilityRole="header"
                className="min-w-0 flex-1 font-poppins-bold text-brand"
                style={{
                  fontSize: landing ? 30 : 24,
                  lineHeight: landing ? 42 : 36,
                }}
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
          onHome={() => router.navigate("/owner-dashboard")}
          onPos={() => router.navigate("/owner-pos")}
          onUnavailable={() => {}}
        />
      )}
    </SafeAreaView>
  );
}
