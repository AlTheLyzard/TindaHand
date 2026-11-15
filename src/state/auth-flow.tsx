import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AppState } from 'react-native';

import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { authenticationService } from '@/services/authentication';
import type { AccountRole, DeviceSession, MockAccounts, MockOwnerSession, OwnerIdentity, RegistrationCompletion, RegistrationFormValues } from '@/types/auth';

const emptyDraft: RegistrationFormValues = {
  name: '', email: '', password: '', confirmPassword: '', pin: '', confirmPin: '',
};

type AuthFlow = {
  mockAuthEnabled: boolean;
  mockSession: MockOwnerSession | null;
  owner: OwnerIdentity | null;
  deviceSession: DeviceSession | null;
  restoring: boolean;
  refreshSession: () => Promise<void>;
  lock: () => Promise<void>;
  loginToastExpiresAt: number | null;
  dismissLoginToast: () => void;
  notifyLogin: () => void;
  accounts: MockAccounts;
  setAccounts: Dispatch<SetStateAction<MockAccounts>>;
  draft: RegistrationFormValues;
  setDraft: Dispatch<SetStateAction<RegistrationFormValues>>;
  registrationPreview: boolean;
  setRegistrationPreview: Dispatch<SetStateAction<boolean>>;
  selectedRole: AccountRole | null;
  setSelectedRole: Dispatch<SetStateAction<AccountRole | null>>;
  completion: RegistrationCompletion | null;
  setCompletion: Dispatch<SetStateAction<RegistrationCompletion | null>>;
  dashboardAccess: boolean;
  setDashboardAccess: Dispatch<SetStateAction<boolean>>;
  clear: () => void;
};

const AuthFlowContext = createContext<AuthFlow | null>(null);

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [deviceSession, setDeviceSession] = useState<DeviceSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [loginToastExpiresAt, setLoginToastExpiresAt] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<MockAccounts>({ owner: null });
  const [draft, setDraft] = useState(emptyDraft);
  const [registrationPreview, setRegistrationPreview] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [completion, setCompletion] = useState<RegistrationCompletion | null>(null);
  const [dashboardAccess, setDashboardAccess] = useState(false);

  function clear() {
    void authenticationService.logout();
    setDeviceSession(null);
    setLoginToastExpiresAt(null);
    setDraft(emptyDraft);
    setRegistrationPreview(false);
    setSelectedRole(null);
    setCompletion(null);
    setDashboardAccess(false);
  }

  async function refreshSession() {
    try { setDeviceSession(await authenticationService.restoreSession()); }
    catch { setDeviceSession(null); }
    finally { setRestoring(false); }
  }

  async function lock() {
    await authenticationService.lockSession();
    const current = await authenticationService.restoreSession();
    setDeviceSession(current);
    if (current) setDraft(emptyDraft);
  }

  useEffect(() => {
    void authenticationService.restoreSession().then(session => { setDeviceSession(session); setRestoring(false); }).catch(() => { setDeviceSession(null); setRestoring(false); });
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') void lock();
      else void refreshSession();
    });
    const timer = setInterval(() => { void refreshSession(); }, 15000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);

  const active = deviceSession && !deviceSession.locked;
  const owner: OwnerIdentity | null = active && deviceSession.role === 'owner' ? { ...deviceSession.owner, mode: 'mock' } : null;
  const mockSession: MockOwnerSession | null = owner ? { kind: 'mock', role: 'owner', owner } : null;

  return (
    <AuthFlowContext.Provider value={{ mockAuthEnabled: MOCK_AUTH_ENABLED, mockSession, deviceSession, restoring, refreshSession, lock, loginToastExpiresAt, dismissLoginToast: () => setLoginToastExpiresAt(null), notifyLogin: () => setLoginToastExpiresAt(Date.now() + 15000), owner, accounts, setAccounts, draft, setDraft, registrationPreview, setRegistrationPreview, selectedRole, setSelectedRole, completion, setCompletion, dashboardAccess, setDashboardAccess, clear }}>
      {children}
    </AuthFlowContext.Provider>
  );
}

export function useAuthFlow() {
  const flow = useContext(AuthFlowContext);
  if (!flow) throw new Error('Auth flow must be rendered inside AuthFlowProvider.');
  return flow;
}