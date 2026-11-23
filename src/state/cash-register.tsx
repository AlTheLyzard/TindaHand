import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuthFlow } from '@/state/auth-flow';
import { createCashRegisterService } from '@/services/cash-register';
import { loadJson, persistJson } from '@/services/local-persist';

const CashRegisterContext = createContext<{
  addedCentavos: number; begin: () => number; add: (token: number, value: string) => Promise<boolean>;
} | null>(null);

function SessionCashRegister({ children, ownerId }: { children: ReactNode; ownerId: string }) {
  const { owner } = useAuthFlow();
  const [store] = useState(createCashRegisterService);
  const current = useRef(store);
  const [addedCentavos, setAddedCentavos] = useState(0);

  // Hydrate persisted cash-added amount on mount.
  useEffect(() => {
    if (!ownerId) return;
    loadJson<number>(ownerId, 'cash-added').then(saved => {
      if (typeof saved === 'number' && saved > 0) setAddedCentavos(saved);
    }).catch(() => { /* non-fatal */ });
  // Run once per session instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <CashRegisterContext.Provider value={{ addedCentavos, begin: () => current.current.begin(), async add(token, value) {
    const total = await current.current.add(owner, token, value);
    if (total === null) return false;
    // Publish the confirmed mock adjustment total through the existing Dashboard
    // projection. A backend cash snapshot must replace this together with the service.
    setAddedCentavos(total);
    void persistJson(ownerId, 'cash-added', total);
    return true;
  } }}>{children}</CashRegisterContext.Provider>;
}

/** Same lifecycle as inventory: survives navigation, resets when the owner session changes. */
export function CashRegisterProvider({ children }: { children: ReactNode }) {
  const { deviceSession } = useAuthFlow();
  const ownerId = deviceSession?.owner?.id ?? deviceSession?.id ?? 'guest';
  return <SessionCashRegister key={deviceSession?.id ?? 'signed-out'} ownerId={ownerId}>{children}</SessionCashRegister>;
}

export function useCashRegister() {
  const value = useContext(CashRegisterContext);
  if (!value) throw new Error('Cash register requires CashRegisterProvider.');
  return value;
}
