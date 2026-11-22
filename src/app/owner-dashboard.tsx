import { Redirect, router } from "expo-router";

import { RegistrationToast } from "@/components/auth/registration-toast";
import { OwnerDashboardScreen } from "@/components/dashboard/owner-dashboard-screen";
import { fetchMe } from "@/services/session-api";
import { clearToken, getToken } from "@/services/token-storage";
import { useAuthFlow } from "@/state/auth-flow";
import type { OwnerIdentity } from "@/types/auth";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OwnerDashboardRoute() {
  const {
    owner: mockOwner,
    mockSession,
    deviceSession,
    restoring,
    clear,
    loginToastExpiresAt,
    dismissLoginToast,
  } = useAuthFlow();
  const insets = useSafeAreaInsets();
  const [serverOwner, setServerOwner] = useState<
    OwnerIdentity | null | "loading"
  >("loading");

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) {
        setServerOwner(null);
        return;
      }
      const me = await fetchMe(token);
      if (me && (me.role === "owner" || me.role === "may_ari")) {
        setServerOwner({
          id: me.formatted_id,
          name: me.name,
          mode: "confirmed",
        });
      } else {
        setServerOwner(null);
      }
    })();
  }, []);

  const owner = mockOwner ?? (serverOwner === 'loading' ? null : serverOwner);
  const isLoading = restoring || (!mockOwner && serverOwner === 'loading');

  if (isLoading) return <View className="flex-1 items-center justify-center bg-canvas"><Text className=" type-micro-financial-rate text-brand">Restoring your session…</Text></View>;
  // If the session is locked (background timer or cold restart with persisted lock),
  // redirect to the PIN screen instead of showing the dashboard.
  if (deviceSession?.locked) return <Redirect href={{ pathname: '/login', params: { role: 'owner' } }} />;
  if (!owner) return <Redirect href="/choose-account" />;

  async function handleLogout() {
    await clearToken();
    clear();
    if (router.canDismiss()) router.dismissAll();
    router.replace({
      pathname: "/login",
      params: { role: "owner", loggedOut: "1" },
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <OwnerDashboardScreen owner={owner} onLogout={handleLogout} />
      {loginToastExpiresAt && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: insets.top + 56,
            left: 24,
            right: 24,
          }}
        >
          <RegistrationToast
            expiresAt={loginToastExpiresAt}
            onDismiss={dismissLoginToast}
            title="Login successful"
            message="Your credentials have been verified."
          />
        </View>
      )}
    </View>
  );
}
