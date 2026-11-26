import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { AppState } from 'react-native';

import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';

/**
 * While a system overlay (image picker, camera, share sheet, etc.) is open the
 * app temporarily moves to the background, which would normally trigger the
 * auto-lock. Any component that opens a system overlay should call
 * `suppressAuthLock()` before launching it and `releaseAuthLock()` after the
 * promise resolves, so the AppState listener skips the lock for that window.
 */
let _lockSuppressed = false;
export function suppressAuthLock() { _lockSuppressed = true; }
export function releaseAuthLock()  { _lockSuppressed = false; }
import { authenticationService } from '@/services/authentication';
import { fetchMe } from '@/services/session-api';
import { getOwnerProfile, settingsService } from '@/services/settings';
import { clearOfflineKaheraPinHash, clearOfflineOwnerPinHash, clearSessionLocked, getKaheraId, getOwnerId, getOwnerName, getRole, getSessionLocked, getToken, saveSessionLocked } from '@/services/token-storage';
import type { AccountRole, DeviceSession, MockOwnerSession, OwnerIdentity, RegisteredOwner, RegistrationCompletion, RegistrationFormValues, RememberedIdentities } from '@/types/auth';
import { defaultOperatorPermissions } from '@/utils/operator-access';

const emptyDraft: RegistrationFormValues = {
  name: '', email: '', password: '', confirmPassword: '', pin: '', confirmPin: '',
};

type AuthFlow = {
  mockAuthEnabled: boolean;
  mockSession: MockOwnerSession | null;
  owner: OwnerIdentity | null;
  deviceSession: DeviceSession | null;
  restoring: boolean;
  rememberedIdentities: RememberedIdentities;
  switchAccount: (role: AccountRole) => Promise<void>;
  refreshSession: (showRestoring?: boolean) => Promise<DeviceSession | null>;
  lock: () => Promise<void>;
  loginToastExpiresAt: number | null;
  dismissLoginToast: () => void;
  notifyLogin: () => void;
  /**
   * Establish an offline-grace session when the network is unavailable but
   * the PIN was verified against the cached hash. The session allows local
   * POS/inventory operations but blocks backend-only actions (settings, PIN reset).
   * Automatically promoted to 'confirmed' once the network returns and
   * refreshSession() succeeds.
   */
  setOfflineGrace: (owner: RegisteredOwner, role: 'owner' | 'cashier', kaheraId?: string) => void;
  draft: RegistrationFormValues;
  setDraft: Dispatch<SetStateAction<RegistrationFormValues>>;
  registrationPreview: boolean;
  setRegistrationPreview: Dispatch<SetStateAction<boolean>>;
  selectedRole: AccountRole | null;
  setSelectedRole: Dispatch<SetStateAction<AccountRole | null>>;
  selectedOwnerId: string | null;
  setSelectedOwnerId: Dispatch<SetStateAction<string | null>>;
  completion: RegistrationCompletion | null;
  setCompletion: Dispatch<SetStateAction<RegistrationCompletion | null>>;
  dashboardAccess: boolean;
  setDashboardAccess: Dispatch<SetStateAction<boolean>>;
  clear: () => void;
};

const AuthFlowContext = createContext<AuthFlow | null>(null);

