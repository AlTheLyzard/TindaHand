/**
 * Shared fetch helper for all backend service calls.
 * Automatically attaches the stored JWT and the base API URL.
 * Usage:
 *   const data = await apiFetch('/dashboard');
 *   await apiFetch('/expenses', { method: 'POST', body: JSON.stringify(payload) });
 */

import { getToken } from '@/services/token-storage';
import { emit401 } from '@/services/reauth-event';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://tindahand-production.up.railway.app';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Default request timeout in milliseconds. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Returns an AbortSignal that fires after `ms` milliseconds.
 * Use this for raw fetch() calls that don't go through apiFetch().
 */
export function timeoutSignal(ms = REQUEST_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers, signal: controller.signal });
  } catch (err) {
    // AbortError means we timed out; re-throw as a recognisable network error
    // so callers can show "slow connection" rather than a generic failure.
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out. Your connection may be slow — please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch { /* ignore parse errors */ }
    // Fire the global 401 signal so the re-auth modal can intercept.
    // We still throw so the original caller knows the request failed.
    if (res.status === 401) emit401();
    throw new ApiError(res.status, detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
