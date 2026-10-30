import { MotionProvider } from '@/state/motion';
import { useStackMotion } from '@/hooks/use-stack-motion';
import "@/global.css";

import { Poppins_400Regular } from "@expo-google-fonts/poppins/400Regular";
import { Poppins_600SemiBold } from "@expo-google-fonts/poppins/600SemiBold";
import { Poppins_700Bold } from "@expo-google-fonts/poppins/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AuthFlowProvider } from "@/state/auth-flow";
import { CashRegisterProvider } from "@/state/cash-register";
import { InventoryProvider } from "@/state/inventory";
import { QuickAddProvider } from "@/state/quick-add";
import { PosProvider } from "@/state/pos";
import { NavigationMotionProvider } from "@/state/navigation-motion";

void SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const stackMotion = useStackMotion();
  const [loaded, error] = useFonts({ Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold });

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (error) throw error;
  if (!loaded) return null;

  return (
    <AuthFlowProvider>
      <InventoryProvider>
        <CashRegisterProvider>
          <QuickAddProvider>
            <PosProvider>
            <NavigationMotionProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  ...stackMotion,
                  headerShown: false,
                  contentStyle: { backgroundColor: "#F0F8FF" },
                }}
              />
            </NavigationMotionProvider>
            </PosProvider>
          </QuickAddProvider>
        </CashRegisterProvider>
      </InventoryProvider>
    </AuthFlowProvider>
  );
}

export default function RootLayout() {
  return <MotionProvider><RootNavigation /></MotionProvider>;
}
