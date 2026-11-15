import type { AuthSecretStorage } from '@/types/auth';

// Do not persist mock credentials in browser localStorage. Native apps use SecureStore.
const secrets = new Map<string, string>();

export const authSecretStorage: AuthSecretStorage = {
  async read(key) { return secrets.get(key) ?? null; },
  async write(key, value) { secrets.set(key, value); },
  async remove(key) { secrets.delete(key); },
};
