import type { IdentityStorage } from '@/types/auth';

const key = 'tindahand.remembered-login-identities';
/** Web preview equivalent of the native identity-only file. */
export const authIdentityStorage: IdentityStorage = {
  read: () => typeof window === 'undefined' ? null : window.localStorage.getItem(key),
  write: value => { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); },
};
