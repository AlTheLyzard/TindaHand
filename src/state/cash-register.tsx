import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useAuthFlow } from '@/state/auth-flow';
import { createCashRegisterService } from '@/services/cash-register';

const CashRegisterContext = createContext<{
  addedCentavos: number; begin: () => number; add: (token: number, value: string) => Promise<boolean>;
} | null>(null);

function SessionCashRegister({ children }: { children: ReactNode }) {
  const { owner } = useAuthFlow();
  const [store] = useState(createCashRegisterService);
  const current = useRef(store);
  const [addedCentavos, setAddedCentavos] = useState(0);
  return <CashRegisterContext.Provider value={{ addedCentavos, begin: () => current.current.begin(), async add(token, value) {
    const total = await current.current.add(owner, token, value);
    if (total === null) return false;
    // Publish the confirmed mock adjustment total through the existing Dashboard
    // projection. A backend cash snapshot must replace this together with the service.
    setAddedCentavos(total);
    return true;
  } }}>{children}</CashRegisterContext.Provider>;
}

/** Same lifecycle as inventory: survives navigation, resets when the owner session changes. */
export function CashRegisterProvider({ children }: { children: ReactNode }) {
  const { deviceSession } = useAuthFlow();
  return <SessionCashRegister key={deviceSession?.id ?? 'signed-out'}>{children}</SessionCashRegister>;
}

export function useCashRegister() {
  const value = useContext(CashRegisterContext);
  if (!value) throw new Error('Cash register requires CashRegisterProvider.');
  return value;
}
