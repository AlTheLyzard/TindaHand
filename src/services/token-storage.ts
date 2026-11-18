import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'tindahand_jwt';
const OWNER_NAME_KEY = 'tindahand_owner_name';
const OWNER_ID_KEY = 'tindahand_owner_id';
const ROLE_KEY = 'tindahand_role';
const KAHERA_ID_KEY = 'tindahand_kahera_id';

export async function saveToken(token: string, ownerName: string, ownerId: string, role: 'owner' | 'cashier' = 'owner', kaheraId?: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(OWNER_NAME_KEY, ownerName);
  await SecureStore.setItemAsync(OWNER_ID_KEY, ownerId);
  await SecureStore.setItemAsync(ROLE_KEY, role);
  if (kaheraId) await SecureStore.setItemAsync(KAHERA_ID_KEY, kaheraId);
  else await SecureStore.deleteItemAsync(KAHERA_ID_KEY).catch(() => {});
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
  // Keep OWNER_ID_KEY — the Choose Account screen needs it to show the
  // May-Ari and Kahera cards even after logout and after the JWT expires.
}