import { createContext, useContext, useRef, useState, type ReactNode } from 'react';

import { useInventory } from '@/state/inventory';
import { useAuthFlow } from '@/state/auth-flow';
import type { PaymentDraft, ProductSelection } from '@/types/pos';
import { removeSelectedProduct, selectProduct, setSelectedQuantity, stockConflicts } from '@/utils/pos';
import { emptyPaymentDraft } from '@/utils/pos-payment';

let orderSequence = 0;
const newOrderId = () => `pos-${Date.now()}-${++orderSequence}`;

function usePosState() {
  const { store: { products, pos }, dispatch } = useInventory();
  const { owner } = useAuthFlow();
  const [selection, setSelection] = useState<ProductSelection>({});
  const [paymentDraft, setPaymentDraft] = useState(emptyPaymentDraft);
  const [toastExpiresAt, setToastExpiresAt] = useState<number | null>(null);
  const [orderId, setOrderId] = useState(newOrderId);
  const completed = useRef(new Set<string>());
  return {
    selection, paymentDraft, toastExpiresAt, customers: pos?.customers ?? [],
    hasStockConflict: stockConflicts(selection, products).length > 0,
    updatePayment(patch: Partial<PaymentDraft>) { setPaymentDraft(previous => ({ ...previous, ...patch })); },
    dismissPreviewToast() { setToastExpiresAt(null); },
    completeOrder() {
      // TODO(BACKEND): Success currently means one local inventory service commit.
      // Make this flow async and keep the draft until the server confirms the
      // atomic sale; reconcile retries/conflicts. See docs/backend-handoff.md#inventory-and-pos.
      if (!owner || completed.current.has(orderId)) return false;
      completed.current.add(orderId);
      let saved = false;
      try {
        saved = dispatch({ type: 'completeSale', command: { id: orderId, ownerId: owner.id, occurredAt: new Date().toISOString(), selection, draft: paymentDraft } });
      } catch {
        completed.current.delete(orderId);
        return false;
      }
      if (!saved) { completed.current.delete(orderId); return false; }
      setSelection({});
      setPaymentDraft(emptyPaymentDraft());
      setOrderId(newOrderId());
      setToastExpiresAt(Date.now() + 15000);
      return true;
    },
    add(productId: string) {
      const product = products.find(item => item.id === productId);
      if (product) setSelection(previous => selectProduct(previous, product));
    },
    changeQuantity(productId: string, delta: -1 | 1) {
      const product = products.find(item => item.id === productId);
      if (product) setSelection(previous => setSelectedQuantity(previous, product, delta === -1 ? Math.min(product.stock, (previous[productId]?.quantity ?? 0) - 1) : (previous[productId]?.quantity ?? 0) + 1));
    },
    remove(productId: string) { setSelection(previous => removeSelectedProduct(previous, productId)); },
    clear() { completed.current.add(orderId); setSelection({}); setPaymentDraft(emptyPaymentDraft()); setToastExpiresAt(null); setOrderId(newOrderId()); },
  };
}

const PosContext = createContext<ReturnType<typeof usePosState> | null>(null);

/** Cart drafts and completed records survive navigation for the current mock session. */
function SessionPos({ children }: { children: ReactNode }) {
  const value = usePosState();
  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function PosProvider({ children }: { children: ReactNode }) {
  const { owner, selectedRole, dashboardAccess } = useAuthFlow();
  return <SessionPos key={`${owner?.id ?? 'signed-out'}:${selectedRole}:${dashboardAccess}`}>{children}</SessionPos>;
}

export function usePos() {
  const value = useContext(PosContext);
  if (!value) throw new Error('POS screens must render inside PosProvider.');
  return value;
}