/** Local mock account directory, identity-only login hints, and ephemeral sessions/drafts. */
// TODO(backend): Restore and maintain device sessions through the secure authentication service.
// - Method/Action: Auth / Restore, refresh, lock, and revoke session
// - Expected Input/Payload: Secure device credential; role and store come from the server session
// - Expected Response: DeviceSession or signed-out state with canonical role/capabilities
// - UI State to Wire: Drive restoring, session context, and direct-route capability gates from server state
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const profiles = useSyncExternalStore(authenticationService.profile.subscribe, authenticationService.profile.getSnapshot, authenticationService.profile.getSnapshot);
  const [deviceSession, setDeviceSession] = useState<DeviceSession | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [rememberedIdentities, setRememberedIdentities] = useState<RememberedIdentities>({});
  const [loginToastExpiresAt, setLoginToastExpiresAt] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [registrationPreview, setRegistrationPreview] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AccountRole | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [completion, setCompletion] = useState<RegistrationCompletion | null>(null);
  const [dashboardAccess, setDashboardAccess] = useState(false);
  // Prevent concurrent refreshSession calls — the AppState listener can fire
  // while an explicit login flow is already running refreshSession(true).
  const refreshingRef = useRef(false);

  function clear() {
    void authenticationService.logout();
    setDeviceSession(null);
    setLoginToastExpiresAt(null);
    setDraft(emptyDraft);
    setRegistrationPreview(false);
    setSelectedRole(null);
    setSelectedOwnerId(null);
    setCompletion(null);
    setDashboardAccess(false);
    // Clear offline PIN hash caches on explicit logout so a physically stolen
    // device cannot re-enter the app offline using the last-known credentials.
    void (async () => {
      try {
        const ownerId = await getOwnerId();
        if (ownerId) await clearOfflineOwnerPinHash(ownerId);
      } catch { /* Best-effort. */ }
      try {
        const ownerId = await getOwnerId();
        const kaheraId = await getKaheraId();
        if (ownerId && kaheraId) await clearOfflineKaheraPinHash(ownerId, kaheraId);
      } catch { /* Best-effort. */ }
    })();
  }

  /**
   * Build a minimal offline-grace DeviceSession so the app can operate in
   * offline mode after the PIN was verified against the cached hash.
   */
  function setOfflineGrace(owner: RegisteredOwner, role: 'owner' | 'cashier', kaheraId?: string) {
    const baseSession: DeviceSession = {
      kind: 'mock',
      id: `offline-grace-${Date.now()}`,
      owner,
      expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      locked: false,
      role: 'owner',
    };
    if (role === 'cashier' && kaheraId) {
      const cashierSession: DeviceSession = {
        ...baseSession,
        role: 'operator',
        ownerId: owner.id,
        operatorId: kaheraId,
        displayName: '',
        operator: { id: kaheraId, name: '', permissions: [] },
      };
      authenticationService.seedRealOwner(owner);
      setDeviceSession(cashierSession);
    } else {
      authenticationService.seedRealOwner(owner);
      setDeviceSession(baseSession);
    }
  }

  const refreshSession = useCallback(async (showRestoring = false): Promise<DeviceSession | null> => {
    // If an explicit login-triggered refresh (showRestoring=true) is in progress,
    // skip the background AppState-triggered refresh to avoid a race condition where
    // the background call could null out a freshly-set session.
    if (!showRestoring && refreshingRef.current) return null;
    if (showRestoring) refreshingRef.current = true;
    if (showRestoring) setRestoring(true);
    try {
      await authenticationService.ready;
      const [mockSession, identities] = await Promise.all([
        authenticationService.restoreSession(), authenticationService.restoreRememberedIdentities(),
      ]);
      setRememberedIdentities(identities);

      // If mock restored a session, use it as before.
      if (mockSession) {
        setDeviceSession(mockSession);
        return mockSession;
      }

      // No mock session — try the real JWT stored in SecureStore.
      const token = await getToken();
      if (token) {
        const [me, storedRole, kaheraId, savedOwnerId, savedOwnerName, wasLocked] = await Promise.all([
          fetchMe(token).catch(() => null),   // graceful offline fallback
          getRole(),
          getKaheraId(),
          getOwnerId(),
          getOwnerName(),
          getSessionLocked(),   // was the session locked when the app last closed?
        ]);
        // For a cashier, /auth/me returns Kahera's own ID (TH-KH-XXXX), NOT the
        // owner's ID.  Using it as ownerId would point the session at the wrong store.
        // Always use savedOwnerId for cashier sessions — it was saved correctly at login.
        // For owners, prefer the live formatted_id from /me (more reliable than the
        // typed ID saved at login).
        const isCashier    = storedRole === 'cashier';
        const resolvedId   = isCashier ? savedOwnerId : (me?.formatted_id ?? savedOwnerId);
        const resolvedName = me?.name ?? savedOwnerName ?? '';
        if (resolvedId) {
          const owner = { id: resolvedId, name: resolvedName };
          if (isCashier && kaheraId) {
            // Cashier session — build an operator DeviceSession.
            // If the session was locked when the app last closed, restore it as locked
            // so the app shows the PIN screen instead of going straight to the POS.
            const realSession: DeviceSession = {
              kind: 'mock',
              id: token,
              role: 'operator',
              owner,
              ownerId: resolvedId,
              operatorId: kaheraId,
              displayName: resolvedName,
              operator: { id: kaheraId, name: resolvedName, permissions: [...defaultOperatorPermissions] },
              expiresAt: Date.now() + 8 * 60 * 60 * 1000,
              locked: wasLocked,
            };
            authenticationService.seedRealOwner(owner);
            // Keep authentication.ts's module-level session variable in sync so
            // updateOperatorProfile (and other methods that check `session` directly)
            // see a valid session even after a background restoreSession call wiped it.
            authenticationService.seedRealSession(realSession);
            // Seed the Kahera into the local settings store so the header renders
            // immediately.  Reuse any avatar already known from a previous seed or
            // profile save rather than resetting to a placeholder — otherwise a
            // refreshSession() call right after updateOperatorProfile() would clobber
            // the freshly-saved avatar back to the default.
            const knownAvatar = settingsService.cashiers(resolvedId)
              .find(c => c.id === kaheraId)?.avatarId ?? 'avatar-01';
            settingsService.seedRealCashier({
              id: kaheraId,
              ownerId: resolvedId,
              name: resolvedName,
              status: 'active',
              avatarId: knownAvatar,
            });
            setDeviceSession(realSession);
            return realSession;
          }
          // Owner session.
          // If the session was locked when the app last closed, restore it as locked
          // so the app shows the PIN screen instead of going straight to the dashboard.
          const realSession: DeviceSession = {
            kind: 'mock',           // discriminant reused; not sent anywhere
            id: token,
            role: 'owner',
            owner,
            expiresAt: Date.now() + 8 * 60 * 60 * 1000,
            locked: wasLocked,
          };
          // Seed the mock directory so login.tsx's directory.owners.length check passes.
          authenticationService.seedRealOwner(owner);
          authenticationService.seedRealSession(realSession);
          setDeviceSession(realSession);
          // Pre-fetch the owner profile in the background so the header avatar is
          // populated immediately without waiting for the Profile screen to mount.
          void getOwnerProfile().then(data => {
            authenticationService.profile.syncFromApi({
              ownerId: owner.id,
              name: data.name,
              avatarId: (data.avatarId as import('@/types/profile').AvatarId | null) ?? null,
              storeName: data.storeName ?? '',
              email: data.email ?? '',
              pendingEmail: null,
            });
          }).catch(() => { /* Best-effort; avatar will appear after Profile screen opens. */ });
          return realSession;
        }
      }

      setDeviceSession(null);
      return null;
    }
    catch { setDeviceSession(null); return null; }
    finally { setRestoring(false); refreshingRef.current = false; }
  }, []);

  async function switchAccount(role: AccountRole) {
    await authenticationService.switchAccount(role);
    setDeviceSession(null);
    setRememberedIdentities(await authenticationService.restoreRememberedIdentities());
    setLoginToastExpiresAt(null);
    setDraft(emptyDraft);
    setSelectedRole(null);
    setSelectedOwnerId(null);
    setRegistrationPreview(false);
    setCompletion(null);
    setDashboardAccess(false);
  }

  async function lock() {
    await authenticationService.lockSession();
    // Persist the locked flag so a cold restart shows PIN screen, not full login.
    await saveSessionLocked();
    const current = await authenticationService.restoreSession();
    setDeviceSession(current);
    if (current) setDraft(emptyDraft);
  }

  useEffect(() => {
    void Promise.resolve().then(() => refreshSession());
    // Grace period before locking: short app switches (notification shade, quick-settings,
    // system overlays) go inactive briefly. Only lock after 3 minutes in background
    // so brief switches don't kick the user back to the PIN screen (matches banking apps).
    let lockTimer: ReturnType<typeof setTimeout> | null = null;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        // Skip the lock while a system overlay (photo picker, camera, etc.) is open.
        if (_lockSuppressed) return;
        lockTimer = setTimeout(() => { lockTimer = null; void lock(); }, 180000);
      } else {
        if (lockTimer !== null) { clearTimeout(lockTimer); lockTimer = null; }
        void refreshSession();
      }
    });
    return () => { subscription.remove(); if (lockTimer !== null) clearTimeout(lockTimer); };
  }, [refreshSession]);
  // SECURITY: Navigation gates only. Backend authorization is required for every
  // read/write. Neither registration completion nor a remembered ID grants access.
  const active = deviceSession && !deviceSession.locked;
  // Determine session mode:
  //   'mock'          — dev-only mock auth is enabled
  //   'offline-grace' — PIN verified offline; no live JWT; network was unavailable at login
  //   'confirmed'     — real JWT session backed by the server
  // Offline-grace sessions are detected by an ID prefix set in setOfflineGrace().
  const isOfflineGrace = typeof deviceSession?.id === 'string' && deviceSession.id.startsWith('offline-grace-');
  const ownerMode: OwnerIdentity['mode'] = MOCK_AUTH_ENABLED ? 'mock' : isOfflineGrace ? 'offline-grace' : 'confirmed';
  const owner: OwnerIdentity | null = active && deviceSession.role === 'owner' ? { ...deviceSession.owner, name: profiles.get(deviceSession.owner.id)?.name ?? deviceSession.owner.name, mode: ownerMode } : null;
  const mockSession: MockOwnerSession | null = owner ? { kind: 'mock', role: 'owner', owner } : null;

  return (
    <AuthFlowContext.Provider value={{ mockAuthEnabled: MOCK_AUTH_ENABLED, mockSession, deviceSession, restoring, rememberedIdentities, switchAccount, refreshSession, lock, loginToastExpiresAt, dismissLoginToast: () => setLoginToastExpiresAt(null), notifyLogin: () => setLoginToastExpiresAt(Date.now() + 15000), setOfflineGrace, owner, draft, setDraft, registrationPreview, setRegistrationPreview, selectedRole, setSelectedRole, selectedOwnerId, setSelectedOwnerId, completion, setCompletion, dashboardAccess, setDashboardAccess, clear }}>
      {children}
    </AuthFlowContext.Provider>
  );
}

export function useAuthFlow() {
  const flow = useContext(AuthFlowContext);
  if (!flow) throw new Error('Auth flow must be rendered inside AuthFlowProvider.');
  return flow;
}
