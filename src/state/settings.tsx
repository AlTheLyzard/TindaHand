import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { settingsService } from '@/services/settings';
import type { SettingsService } from '@/types/settings';
import { defaultOperatorPermissions } from '@/utils/operator-access';

const Context = createContext<SettingsService>(settingsService);
// TODO(backend): Provide the authenticated settings service for operator and sync screens.
// - Method/Action: GET / Read settings; POST or PATCH / Manage operators, PINs, and capabilities
// - Expected Input/Payload: Session-derived Owner/operator identity and validated setting changes
// - Expected Response: SettingsSnapshot and SettingsResult-compatible canonical records
// - UI State to Wire: Publish request-backed snapshots and map server errors into settings feedback
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
    operatorPermissions: (operatorId: string) => snapshot.permissionsByOperator.get(operatorId) ?? defaultOperatorPermissions,
  }), [service, snapshot]);
}
