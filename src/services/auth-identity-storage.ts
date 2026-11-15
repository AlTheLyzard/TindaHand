import { File, Paths } from 'expo-file-system';
import type { IdentityStorage } from '@/types/auth';

/** Non-secret login convenience only. Never store a PIN, password or session here. */
export const authIdentityStorage: IdentityStorage = {
  read() {
    const file = new File(Paths.document, 'remembered-login-identities.json');
    return file.exists ? file.textSync() : null;
  },
  write(value) {
    const file = new File(Paths.document, 'remembered-login-identities.json');
    file.writeSync(value);
  },
};
