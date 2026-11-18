import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { applyInventoryAction, applyOperatorPosAction, getProducts, loadMockInventory } from '@/services/inventory';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { useAuthFlow } from '@/state/auth-flow';
import { type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { customerNameKey } from '@/utils/pos-checkout';
import type { Customer } from '@/types/pos';
import type { InventoryProduct } from '@/types/inventory';

const InventoryContext = createContext<{ store: InventoryStore; getStore: () => InventoryStore; dispatch: (action: InventoryAction) => boolean; ensureCustomer: (name: string, id: string) => Customer | null; feedback: string; setFeedback: (message: string) => void } | null>(null);
function SessionInventory({ children }: { children: ReactNode }) {
  const auth = useAuthFlow();
  const [store, setStore] = useState<InventoryStore>(loadMockInventory);
  const current = useRef(store);

  // Load real products from the API on session start (replaces demo products).
  // Skipped entirely in mock-auth mode so the demo inventory stays intact for previews.
  // Falls back silently for real sessions — if offline, demo inventory stays.
  useEffect(() => {
    // Skip for mock/demo sessions — they should keep their seeded mock data.
    if (MOCK_AUTH_ENABLED) return;
    // Only fetch when there's an active authenticated session (owner or kahera).
    if (!auth.deviceSession || auth.deviceSession.locked) return;
    let cancelled = false;
    getProducts().then(apiProducts => {
      if (cancelled) return;
      const realProducts: InventoryProduct[] = apiProducts.map(p => ({
        id: String(p.id),
        name: p.name,
        category: p.category as InventoryProduct['category'],
        unitPriceCentavos: p.priceCentavos,
        stock: p.stockQuantity,
        costCentavos: 0,                         // not returned by list endpoint
        expirationDate: p.expirationDate ?? '',
      }));
      // Merge real products into the store, keeping POS/sales/customer state intact.
      setStore(previous => {
        const next = { ...previous, products: realProducts };
        current.current = next;
        return next;
      });
    }).catch(() => {
      // Offline or server error — keep whatever is already in state.
    });
    return () => { cancelled = true; };
  // Re-fetch whenever the user's session changes (e.g. owner logs in then kahera logs in).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.deviceSession?.id]);
  const [feedback, setFeedback] = useState('');
  function dispatch(action: InventoryAction) {
    const next = auth.owner
      ? applyInventoryAction(current.current, auth.owner, action)
      : auth.deviceSession?.role === 'operator' && action.type === 'completeSale'
        ? applyOperatorPosAction(current.current, auth.deviceSession, action)
        : current.current;
    if (next === current.current) return false;
    current.current = next;
    setStore(next);
    return true;
  }
  function ensureCustomer(name: string, id: string) {
    // TODO(BACKEND): Name matching only simulates customer linking; agree identity,
    // duplicate-name and create/link rules before API use. See docs/api-contract.md#customers-and-debts.
    if (!auth.owner || !name.trim()) return null;
    const existing = current.current.pos?.customers.find(customer => customerNameKey(customer.name) === customerNameKey(name));
    if (existing) return existing;
    const customer = { id, name: name.trim().replace(/\s+/g, ' ') };
    return dispatch({ type: 'registerCustomer', customer }) ? customer : null;
  }
  return <InventoryContext.Provider value={{ store, getStore: () => current.current, dispatch, ensureCustomer, feedback, setFeedback }}>{children}</InventoryContext.Provider>;
}
export function InventoryProvider({ children }: { children: ReactNode }) {
  const { deviceSession } = useAuthFlow();
  // Locking retains this session's demo state; full logout/removal clears it.
  return <SessionInventory key={deviceSession?.id ?? 'signed-out'} >{children}</SessionInventory>;
}
export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('Inventory requires InventoryProvider.');
  return value;
}
