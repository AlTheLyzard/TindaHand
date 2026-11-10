import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { applyInventoryAction, loadMockInventory } from '@/services/inventory';
import { useAuthFlow } from '@/state/auth-flow';
import { type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { customerNameKey } from '@/utils/pos-checkout';
import type { Customer } from '@/types/pos';

const InventoryContext = createContext<{ store: InventoryStore; getStore: () => InventoryStore; dispatch: (action: InventoryAction) => boolean; ensureCustomer: (name: string, id: string) => Customer | null; feedback: string; setFeedback: (message: string) => void } | null>(null);
function SessionInventory({ children }: { children: ReactNode }) {
  const auth = useAuthFlow();
  const [store, setStore] = useState<InventoryStore>(loadMockInventory);
  const current = useRef(store);
  const [feedback, setFeedback] = useState('');
  function dispatch(action: InventoryAction) {
    const next = applyInventoryAction(current.current, auth.owner, action);
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
