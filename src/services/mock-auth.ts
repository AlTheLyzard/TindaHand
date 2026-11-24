import { MOCK_AUTH_ENABLED } from "@/config/mock-auth";
import { demoOwner } from "@/data/mock-auth";
import { settingsService } from "@/services/settings";
import type { AccountRole, MockOwnerSession } from "@/types/auth";
import { validateLogin } from "@/utils/account-access";

// ── MOCK (dev only) ──────────────────────────────────────────────
export function authenticateMockOwner(
  role: AccountRole,
  id: string,
  pin: string,
): MockOwnerSession | null {
  if (!MOCK_AUTH_ENABLED || role !== "owner") return null;
  const errors = validateLogin(id, pin);
  if (
    errors.id ||
    errors.pin ||
    id !== demoOwner.id ||
    !settingsService.verifyOwnerPin(id, pin)
  )
    return null;
  return {
    kind: "mock",
    role: "owner",
    owner: { id: demoOwner.id, name: demoOwner.name },
  };
}

// ── REAL LOGIN ───────────────────────────────────────────────────
import { API_URL, timeoutSignal } from "@/services/api";

/** Extract FastAPI's error detail string from a non-ok response body. */
async function extractDetail(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string" && body.detail) return body.detail;
  } catch { /* ignore parse errors */ }
  return undefined;
}

export type LoginResult =
  | { status: "ok"; token: string; name: string }
  | { status: "invalid"; message?: string }
  | { status: "locked" }
  | { status: "error"; message: string };

export type KaheraLoginResult =
  | {
      status: "ok";
      token: string;
      name: string;
      kaheraId: string;
      ownerId: string;
      pinIsTemporary: boolean;
    }
  | { status: "invalid"; message?: string }
  | { status: "locked" }
  | { status: "notFound" }
  | { status: "error"; message: string };

/**
 * POST /auth/login  — May-Ari (store owner) login.
 */
export async function loginOwner(
  ownerId: string,
  pin: string,
): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ owner_id: ownerId.trim().toUpperCase(), pin }),
      signal: timeoutSignal(),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        status: "ok",
        token: data.access_token,
        name: data.full_name ?? "",
      };
    }
    if (res.status === 401 || res.status === 404) {
      const message = await extractDetail(res);
      return { status: "invalid", message };
    }
    if (res.status === 423 || res.status === 429) return { status: "locked" };
    return { status: "error", message: `Server error ${res.status}` };
  } catch {
    return {
      status: "error",
      message: "Could not reach server. Check your connection.",
    };
  }
}

/**
 * POST /auth/kahera/login-by-pin  — Kahera (cashier) login.
 * The login screen only collects owner_id + PIN — no separate cashier ID field.
 * The backend finds the matching active cashier for that store by trying each PIN.
 */
export async function loginKahera(
  ownerId: string,
  pin: string,
): Promise<KaheraLoginResult> {
  try {
    const res = await fetch(`${API_URL}/auth/kahera/login-by-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ owner_id: ownerId.trim().toUpperCase(), pin }),
      signal: timeoutSignal(),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        status: "ok",
        token: data.access_token,
        name: data.full_name ?? "",
        kaheraId: data.kahera_id ?? "",
        ownerId: data.owner_id ?? ownerId,
        pinIsTemporary: data.pin_is_temporary === true,
      };
    }
    if (res.status === 401 || res.status === 404) {
      const message = await extractDetail(res);
      return { status: "invalid", message };
    }
    if (res.status === 423 || res.status === 429) return { status: "locked" };
    return { status: "error", message: `Server error ${res.status}` };
  } catch {
    return {
      status: "error",
      message: "Could not reach server. Check your connection.",
    };
  }
}
