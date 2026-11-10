import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { settingsService } from '@/services/settings';
import type { SettingsService } from '@/types/settings';

const Context = createContext<SettingsService>(settingsService);
/** Replace the adapter here when an authenticated backend contract is approved. */
export function SettingsProvider({ children, service = settingsService }: { children: ReactNode; service?: SettingsService }) {
  return <Context.Provider value={service}>{children}</Context.Provider>;
}
export function useSettings() {
  const service = useContext(Context);
  const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot, service.getSnapshot);
  // Read from an immutable snapshot so retained screens and React Compiler see changes.
  return useMemo(() => ({
    ...service,
    cashiers: (ownerId: string) => snapshot.cashiers.filter(item => item.ownerId === ownerId),
    syncState: (ownerId: string) => snapshot.syncByOwner.get(ownerId) ?? snapshot.defaultSync,
  }), [service, snapshot]);
}
