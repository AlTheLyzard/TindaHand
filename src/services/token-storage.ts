import * as SecureStore from 'expo-secure-store';
import { kaheraOfflinePinHashKey, ownerOfflinePinHashKey } from '@/services/auth-storage-keys';

const TOKEN_KEY = 'tindahand_jwt';
const OWNER_NAME_KEY = 'tindahand_owner_name';
const OWNER_ID_KEY = 'tindahand_owner_id';
const ROLE_KEY = 'tindahand_role';
const KAHERA_ID_KEY = 'tindahand_kahera_id';
// Offline-first flags — written once on first successful login, never cleared.
// The Choose Account screen reads these to show cards without any network call.
const HAS_OWNER_KEY = 'tindahand_has_owner';
const HAS_KAHERAS_KEY = 'tindahand_has_kaheras';
// Persisted lock flag — set when the session is locked (screen off / 3-min background timer).
// Cleared on fresh login. Survives a cold restart so the app shows PIN screen, not full login.
const SESSION_LOCKED_KEY = 'tindahand_session_locked';

export async function saveToken(token: string, ownerName: string, ownerId: string, role: 'owner' | 'cashier' = 'owner', kaheraId?: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(OWNER_NAME_KEY, ownerName);
  await SecureStore.setItemAsync(OWNER_ID_KEY, ownerId);
  await SecureStore.setItemAsync(ROLE_KEY, role);
  if (kaheraId) await SecureStore.setItemAsync(KAHERA_ID_KEY, kaheraId);
  else await SecureStore.deleteItemAsync(KAHERA_ID_KEY).catch(() => {});
  // A new login clears the persisted lock flag — the user just authenticated.
  await SecureStore.deleteItemAsync(SESSION_LOCKED_KEY).catch(() => {});
}

export async function getRole(): Promise<'owner' | 'cashier'> {
  const role = await SecureStore.getItemAsync(ROLE_KEY);
  return role === 'cashier' ? 'cashier' : 'owner';
}

export async function getKaheraId(): Promise<string | null> {
  return SecureStore.getItemAsync(KAHERA_ID_KEY);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getOwnerName(): Promise<string | null> {
  return SecureStore.getItemAsync(OWNER_NAME_KEY);
}

export async function getOwnerId(): Promise<string | null> {
  return SecureStore.getItemAsync(OWNER_ID_KEY);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(OWNER_NAME_KEY);
  // Clear the lock flag too — an explicit logout means the user is fully out,
  // so there's nothing to unlock on the next cold restart.
  await SecureStore.deleteItemAsync(SESSION_LOCKED_KEY).catch(() => {});
  // Keep OWNER_ID_KEY, HAS_OWNER_KEY, HAS_KAHERAS_KEY — these are offline-first
  // flags the Choose Account screen reads to show cards without any network call.
  // They are never cleared on logout.
}

/** Call once after a successful owner login. Never cleared — survives logout and JWT expiry. */
export async function markHasOwner(): Promise<void> {
  await SecureStore.setItemAsync(HAS_OWNER_KEY, '1');
}

/** Call once after a successful Kahera login (or after creating a Kahera). Never cleared. */
export async function markHasKaheras(): Promise<void> {
  await SecureStore.setItemAsync(HAS_KAHERAS_KEY, '1');
}

export async function getHasOwner(): Promise<boolean> {
  return (await SecureStore.getItemAsync(HAS_OWNER_KEY)) === '1';
}

export async function getHasKaheras(): Promise<boolean> {
  return (await SecureStore.getItemAsync(HAS_KAHERAS_KEY)) === '1';
}

/** Save the locked state so a cold restart shows PIN screen, not the full login screen. */
export async function saveSessionLocked(): Promise<void> {
  await SecureStore.setItemAsync(SESSION_LOCKED_KEY, '1');
}

/** Returns true if the session was locked when the app last closed. */
export async function getSessionLocked(): Promise<boolean> {
  return (await SecureStore.getItemAsync(SESSION_LOCKED_KEY)) === '1';
}

/** Clear the locked flag — call when the user successfully unlocks with PIN. */
export async function clearSessionLocked(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_LOCKED_KEY).catch(() => {});
}

// ── Offline login cache ──────────────────────────────────────────────────────
// Stores a salted SHA-256 hash of the last successfully authenticated PIN for
// each identity so the app can verify credentials when the network is unavailable.
// All hashes live in the OS keychain (expo-secure-store) and are cleared on
// explicit logout, 5 consecutive wrong PINs, or successful online re-login (re-write).

/** Persist a hashed May-Ari (owner) PIN after a successful online login. */
export async function saveOfflineOwnerPinHash(ownerId: string, hash: string): Promise<void> {
  await SecureStore.setItemAsync(ownerOfflinePinHashKey(ownerId), hash);
}

/** Retrieve the cached May-Ari PIN hash, or null if not present. */
export async function getOfflineOwnerPinHash(ownerId: string): Promise<string | null> {
  return SecureStore.getItemAsync(ownerOfflinePinHashKey(ownerId));
}

/** Remove the cached May-Ari PIN hash (called on explicit logout). */
export async function clearOfflineOwnerPinHash(ownerId: string): Promise<void> {
  await SecureStore.deleteItemAsync(ownerOfflinePinHashKey(ownerId)).catch(() => {});
}

/** Persist a hashed Kahera (cashier) PIN after a successful online login. */
export async function saveOfflineKaheraPinHash(ownerId: string, kaheraId: string, hash: string): Promise<void> {
  await SecureStore.setItemAsync(kaheraOfflinePinHashKey(ownerId, kaheraId), hash);
}

/** Retrieve the cached Kahera PIN hash, or null if not present. */
export async function getOfflineKaheraPinHash(ownerId: string, kaheraId: string): Promise<string | null> {
  return SecureStore.getItemAsync(kaheraOfflinePinHashKey(ownerId, kaheraId));
}

/** Remove the cached Kahera PIN hash (called on explicit logout). */
export async function clearOfflineKaheraPinHash(ownerId: string, kaheraId: string): Promise<void> {
  await SecureStore.deleteItemAsync(kaheraOfflinePinHashKey(ownerId, kaheraId)).catch(() => {});
}