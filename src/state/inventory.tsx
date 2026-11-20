import {
  applyInventoryAction,
  applyOperatorPosAction,
  getProducts,
  loadMockInventory,
} from "@/services/inventory";

import { useAuthFlow } from "@/state/auth-flow";
import type { InventoryProduct } from "@/types/inventory";
import type { Customer } from "@/types/pos";
import { type InventoryAction, type InventoryStore } from "@/utils/inventory";
import { customerNameKey } from "@/utils/pos-checkout";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const InventoryContext = createContext<{
  store: InventoryStore;
  getStore: () => InventoryStore;
  dispatch: (action: InventoryAction) => boolean;
  ensureCustomer: (name: string, id: string) => Customer | null;
  feedback: string;
  setFeedback: (message: string) => void;
} | null>(null);
function SessionInventory({ children }: { children: ReactNode }) {
  const auth = useAuthFlow();
  const [store, setStore] = useState<InventoryStore>(() => loadMockInventory());
  const current = useRef(store);

  // Try to load real products from the API on session start.
  // The store always starts with mock data (loadMockInventory), so if the API
  // is unreachable or returns an error, the mock products remain visible.
  // On success, real products replace the mock ones so checkout uses real IDs.
  useEffect(() => {
    // Only fetch when there's an active authenticated session (owner or kahera).
    if (!auth.deviceSession || auth.deviceSession.locked) return;
    let cancelled = false;
    getProducts()
      .then((apiProducts) => {
        if (cancelled) return;
        const realProducts: InventoryProduct[] = apiProducts.map((p) => ({
          id: p.id, // already a string "prod-abc123"
          name: p.name,
          category: p.category as InventoryProduct["category"],
          unitPriceCentavos: p.unitPriceCentavos, // correct field name
          costCentavos: p.costCentavos,
          stock: p.stock, // correct field name
          expirationDate: p.expirationDate ?? "",
          photoUri: p.photoUri ?? undefined,
          batches: p.batches?.map((b) =>
            b.noExpiry
              ? {
                  id: b.id,
                  quantity: b.quantity,
                  noExpiry: true as const,
                  expirationDate: null,
                }
              : {
                  id: b.id,
                  quantity: b.quantity,
                  noExpiry: false as const,
                  expirationDate: b.expirationDate ?? "",
                },
          ),
        }));
        // Only replace mock data if the API returned at least one product.
        // An empty array usually means the backend has no products seeded yet —
        // keep the mock products visible so the app doesn't look broken offline.
        if (realProducts.length === 0) return;
        // Merge real products into the store, keeping POS/sales/customer state intact.
        setStore((previous) => {
          const next = { ...previous, products: realProducts };
          current.current = next;
          return next;
        });
      })
      .catch(() => {
        // Offline or server error — keep whatever is already in state.
      });
    return () => {
      cancelled = true;
    };
    // Re-fetch whenever the user's session changes (e.g. owner logs in then kahera logs in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.deviceSession?.id]);
  const [feedback, setFeedback] = useState("");
  function dispatch(action: InventoryAction) {
    let next = current.current;
    if (auth.owner)
      next = applyInventoryAction(current.current, auth.owner, action);
    else if (auth.deviceSession?.role === "operator") {
      if (action.type === "completeSale")
        next = applyOperatorPosAction(
          current.current,
          auth.deviceSession,
          action,
        );
      else if (action.type === "saveProduct" || action.type === "restock")
        next = applyInventoryAction(current.current, null, action);
    }
    if (next === current.current) return false;
    current.current = next;
    setStore(next);
    return true;
  }
  function ensureCustomer(name: string, id: string) {
    // TODO(backend): Resolve or create customer identity under the current store on the server.
    // - Method/Action: GET / Search customers; POST / Create or link customer
    // - Expected Input/Payload: Normalized name and optional selected customer ID
    // - Expected Response: Canonical Customer ID or a duplicate/validation result
    // - UI State to Wire: Replace local name matching and retain selection when linking fails
    if (!auth.owner || !name.trim()) return null;
    const existing = current.current.pos?.customers.find(
      (customer) => customerNameKey(customer.name) === customerNameKey(name),
    );
    if (existing) return existing;
    const customer = { id, name: name.trim().replace(/\s+/g, " ") };
    return dispatch({ type: "registerCustomer", customer }) ? customer : null;
  }
  return (
    <InventoryContext.Provider
      value={{
        store,
        getStore: () => current.current,
        dispatch,
        ensureCustomer,
        feedback,
        setFeedback,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}
export function InventoryProvider({ children }: { children: ReactNode }) {
  const { deviceSession } = useAuthFlow();
  // Locking retains this session's demo state; full logout/removal clears it.
  return (
    <SessionInventory key={deviceSession?.id ?? "signed-out"}>
      {children}
    </SessionInventory>
  );
}
export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error("Inventory requires InventoryProvider.");
  return value;
}
