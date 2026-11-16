import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'tindahand_jwt';
const OWNER_NAME_KEY = 'tindahand_owner_name';
const OWNER_ID_KEY = 'tindahand_owner_id';

export async function saveToken(token: string, ownerName: string, ownerId: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(OWNER_NAME_KEY, ownerName);
  await SecureStore.setItemAsync(OWNER_ID_KEY, ownerId);
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
  await SecureStore.deleteItemAsync(OWNER_ID_KEY);
}