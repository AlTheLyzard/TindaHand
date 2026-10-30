/** Local form values only; no backend registration contract exists yet. */
export type RegistrationFormValues = {
  name: string;
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
export type MockAccounts = { owner: RegisteredOwner | null; cashier: { id: string; name: string } | null };
export type RegistrationResult =
  | { status: 'confirmed'; account: RegisteredOwner }
  | { status: 'error'; message: string; fields?: RegistrationErrors };
export type RegistrationService = (values: RegistrationFormValues) => Promise<RegistrationResult>;
export type RegistrationCompletion = RegisteredOwner & {
  mode: 'confirmed' | 'preview';
  toastExpiresAt: number | null;
};
