/**
 * Calls POST /auth/reauth with email + password and returns the new JWT.
 * This call bypasses the global 401 intercept in apiFetch because we
 * construct the request manually — an expired token isn't sent here.
 */

import { API_URL, ApiError } from '@/services/api';

export interface ReauthPayload {
  email: string;
  password: string;
}

export async function postReauth(payload: ReauthPayload): Promise<{ access_token: string; full_name: string }> {
  const res = await fetch(`${API_URL}/auth/reauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });

  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.detail) detail = body.detail;
    if (res.ok) return body as { access_token: string; full_name: string };
  } catch { /* ignore parse errors */ }

  throw new ApiError(res.status, detail);
}
