import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import type { AccountRole, MockAccounts, MockOwnerSession, OwnerIdentity, RegistrationCompletion, RegistrationFormValues } from '@/types/auth';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { authenticateMockOwner } from '@/services/mock-auth';
import { resolveOwnerAccess } from '@/utils/dashboard-access';

const emptyDraft: RegistrationFormValues = {
  name: '', password: '', confirmPassword: '', pin: '', confirmPin: '',
};

type AuthFlow = {
  mockAuthEnabled: boolean;
  mockSession: MockOwnerSession | null;
  owner: OwnerIdentity | null;
  loginMockOwner: (role: AccountRole, id: string, pin: string) => boolean;
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

/** Ephemeral accounts, draft and opt-in mock session; credentials are never stored in session records. */
// TODO(BACKEND): Replace in-memory access/session lifecycle with authenticated
// identity, expiration and logout handling. Route gates are demo capabilities only;
// clear sensitive drafts on completion. See docs/backend-handoff.md#authentication.
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [mockSession, setMockSession] = useState<MockOwnerSession | null>(null);
  const [accounts, setAccounts] = useState<MockAccounts>({ owner: null, cashier: null });
  const [draft, setDraft] = useState(emptyDraft);
  const [registrationPreview, setRegistrationPreview] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [completion, setCompletion] = useState<RegistrationCompletion | null>(null);
  const [dashboardAccess, setDashboardAccess] = useState(false);

  function clear() {
    setMockSession(null);
    setDraft(emptyDraft);
    setRegistrationPreview(false);
    setSelectedRole(null);
    setCompletion(null);
    setDashboardAccess(false);
  }

  function loginMockOwner(role: AccountRole, id: string, pin: string) {
    const session = authenticateMockOwner(role, id, pin);
    if (!session) return false;
    setMockSession(session);
    setSelectedRole('owner');
    setDashboardAccess(true);
    setDraft(emptyDraft);
    return true;
  }
  const owner = resolveOwnerAccess(completion, selectedRole, dashboardAccess, __DEV__, mockSession, MOCK_AUTH_ENABLED);

  return (
    <AuthFlowContext.Provider value={{ mockAuthEnabled: MOCK_AUTH_ENABLED, mockSession, owner, loginMockOwner, accounts, setAccounts, draft, setDraft, registrationPreview, setRegistrationPreview, selectedRole, setSelectedRole, completion, setCompletion, dashboardAccess, setDashboardAccess, clear }}>
      {children}
    </AuthFlowContext.Provider>
  );
}

export function useAuthFlow() {
  const flow = useContext(AuthFlowContext);
  if (!flow) throw new Error('Auth flow must be rendered inside AuthFlowProvider.');
  return flow;
}
