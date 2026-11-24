import { KaheraChangePinScreen } from "@/components/auth/kahera-change-pin-screen";
import { router } from "expo-router";

export default function KaheraChangePinRoute() {
  function handleSuccess() {
    // Navigate to the Kahera POS once PIN is changed.
    router.replace("/operator-pos");
  }
  return <KaheraChangePinScreen onSuccess={handleSuccess} />;
}
