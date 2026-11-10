/** Local form values only; no backend registration contract exists yet. */
export type RegistrationFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  pin: string;
  confirmPin: string;
};

export type RegistrationField = keyof RegistrationFormValues;
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;

/** Login role selection does not change the May-Ari registration type. */
export type AccountRole = 'owner' | 'cashier';

/** Internal adapter result, not a backend wire schema. */
export type RegisteredOwner = { name: string; id: string };
export type MockOwnerSession = { kind: 'mock'; role: 'owner'; owner: RegisteredOwner };
export type OwnerIdentity = RegisteredOwner & { mode: 'confirmed' | 'preview' | 'mock' };
/** Ephemeral demo records; no credentials or authenticated session. */
export type MockAccounts = { owner: RegisteredOwner | null };
export type RegistrationResult =
  | { status: 'confirmed'; account: RegisteredOwner }
  | { status: 'error'; message: string; fields?: RegistrationErrors };
export type RegistrationService = (values: RegistrationFormValues) => Promise<RegistrationResult>;
export type RegistrationCompletion = RegisteredOwner & {
  mode: 'confirmed' | 'preview';
  toastExpiresAt: number | null;
};

/** Proposed adapter contracts; no HTTP schema has been agreed. Secrets are request-only. */
export type AuthFailure = { ok: false; code: 'unavailable' | 'invalid' | 'expired' | 'used' | 'missing' | 'limited'; message: string };
export type AuthResult<T> = { ok: true; value: T } | AuthFailure;
export type OperatorPermission = 'pos' | 'inventory-edit' | 'restock' | 'assets-read' | 'receivables' | 'transactions' | 'profile' | 'settings';
export type DeviceSession = {
  kind: 'mock'; id: string; owner: RegisteredOwner; expiresAt: number; locked: boolean;
} & ({ role: 'owner' } | { role: 'cashier'; operator: { id: string; name: string; permissions: readonly OperatorPermission[] } });
export type RecoveryReceipt = { resendAt: number };
export interface AuthenticationService {
  registerOwner: RegistrationService;
  authenticateOwner(input: { ownerId: string; password: string }): Promise<AuthResult<DeviceSession>>;
  unlockOwner(input: { ownerId: string; pin: string }): Promise<AuthResult<DeviceSession>>;
  loginOperator(input: { ownerId: string; pin: string }): Promise<AuthResult<DeviceSession>>;
  createOperator(input: import('./settings').CashierValues): Promise<import('./settings').SettingsResult<import('./settings').Cashier>>;
  resetOperatorPin(input: import('./settings').PinValues & { operatorId: string }): Promise<import('./settings').SettingsResult<import('./settings').Cashier>>;
  setOperatorActive(input: { operatorId: string; active: boolean }): Promise<import('./settings').SettingsResult<import('./settings').Cashier>>;
  restoreSession(): Promise<DeviceSession | null>;
  lockSession(): Promise<void>;
  logout(): Promise<void>;
  requestPinRecovery(input: { email: string }): Promise<AuthResult<RecoveryReceipt>>;
  verifyRecoveryToken(input: { token: string }): Promise<AuthResult<{ expiresAt: number }>>;
  resetOwnerPin(input: { token: string; pin: string }): Promise<AuthResult<undefined>>;
}
