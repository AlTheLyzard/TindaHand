import {
  applyInventoryAction,
  applyOperatorPosAction,
  getProducts,
  getAssets,
  loadMockInventory,
} from '@/services/inventory';
import { loadJson, persistJson } from '@/services/local-persist';
import type { BusinessAsset } from '@/types/inventory';
import { useAuthFlow } from '@/state/auth-flow';
import type { InventoryProduct } from '@/types/inventory';
import type { Customer, LocalSale } from '@/types/pos';
import { inventoryReducer, type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { customerNameKey } from '@/utils/pos-checkout';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const InventoryContext = createContext<{ store: InventoryStore; getStore: () => InventoryStore; dispatch: (action: InventoryAction) => boolean; ensureCustomer: (name: string, id: string) => Customer | null; feedback: string; setFeedback: (message: string) => void; refetchProducts: () => Promise<void>; refetchAssets: () => Promise<void> } | null>(null);

type ApiProductBatch = { id: string; quantity: number; noExpiry: boolean; expirationDate: string | null };

/** Map API product shape to the local InventoryProduct type. */
function mapApiProduct(p: ReturnType<typeof Object.assign> & { id: string; name: string; category: string; unitPriceCentavos: number; costCentavos: number; stock: number; expirationDate: string | null; photoUri: string | null; batches?: ApiProductBatch[] | null }): InventoryProduct {
  return {
    id: p.id,
    name: p.name,
    category: p.category as InventoryProduct['category'],
    unitPriceCentavos: p.unitPriceCentavos,
    costCentavos: p.costCentavos,
    stock: p.stock,
    expirationDate: p.expirationDate ?? '',
    photoUri: p.photoUri ?? undefined,
    batches: p.batches?.map((b: ApiProductBatch) => b.noExpiry
      ? { id: b.id, quantity: b.quantity, noExpiry: true as const, expirationDate: null }
      : { id: b.id, quantity: b.quantity, noExpiry: false as const, expirationDate: b.expirationDate ?? '' }),
  };
}

function SessionInventory({ children, ownerId }: { children: ReactNode; ownerId: string }) {
  const auth = useAuthFlow();
  const [store, setStore] = useState<InventoryStore>(() => loadMockInventory());
  const current = useRef(store);

  // Hydrate persisted POS sales on mount (runs once per session).
  useEffect(() => {
    loadJson<LocalSale[]>(ownerId, 'pos-sales').then(saved => {
      if (!saved?.length) return;
      setStore(previous => {
        const existing = new Set((previous.pos?.sales ?? []).map(s => s.id));
        const incoming = saved.filter(s => !existing.has(s.id));
        if (!incoming.length) return previous;
        const next: InventoryStore = {
          ...previous,
          pos: { ...(previous.pos ?? { customers: [], debts: [] }), sales: [...incoming, ...(previous.pos?.sales ?? [])] },
        };
        current.current = next;
        return next;
      });
    }).catch(() => { /* non-fatal */ });
  // Run once on mount — ownerId is stable for this session instance.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Fetch products from the API and replace the store's product list with the result. */
  const refetchProducts = useCallback(async () => {
    if (!auth.deviceSession || auth.deviceSession.locked) return;
    try {
      const apiProducts = await getProducts();
      // Trust the API's answer — even an empty array means "this store has no
      // products yet", so replace mock data with the real (empty) list.
      // We only keep existing data if the call throws (offline / server error).
      const realProducts: InventoryProduct[] = apiProducts.map(mapApiProduct);
      setStore(previous => {
        const next = { ...previous, products: realProducts };
        current.current = next;
        return next;
      });
    } catch {
      // Offline or server error — keep whatever is already in state.
    }
  }, [auth.deviceSession]);

  /** Fetch assets from the API and replace the store's asset list with the result. */
  const refetchAssets = useCallback(async () => {
    if (!auth.deviceSession || auth.deviceSession.locked) return;
    try {
      const apiAssets = await getAssets();
      const realAssets: BusinessAsset[] = apiAssets.map(a => ({
        id: a.id,
        name: a.name,
        classification: a.classification as BusinessAsset['classification'],
        valueCentavos: a.valueCentavos,
        usefulLifeYears: a.usefulLifeYears,
        recordedDate: a.recordedDate,
      }));
      setStore(previous => {
        const next = { ...previous, assets: realAssets };
        current.current = next;
        return next;
      });
    } catch {
      // Offline or server error — keep existing seed/state.
    }
  }, [auth.deviceSession]);

  // Try to load real products and assets from the API on session start.
  // The store always starts with mock data (loadMockInventory), so if the API
  // is unreachable or returns an error, the mock data remains visible.
  // On success, real data replaces the mock so the app uses real IDs.
  useEffect(() => {
    // Only fetch when there's an active authenticated session (owner or kahera).
    if (!auth.deviceSession || auth.deviceSession.locked) return;
    let cancelled = false;
    getProducts().then(apiProducts => {
      if (cancelled) return;
      const realProducts: InventoryProduct[] = apiProducts.map(mapApiProduct);
      setStore(previous => {
        const next = { ...previous, products: realProducts };
        current.current = next;
        return next;
      });
    }).catch(() => {
      // Offline or server error — keep whatever is already in state.
    });
    getAssets().then(apiAssets => {
      if (cancelled) return;
      const realAssets: BusinessAsset[] = apiAssets.map(a => ({
        id: a.id,
        name: a.name,
        classification: a.classification as BusinessAsset['classification'],
        valueCentavos: a.valueCentavos,
        usefulLifeYears: a.usefulLifeYears,
        recordedDate: a.recordedDate,
      }));
      setStore(previous => {
        const next = { ...previous, assets: realAssets };
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
    let next = current.current;
    if (auth.owner) next = applyInventoryAction(current.current, auth.owner, action);
    else if (auth.deviceSession?.role === 'operator') {
      if (action.type === 'completeSale') next = applyOperatorPosAction(current.current, auth.deviceSession, action);
      // Operators (Kahera) can restock and save products. applyInventoryAction requires
      // a non-null owner identity for its owner-id guard, which operators don't have.
      // Call inventoryReducer directly — the backend already enforces authorization.
      else if (action.type === 'saveProduct' || action.type === 'restock') next = inventoryReducer(current.current, action);
    }
    if (next === current.current) return false;
    current.current = next;
    setStore(next);
    // Persist sales after every completed checkout so they survive reload.
    if (action.type === 'completeSale' && next.pos?.sales.length) {
      void persistJson(ownerId, 'pos-sales', next.pos.sales);
    }
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
  return <InventoryContext.Provider value={{ store, getStore: () => current.current, dispatch, ensureCustomer, feedback, setFeedback, refetchProducts, refetchAssets }}>{children}</InventoryContext.Provider>;
}
export function InventoryProvider({ children }: { children: ReactNode }) {
  const { deviceSession } = useAuthFlow();
  const ownerId = deviceSession?.owner?.id ?? deviceSession?.id ?? 'guest';
  // Locking retains this session's demo state; full logout/removal clears it.
  return <SessionInventory key={deviceSession?.id ?? 'signed-out'} ownerId={ownerId}>{children}</SessionInventory>;
}
export function useInventory() {
  const value = useContext(InventoryContext);
  if (!value) throw new Error('Inventory requires InventoryProvider.');
  return value;
}
