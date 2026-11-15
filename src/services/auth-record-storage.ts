import { File, Paths } from 'expo-file-system';
import type { LocalRecordStorage } from '@/types/auth';

/** Non-secret Owner and Operator records for the opt-in local development mock. */
export const authRecordStorage: LocalRecordStorage = {
  read(key) {
    const file = new File(Paths.document, `${key}.json`);
    return file.exists ? file.textSync() : null;
  },
  write(key, value) {
    new File(Paths.document, `${key}.json`).writeSync(value);
  },
};
