import * as SecureStore from 'expo-secure-store';
import type { AuthSecretStorage } from '@/types/auth';

/** PINs and passwords belong in the platform's encrypted credential store. */
export const authSecretStorage: AuthSecretStorage = {
  read: key => SecureStore.getItemAsync(key),
  write: (key, value) => SecureStore.setItemAsync(key, value),
  remove: key => SecureStore.deleteItemAsync(key),
};
