import type { LocalRecordStorage } from '@/types/auth';

const records = new Map<string, string>();

/** Browser preview records stay in memory; native targets use the app document directory. */
export const authRecordStorage: LocalRecordStorage = {
  read(key) { return records.get(key) ?? null; },
  write(key, value) { records.set(key, value); },
};
