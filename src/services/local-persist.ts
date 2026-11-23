/**
 * Lightweight persistence for local transaction data using expo-file-system.
 *
 * Data is keyed by ownerId so different owners never mix records.
 * Each write is a full replacement of that owner's file — fine for the
 * volume of records a sari-sari store accumulates in a session.
 *
 * TODO(backend): Remove this module once the backend provides persistent
 * transaction storage. All callers are behind feature-flag guards that
 * prefer server data when available.
 */

import * as FileSystem from 'expo-file-system';

const DIR = `${FileSystem.documentDirectory}tindahand-local/`;

function path(ownerId: string, key: string) {
  // Sanitise ownerId so it's safe as a filename component.
  const safe = ownerId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${DIR}${safe}_${key}.json`;
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

export async function persistJson<T>(ownerId: string, key: string, value: T): Promise<void> {
  try {
    await ensureDir();
    await FileSystem.writeAsStringAsync(path(ownerId, key), JSON.stringify(value), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    // Persistence failure is non-fatal — in-memory state stays correct.
  }
}

export async function loadJson<T>(ownerId: string, key: string): Promise<T | null> {
  try {
    const info = await FileSystem.getInfoAsync(path(ownerId, key));
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path(ownerId, key), {
      encoding: FileSystem.EncodingType.UTF8,
    });
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearPersistedData(ownerId: string): Promise<void> {
  try {
    for (const key of ['pos-sales', 'quick-add-records', 'payable-payments', 'cash-added']) {
      const file = path(ownerId, key);
      const info = await FileSystem.getInfoAsync(file);
      if (info.exists) await FileSystem.deleteAsync(file, { idempotent: true });
    }
  } catch {
    // Best-effort cleanup.
  }
}
