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
export type AccountRole = "owner" | "cashier";
/** Role-scoped Owner IDs only; these values confer no authentication or access. */
export type RememberedIdentities = Partial<Record<AccountRole, string>>;
export type IdentityStorage = {
  read(): string | null;
  write(value: string): void;
};

/** Internal adapter result, not a backend wire schema. */
export type RegisteredOwner = { name: string; id: string };
export type AccountDirectorySnapshot = Readonly<{
  owners: readonly RegisteredOwner[];
  hasOperators: boolean;
}>;
export type LocalRecordStorage = {
  read(key: string): string | null;
  write(key: string, value: string): void;
};
export type AuthSecretStorage = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};
export type MockOwnerSession = { kind: 'mock'; role: 'owner'; owner: RegisteredOwner };
export type OwnerIdentity = RegisteredOwner & { mode: 'confirmed' | 'preview' | 'mock' | 'offline-grace' };
export type RegistrationResult =
  | { status: "confirmed"; account: RegisteredOwner }
  | { status: "error"; message: string; fields?: RegistrationErrors };
export type RegistrationService = (
  values: RegistrationFormValues,
) => Promise<RegistrationResult>;
export type RegistrationCompletion = RegisteredOwner & {
  mode: "confirmed" | "preview";
  toastExpiresAt: number | null;
};

/** Proposed adapter contracts; no HTTP schema has been agreed. Secrets are request-only. */
export type AuthFailure = {
  ok: false;
  code: "unavailable" | "invalid" | "expired" | "used" | "missing" | "limited";
  message: string;
};
export type AuthResult<T> = { ok: true; value: T } | AuthFailure;
export type OperatorPermission =
  | "pos"
  | "inventory-edit"
  | "restock"
  | "assets-read"
  | "receivables"
  | "transactions"
  | "profile"
  | "settings";
export type DeviceSession = {
  kind: "mock";
  id: string;
  owner: RegisteredOwner;
  expiresAt: number;
  locked: boolean;
} & (
  | { role: "owner" }
  | {
      role: "operator";
      ownerId: string;
      operatorId: string;
      displayName: string;
      /** Keep the existing permission and profile consumers on the same service identity. */
      operator: {
        id: string;
        name: string;
        permissions: readonly OperatorPermission[];
      };
    }
);
export type RecoveryReceipt = { resendAt: number };
export interface AuthenticationService {
  readonly profile: import("./profile").ProfileService;
  readonly ready: Promise<void>;
  subscribeAccountDirectory(listener: () => void): () => void;
  getAccountDirectorySnapshot(): AccountDirectorySnapshot;
  seedRealOwner(owner: RegisteredOwner): void;
  registerOwner: RegistrationService;
  authenticateOwner(input: {
    ownerId: string;
    password: string;
  }): Promise<AuthResult<DeviceSession>>;
  unlockOwner(input: {
    ownerId: string;
    pin: string;
  }): Promise<AuthResult<DeviceSession>>;
  loginOperator(input: {
    ownerId: string;
    pin: string;
  }): Promise<AuthResult<DeviceSession>>;
  createOperator(
    input: import("./settings").CashierValues,
  ): Promise<import("./settings").SettingsResult<import("./settings").Cashier>>;
  resetOperatorPin(
    input: import("./settings").PinValues & { operatorId: string },
  ): Promise<import("./settings").SettingsResult<import("./settings").Cashier>>;
  setOperatorActive(input: {
    operatorId: string;
    active: boolean;
  }): Promise<
    import("./settings").SettingsResult<import("./settings").Cashier>
  >;
  updateOperatorProfile(
    input: import("./settings").OperatorProfileValues,
  ): Promise<import("./settings").SettingsResult<import("./settings").Cashier>>;
  setOperatorPermission(input: {
    operatorId: string;
    group: import("@/utils/operator-access").PermissionGroup;
    allowed: boolean;
  }): Promise<
    import("./settings").SettingsResult<readonly OperatorPermission[]>
  >;
  restoreSession(): Promise<DeviceSession | null>;
  restoreRememberedIdentities(): Promise<RememberedIdentities>;
  switchAccount(role: AccountRole): Promise<void>;
  lockSession(): Promise<void>;
  logout(): Promise<void>;
  requestPinRecovery(input: {
    email: string;
  }): Promise<AuthResult<RecoveryReceipt>>;
  verifyRecoveryToken(input: {
    token: string;
  }): Promise<AuthResult<{ expiresAt: number }>>;
  resetOwnerPin(input: {
    token: string;
    pin: string;
  }): Promise<AuthResult<undefined>>;
}
