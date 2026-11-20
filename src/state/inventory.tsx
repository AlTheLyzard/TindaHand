import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { applyInventoryAction, applyOperatorInventoryAction, applyOperatorPosAction, loadMockInventory } from '@/services/inventory';
import { useAuthFlow } from '@/state/auth-flow';
import { type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { customerNameKey } from '@/utils/pos-checkout';
import type { Customer } from '@/types/pos';

const InventoryContext = createContext<{ store: InventoryStore; getStore: () => InventoryStore; dispatch: (action: InventoryAction) => boolean; ensureCustomer: (name: string, id: string) => Customer | null; feedback: string; setFeedback: (message: string) => void } | null>(null);
function SessionInventory({ children }: { children: ReactNode }) {
  const auth = useAuthFlow();
  // TODO(backend): Initialize session inventory from authorized server reads instead of the demo loader.
  // - Method/Action: GET / Fetch inventory store state
  // - Expected Input/Payload: Authenticated session and role/capability scope
  // - Expected Response: InventoryStore-compatible products, assets, batches, and POS records
  // - UI State to Wire: Add request loading/error/empty states and refresh the shared store after mutations
  const [store, setStore] = useState<InventoryStore>(() => loadMockInventory(auth.deviceSession?.role !== 'operator'));
  const current = useRef(store);
  const [feedback, setFeedback] = useState('');
  function dispatch(action: InventoryAction) {
    let next = current.current;
    if (auth.owner) next = applyInventoryAction(current.current, auth.owner, action);
    else if (auth.deviceSession?.role === 'operator') {
      if (action.type === 'completeSale') next = applyOperatorPosAction(current.current, auth.deviceSession, action);
      else if (action.type === 'saveProduct' || action.type === 'restock') next = applyOperatorInventoryAction(current.current, auth.deviceSession, action);
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
