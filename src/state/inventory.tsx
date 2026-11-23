import {
  applyInventoryAction,
  applyOperatorPosAction,
  getProducts,
  getAssets,
  loadMockInventory,
} from '@/services/inventory';
import { getCustomers } from '@/services/pos';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { loadJson, persistJson } from '@/services/local-persist';
import type { BusinessAsset } from '@/types/inventory';
import { useAuthFlow } from '@/state/auth-flow';
import type { InventoryProduct } from '@/types/inventory';
import type { Customer, LocalSale } from '@/types/pos';
import { inventoryReducer, type InventoryAction, type InventoryStore } from '@/utils/inventory';
import { customerNameKey, emptyPosLedger } from '@/utils/pos-checkout';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const InventoryContext = createContext<{ store: InventoryStore; getStore: () => InventoryStore; dispatch: (action: InventoryAction) => boolean; ensureCustomer: (name: string, id: string) => Customer | null; feedback: string; setFeedback: (message: string) => void; refetchProducts: () => Promise<void>; refetchAssets: () => Promise<void> } | null>(null);

type ApiProductBatch = { id: string; quantity: number; noExpiry: boolean; expirationDate: string | null };

/** Map API product shape to the local InventoryProduct type. */
function mapApiProduct(p: ReturnType<typeof Object.assign> & { id: string; name: string; category: string; unitPriceCentavos: number; costCentavos: number; stock: number; expirationDate: string | null; photoUri: string | null; batches?: ApiProductBatch[] | null }): InventoryProduct {
  const batches = p.batches?.map((b: ApiProductBatch) => b.noExpiry
    ? { id: b.id, quantity: b.quantity, noExpiry: true as const, expirationDate: null }
    : { id: b.id, quantity: b.quantity, noExpiry: false as const, expirationDate: b.expirationDate ?? '' });

  // When the backend returns batches, derive stock from their sum so the POS
  // and inventory screens always agree. The backend's top-level `stock` field
  // may lag behind (e.g. 0) while the batch quantities already reflect the
  // correct count — using the batch sum as the canonical figure fixes the
  // "Out of Stock in POS but 23 PCS in Inventory" mismatch.
  const stock = batches && batches.length > 0
    ? batches.reduce((sum, b) => sum + b.quantity, 0)
    : p.stock;

  return {
    id: p.id,
    name: p.name,
    category: p.category as InventoryProduct['category'],
    unitPriceCentavos: p.unitPriceCentavos,
    costCentavos: p.costCentavos,
    stock,
    expirationDate: p.expirationDate ?? '',
    photoUri: p.photoUri ?? undefined,
    batches,
  };
}

function SessionInventory({ children, ownerId }: { children: ReactNode; ownerId: string }) {
  const auth = useAuthFlow();
  // Real backend: start with an empty customer list so no mock names appear in the
  // partial-payment customer picker. Customers are populated from the backend on
  // session start and registered locally as new names are entered.
  const [store, setStore] = useState<InventoryStore>(() => {
    const base = loadMockInventory();
    if (!MOCK_AUTH_ENABLED && base.pos) {
      return { ...base, pos: { ...base.pos, customers: [] } };
    }
    return base;
  });
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

  /** Fetch products from the API and replace the store's product list with the result.
   *
   * When using the real backend, we merge remote stock with local stock by keeping
   * the lower value for each product — this preserves optimistic deductions from local
   * sales that the backend's products endpoint may not yet reflect (e.g. if /inventory/products
   * caches stock counts separately from the checkout endpoint). This means a restock that
   * the backend records will still appear, but a just-sold product won't have its stock
   * silently bumped back up by the next focus-triggered refetch.
   */
  const refetchProducts = useCallback(async () => {
    if (!auth.deviceSession || auth.deviceSession.locked) return;
    try {
      const apiProducts = await getProducts();
      // Trust the API's answer — even an empty array means "this store has no
      // products yet", so replace mock data with the real (empty) list.
      // We only keep existing data if the call throws (offline / server error).
      const realProducts: InventoryProduct[] = apiProducts.map(mapApiProduct);
      setStore(previous => {
        // Build a lookup of current local stock per product so we can keep
        // the lower of (local, remote) — preserving any optimistic deductions
        // that the backend products list hasn't caught up with yet.
        const localStock = new Map(previous.products.map(p => [p.id, p.stock]));
        const localProducts = new Map(previous.products.map(p => [p.id, p]));
        const merged = realProducts.map(p => {
          const localProduct = localProducts.get(p.id);
          if (!MOCK_AUTH_ENABLED && localProduct !== undefined && localProduct.stock < p.stock) {
            // Local has a lower count — a sale was made that the backend products
            // endpoint hasn't caught up with yet. Keep the local product's stock
            // AND its batches so both POS (uses stock) and Inventory (sums batches)
            // show the same deducted quantity.
            return { ...p, stock: localProduct.stock, batches: localProduct.batches };
          }
          return p;
        });
        const next = { ...previous, products: merged };
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

  // Try to load real products, assets, and (when using the real backend) customers
  // from the API on session start. The store always starts with mock data
  // (loadMockInventory), so if the API is unreachable or returns an error the mock
  // data remains visible. On success, real data replaces the mock.
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
    // Real backend only: seed the POS customer picker with the store's real customers
    // so existing names appear as suggestions in partial payment.
    if (!MOCK_AUTH_ENABLED) {
      getCustomers().then(apiCustomers => {
        if (cancelled) return;
        setStore(previous => {
          const ledger = previous.pos ?? emptyPosLedger();
          // Merge: keep any locally-registered customers (from this session's sales)
          // that aren't already in the backend list.
          const remoteIds = new Set(apiCustomers.map(c => c.id));
          const localOnly = ledger.customers.filter(c => !remoteIds.has(c.id));
          const merged = [...apiCustomers, ...localOnly];
          const next = { ...previous, pos: { ...ledger, customers: merged } };
          current.current = next;
          return next;
        });
      }).catch(() => {
        // Not critical — the picker will just show no prior customers.
      });
    }
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
