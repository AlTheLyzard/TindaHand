/**
 * Shared fetch helper for all backend service calls.
 * Automatically attaches the stored JWT and the base API URL.
 * Usage:
 *   const data = await apiFetch('/dashboard');
 *   await apiFetch('/expenses', { method: 'POST', body: JSON.stringify(payload) });
 */

import { getToken } from '@/services/token-storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://tindahand-production.up.railway.app';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch { /* ignore parse errors */ }
    throw new ApiError(res.status, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
