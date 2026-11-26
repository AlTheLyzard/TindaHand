import { API_URL, timeoutSignal } from '@/services/api';

/** Shape returned by GET /auth/me */
interface MeApiResponse {
  id: string;             // e.g. "TH-MA-0001"
  name: string;           // first name / display name
  role: string;           // "owner" | "cashier"
  permissions?: string[]; // cashier only — the capabilities May-Ari has enabled
  store_name?: string;    // cashier only — the owner's store name
}

/** What fetchMe exposes.
 *  - id:          the numeric DB id as a string (e.g. "1"), so callers that do
 *                 `TH-MA-${String(me.id).padStart(4,'0')}` produce the right value.
 *  - formatted_id: the full formatted ID from the server (e.g. "TH-MA-0001").
 *  - name / full_name: both set to the display name returned by the API.
 *  - permissions: cashier only — live permissions list from the server.
 */
export interface MeResult {
  id: string;           // numeric DB id as string
  formatted_id: string; // e.g. "TH-MA-0001"
  name: string;
  full_name: string;    // alias for name; kept for backward-compat with existing callers
  role: string;
  permissions?: string[];
  storeName?: string;
}

export async function fetchMe(token: string): Promise<MeResult | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
      signal: timeoutSignal(),
    });
    if (!res.ok) return null;
    const data: MeApiResponse = await res.json();
    // Extract numeric id from "TH-MA-0001" or "TH-KH-0001" → "1"
    const numericId = String(parseInt(data.id.split('-').pop() ?? '0', 10));
    return {
      id: numericId,
      formatted_id: data.id,
      name: data.name,
      full_name: data.name,
      role: data.role,
      permissions: data.permissions,
      storeName: data.store_name,
    };
  } catch {
    return null;
  }
}