import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AppState } from 'react-native';

import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { authenticationService } from '@/services/authentication';
import type { AccountRole, DeviceSession, MockOwnerSession, OwnerIdentity, RegistrationCompletion, RegistrationFormValues, RememberedIdentities } from '@/types/auth';

const emptyDraft: RegistrationFormValues = {
  name: '', email: '', password: '', confirmPassword: '', pin: '', confirmPin: '',
};

type AuthFlow = {
  mockAuthEnabled: boolean;
  mockSession: MockOwnerSession | null;
  owner: OwnerIdentity | null;
  deviceSession: DeviceSession | null;
  restoring: boolean;
  rememberedIdentities: RememberedIdentities;
  switchAccount: (role: AccountRole) => Promise<void>;
  refreshSession: (showRestoring?: boolean) => Promise<DeviceSession | null>;
  lock: () => Promise<void>;
  loginToastExpiresAt: number | null;
  dismissLoginToast: () => void;
  notifyLogin: () => void;
  draft: RegistrationFormValues;
  setDraft: Dispatch<SetStateAction<RegistrationFormValues>>;
  registrationPreview: boolean;
  setRegistrationPreview: Dispatch<SetStateAction<boolean>>;
  selectedRole: AccountRole | null;
  setSelectedRole: Dispatch<SetStateAction<AccountRole | null>>;
  selectedOwnerId: string | null;
  setSelectedOwnerId: Dispatch<SetStateAction<string | null>>;
  completion: RegistrationCompletion | null;
  setCompletion: Dispatch<SetStateAction<RegistrationCompletion | null>>;
  dashboardAccess: boolean;
  setDashboardAccess: Dispatch<SetStateAction<boolean>>;
  clear: () => void;
};

const AuthFlowContext = createContext<AuthFlow | null>(null);

/** Local mock account directory, identity-only login hints, and ephemeral sessions/drafts. */
// BACKEND INTEGRATION: Replace mock restoration with the agreed secure session
// adapter; server authorization is mandatory. See docs/authentication-handoff.md.
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const profiles = useSyncExternalStore(authenticationService.profile.subscribe, authenticationService.profile.getSnapshot, authenticationService.profile.getSnapshot);
  const [deviceSession, setDeviceSession] = useState<DeviceSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [rememberedIdentities, setRememberedIdentities] = useState<RememberedIdentities>({});
  const [loginToastExpiresAt, setLoginToastExpiresAt] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [registrationPreview, setRegistrationPreview] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [completion, setCompletion] = useState<RegistrationCompletion | null>(null);
  const [dashboardAccess, setDashboardAccess] = useState(false);

  function clear() {
    void authenticationService.logout();
    setDeviceSession(null);
    setLoginToastExpiresAt(null);
    setDraft(emptyDraft);
    setRegistrationPreview(false);
    setSelectedRole(null);
    setSelectedOwnerId(null);
    setCompletion(null);
    setDashboardAccess(false);
  }

  const refreshSession = useCallback(async (showRestoring = false): Promise<DeviceSession | null> => {
    if (showRestoring) setRestoring(true);
    try {
      await authenticationService.ready;
      const [session, identities] = await Promise.all([
        authenticationService.restoreSession(), authenticationService.restoreRememberedIdentities(),
      ]);
      setDeviceSession(session);
      setRememberedIdentities(identities);
      return session;
    }
    catch { setDeviceSession(null); return null; }
    finally { setRestoring(false); }
  }, []);

  async function switchAccount(role: AccountRole) {
    await authenticationService.switchAccount(role);
    setDeviceSession(null);
    setRememberedIdentities(await authenticationService.restoreRememberedIdentities());
    setLoginToastExpiresAt(null);
    setDraft(emptyDraft);
    setSelectedRole(null);
    setSelectedOwnerId(null);
    setRegistrationPreview(false);
    setCompletion(null);
    setDashboardAccess(false);
  }

  async function lock() {
    await authenticationService.lockSession();
    const current = await authenticationService.restoreSession();
    setDeviceSession(current);
    if (current) setDraft(emptyDraft);
  }

  useEffect(() => {
    void Promise.resolve().then(() => refreshSession());
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') void lock();
      else void refreshSession();
    });
    const timer = setInterval(() => { void refreshSession(); }, 15000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [refreshSession]);
  // SECURITY: Navigation gates only. Backend authorization is required for every
  // read/write. Neither registration completion nor a remembered ID grants access.
  const active = deviceSession && !deviceSession.locked;
  const owner: OwnerIdentity | null = active && deviceSession.role === 'owner' ? { ...deviceSession.owner, name: profiles.get(deviceSession.owner.id)?.name ?? deviceSession.owner.name, mode: 'mock' } : null;
  const mockSession: MockOwnerSession | null = owner ? { kind: 'mock', role: 'owner', owner } : null;

  return (
    <AuthFlowContext.Provider value={{ mockAuthEnabled: MOCK_AUTH_ENABLED, mockSession, deviceSession, restoring, rememberedIdentities, switchAccount, refreshSession, lock, loginToastExpiresAt, dismissLoginToast: () => setLoginToastExpiresAt(null), notifyLogin: () => setLoginToastExpiresAt(Date.now() + 15000), owner, draft, setDraft, registrationPreview, setRegistrationPreview, selectedRole, setSelectedRole, selectedOwnerId, setSelectedOwnerId, completion, setCompletion, dashboardAccess, setDashboardAccess, clear }}>
      {children}
    </AuthFlowContext.Provider>
  );
}

export function useAuthFlow() {
  const flow = useContext(AuthFlowContext);
  if (!flow) throw new Error('Auth flow must be rendered inside AuthFlowProvider.');
  return flow;
}