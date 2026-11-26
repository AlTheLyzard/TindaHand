/**
 * Lightweight pub/sub bus for the 401-expired-token signal.
 *
 * When apiFetch receives a 401 it fires `emit401()`.
 * The ReauthModal (mounted in the root layout) subscribes with `on401()`
 * and shows itself, blocking all interaction until the owner re-authenticates.
 *
 * We deliberately avoid React state/context here so the emitter can be
 * imported by api.ts without creating a circular dependency.
 */

type Listener = () => void;

const listeners: Set<Listener> = new Set();

/** Fire when a 401 is received and the token appears expired. */
export function emit401(): void {
  for (const fn of listeners) {
    try { fn(); } catch { /* never let a listener crash apiFetch */ }
  }
}

/** Subscribe to 401 signals. Returns an unsubscribe function. */
export function on401(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
