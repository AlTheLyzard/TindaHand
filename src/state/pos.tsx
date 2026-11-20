import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { checkout } from "@/services/pos";
import { useAuthFlow } from "@/state/auth-flow";
import { useInventory } from "@/state/inventory";
import type {
  ChangeBreakdown,
  PaymentDraft,
  ProductSelection,
} from "@/types/pos";
import { hasCapability } from "@/utils/operator-access";
import {
  removeSelectedProduct,
  selectProduct,
  setSelectedQuantity,
  stockConflicts,
} from "@/utils/pos";
import { emptyPaymentDraft } from "@/utils/pos-payment";

let orderSequence = 0;
const newOrderId = () => `pos-${Date.now()}-${++orderSequence}`;

function usePosState() {
  const {
    store: { products, pos },
    dispatch,
  } = useInventory();
  const { deviceSession } = useAuthFlow();
  const [selection, setSelection] = useState<ProductSelection>({});
  const [paymentDraft, setPaymentDraft] = useState(emptyPaymentDraft);
  const [toastExpiresAt, setToastExpiresAt] = useState<number | null>(null);
  const [checkoutDebtId, setCheckoutDebtId] = useState<string | null>(null);
  const [changeBreakdown, setChangeBreakdown] =
    useState<ChangeBreakdown | null>(null);
  const feedbackConsumed = useRef(false);
  const [orderId, setOrderId] = useState(newOrderId);
  const completed = useRef(new Set<string>());
  return {
    selection,
    paymentDraft,
    toastExpiresAt,
    changeBreakdown,
    customers: pos?.customers ?? [],
    hasStockConflict: stockConflicts(selection, products).length > 0,
    updatePayment(patch: Partial<PaymentDraft>) {
      setPaymentDraft((previous) => ({ ...previous, ...patch }));
    },
    dismissPreviewToast() {
      if (feedbackConsumed.current) return null;
      feedbackConsumed.current = true;
      setToastExpiresAt(null);
      setCheckoutDebtId(null);
      setChangeBreakdown(null);
      return checkoutDebtId;
    },
    async completeOrder(): Promise<{
      success: boolean;
      change: ChangeBreakdown | null;
    }> {
      if (
        !deviceSession ||
        !hasCapability(deviceSession, "pos") ||
        (paymentDraft.method === "partial" &&
          !hasCapability(deviceSession, "receivables")) ||
        completed.current.has(orderId)
      )
        return { success: false, change: null };

      completed.current.add(orderId);
      const ownerId =
        deviceSession.role === "operator"
          ? deviceSession.ownerId
          : deviceSession.owner.id;
      const kaheraId =
        deviceSession.role === "operator" ? deviceSession.operatorId : null;
      const occurredAt = new Date().toISOString();

      // 1. Commit to backend (stock deduction, sale record, greedy coin change).
      let change: ChangeBreakdown | null = null;
      try {
        const result = await checkout({
          id: orderId,
          occurredAt,
          selection,
          draft: paymentDraft,
          kaheraId,
        });
        change = result.change;
      } catch {
        // Offline or server error — fall back to local-only commit below.
      }

      // 2. Mirror into local inventory state so the UI stays consistent offline.
      let saved = false;
      try {
        saved = dispatch({
          type: "completeSale",
          command: {
            id: orderId,
            ownerId,
            occurredAt,
            selection,
            draft: paymentDraft,
          },
        });
      } catch {
        completed.current.delete(orderId);
        return { success: false, change: null };
      }
      if (!saved) {
        completed.current.delete(orderId);
        return { success: false, change: null };
      }

      feedbackConsumed.current = false;
      setChangeBreakdown(change);
      setCheckoutDebtId(
        paymentDraft.method === "partial" ? `debt-${orderId}` : null,
      );
      setSelection({});
      setPaymentDraft(emptyPaymentDraft());
      setOrderId(newOrderId());
      setToastExpiresAt(Date.now() + 15000);
      return { success: true, change };
    },
    add(productId: string) {
      const product = products.find((item) => item.id === productId);
      if (product) setSelection((previous) => selectProduct(previous, product));
    },
    changeQuantity(productId: string, delta: -1 | 1) {
      const product = products.find((item) => item.id === productId);
      if (product)
        setSelection((previous) =>
          setSelectedQuantity(
            previous,
            product,
            delta === -1
              ? Math.min(
                  product.stock,
                  (previous[productId]?.quantity ?? 0) - 1,
                )
              : (previous[productId]?.quantity ?? 0) + 1,
          ),
        );
    },
    remove(productId: string) {
      setSelection((previous) => removeSelectedProduct(previous, productId));
    },
    clear() {
      completed.current.add(orderId);
      setSelection({});
      setPaymentDraft(emptyPaymentDraft());
      setToastExpiresAt(null);
      setCheckoutDebtId(null);
      feedbackConsumed.current = true;
      setOrderId(newOrderId());
    },
  };
}

const PosContext = createContext<ReturnType<typeof usePosState> | null>(null);

/** Cart drafts and completed records survive navigation for the current mock session. */
function SessionPos({ children }: { children: ReactNode }) {
  const value = usePosState();
  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function PosProvider({ children }: { children: ReactNode }) {
  const { deviceSession } = useAuthFlow();
  return (
    <SessionPos key={deviceSession?.id ?? "signed-out"}>{children}</SessionPos>
  );
}

export function usePos() {
  const value = useContext(PosContext);
  if (!value) throw new Error("POS screens must render inside PosProvider.");
  return value;
}
