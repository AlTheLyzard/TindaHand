/**
 * Offline PIN hashing utility.
 *
 * Produces a salted SHA-256 hex string for a (scope, pin) pair so that:
 *   - The same PIN for two different identities (owner vs kahera, different IDs)
 *     produces different hashes — prevents cross-account replay.
 *   - The hash cannot be reversed to recover the plaintext PIN in transit or at rest.
 *
 * Salt format: `tindahand:v1:<scope>` where scope is a stable per-identity string
 * (e.g. `owner:TH-MA-0001` or `kahera:TH-MA-0001:TH-KH-0003`).
 *
 * Uses the Web Crypto API (crypto.subtle), which is available in Expo / React Native
 * via the Hermes/JSC global `crypto` polyfill (RN >= 0.71, Expo SDK >= 51).
 * Falls back to a pure-JS FNV-1a 32-bit hash only if crypto.subtle is unavailable,
 * so cold-start offline auth still works on old engines — the FNV output is weaker
 * but still keyed by identity, and is never stored when the stronger path succeeds.
 */

/** SHA-256 hex via Web Crypto (preferred). */
async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** FNV-1a 32-bit fallback when crypto.subtle is unavailable. */
function fnv1aHex(input: string): string {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Multiply by FNV prime, keeping within 32-bit unsigned range
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Hash a PIN for offline storage, salted by the caller-supplied scope string.
 *
 * The scope should be constructed from stable, role-specific identity fields:
 *   - Owner: `owner:<ownerId.toUpperCase()>`
 *   - Kahera: `kahera:<ownerId.toUpperCase()>:<kaheraId.toUpperCase()>`
 *
 * Returns a hex string (64 chars for SHA-256, 8 chars for FNV fallback).
 * Internally prefixes with algorithm version so stored hashes stay distinguishable.
 */
export async function hashPin(scope: string, pin: string): Promise<string> {
  const saltedInput = `tindahand:v1:${scope}:${pin}`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
      return `sha256:${await sha256Hex(saltedInput)}`;
    }
  } catch {
    /* Fall through to FNV. */
  }
  return `fnv1a:${fnv1aHex(saltedInput)}`;
}

/** Compare a plain-text PIN against a stored hash produced by hashPin(). */
export async function verifyPin(scope: string, pin: string, stored: string): Promise<boolean> {
  try {
    const candidate = await hashPin(scope, pin);
    // Constant-time comparison is not strictly necessary here — these hashes are
    // already stored in the OS keychain and the comparison runs entirely on-device,
    // but it avoids leaking timing information to any observing code.
    if (candidate.length !== stored.length) return false;
    let diff = 0;
    for (let i = 0; i < candidate.length; i++) {
      diff |= candidate.charCodeAt(i) ^ stored.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/** Scope string for the May-Ari (owner) login cache. */
export function ownerPinScope(ownerId: string): string {
  return `owner:${ownerId.trim().toUpperCase()}`;
}

/** Scope string for the Kahera (cashier) login cache. */
export function kaheraPinScope(ownerId: string, kaheraId: string): string {
  return `kahera:${ownerId.trim().toUpperCase()}:${kaheraId.trim().toUpperCase()}`;
}
