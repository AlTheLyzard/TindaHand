import { RegistrationToast } from "@/components/auth/registration-toast";
import { usePos } from "@/state/pos";
import { formatPesos } from "@/utils/dashboard";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";

/** Maps centavo denominations to readable labels. */
const DENOM_LABELS: Record<number, string> = {
  100000: "₱1,000",
  50000: "₱500",
  20000: "₱200",
  10000: "₱100",
  5000: "₱50",
  2000: "₱20",
  1000: "₱10",
  500: "₱5",
  100: "₱1",
  25: "25¢",
  10: "10¢",
  5: "5¢",
  1: "1¢",
};

export function PaymentPreviewToast({
  ownerMode = true,
}: {
  ownerMode?: boolean;
}) {
  const { toastExpiresAt, changeBreakdown, dismissPreviewToast } = usePos();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const dismiss = useCallback(() => {
    const debtId = dismissPreviewToast();
    if (ownerMode && debtId)
      router.navigate({
        pathname: "/owner-menu/receivables-payables",
        params: { section: "receivable", status: "unpaid", debtId },
      });
  }, [dismissPreviewToast, ownerMode]);

  if (toastExpiresAt === null || !focused) return null;

  // Build coin change breakdown message if available
  let changeMessage = "Order processed and recorded.";
  if (changeBreakdown && changeBreakdown.totalChangeCentavos > 0) {
    const pieces = Object.entries(changeBreakdown.breakdown)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(
        ([denom, count]) =>
          `${count}× ${DENOM_LABELS[Number(denom)] ?? `${Number(denom) / 100}¢`}`,
      )
      .join(", ");
    changeMessage = `Change: ${formatPesos(changeBreakdown.totalChangeCentavos)} — ${pieces}`;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 top-0 z-50 px-4"
    >
      <RegistrationToast
        expiresAt={toastExpiresAt}
        onDismiss={dismiss}
        title="Order completed."
        message={changeMessage}
      />
    </View>
  );
}
