> Current behavior (November 9, 2026): [authentication-handoff.md](authentication-handoff.md) supersedes the historical instructions below. First access/full logout uses Owner ID + password; only an authenticated device can use PIN unlock. Owner password: `DemoStore25@!`; registered demo email: `owner@example.test`. The explicit mock flag remains required. No real emails or durable accounts are created.

# Development mock Owner login

Owner Settings follow-up (October 31, 2026): [owner-settings.md](owner-settings.md) supersedes the historical cashier/unavailable and credential behavior below. Owner login now verifies the current in-memory Owner PIN, so after changing it in Settings, use the new PIN until reload. The chooser derives cashier availability from the shared store-scoped list. Cashier login checks Store / Owner ID + unique Cashier ID + PIN in development, then reports that its workspace is unavailable and grants no Owner access. Cashier creation and PIN resets remain in memory until reload; no real account is created.

Mock login is off by default. From the project folder in PowerShell:

```powershell
$env:EXPO_PUBLIC_ENABLE_MOCK_AUTH = 'true'
npm start
```

Alternatively, set `EXPO_PUBLIC_ENABLE_MOCK_AUTH=true` in an uncommitted `.env.local`. Restart Expo and fully reload the app after changing the flag. Both the exact value `true` and `__DEV__` are required; production rejects mock authentication even if the flag is set.

Open **I have an account**, then **Demo Owner Login (development only)** on the chooser. The existing owner login form shows the fictional credentials:

- Owner ID: `TH-DEMO-OWNER`
- PIN: `0123`

Enter both exactly and press **Log In**. Existing required-field and four-digit PIN validation runs first; other IDs, PINs and the Cashier role cannot authenticate with these credentials. No credentials are automatically filled. The dashboard displays a mock-session disclosure and **Log Out of Demo**. Logout clears the session, draft, completion and access capability, then replaces the current route with the chooser. Existing account-availability records are preserved.

To disable, remove the variable or set it to `false`, restart Expo and reload. Sessions exist only in React context; app reload/process restart also signs out. Login never changes registration completion or available owner/cashier accounts. The development entry is separate from account cards so an empty account state can still reach the demo without pretending an owner or cashier has been registered.

The fixture lives in `src/data/mock-auth.ts`, the opt-in gate in `src/config/mock-auth.ts`, and the synchronous adapter in `src/services/mock-auth.ts`. The adapter returns only an owner identity and role; the PIN is not copied into a session or passed through navigation. `AuthFlowProvider` owns the mock session and derives an authorized owner through `resolveOwnerAccess`. Dashboard, inventory, POS and inventory writes use this shared gate. Registration-preview access keeps its previous rules and stays separate. Future backend authentication should introduce its own adapter/session type rather than mark demo login as confirmed registration.

There are no backend calls, persistence, real credentials, dependency additions or cashier registration changes. These frontend capabilities are for development and do not provide production security.

Verification: `npm run lint` and `npm run typecheck` passed. `node --test tests/auth-validation.test.cjs tests/mock-auth.test.cjs tests/inventory.test.cjs tests/pos.test.cjs tests/payment.test.cjs` passed all 40 tests. New tests cover production and disabled/malformed flags, exact credentials, invalid inputs, Cashier rejection, credential-free session records, and disabled/invalid/logged-out guard states.

Headless Chrome at 360 x 640 passed both flag-disabled and flag-enabled runs: direct dashboard/inventory/POS links were blocked before login; required validation and wrong credentials blocked login; exact credentials reached the disclosed demo dashboard; Inventory and POS navigation worked; account availability and registration completion stayed unchanged; logout returned to the chooser and removed access; browser Back and a direct POS payment link could not regain access; Cashier login remained unavailable. Browser checks used fictional credentials only. No browser exceptions were observed. Temporary checks/screenshots are in `.expo/mock-auth-browser.cjs` and `.expo/mock-owner-dashboard.png`.

Android runtime: not tested; no connected device/emulator or ADB available. iOS runtime: not tested; this Windows environment has no iOS simulator. Native keyboard, gestures and accessibility behavior still need device checks. No production/native build or platform bundle export was run; production blocking was tested through the gate/adapter tests with `__DEV__` false, not a native production binary.

Changed files: new `src/config/mock-auth.ts`, `src/data/mock-auth.ts`, `src/services/mock-auth.ts`, `tests/mock-auth.test.cjs`, and this document; updated `src/types/auth.ts`, `src/state/auth-flow.tsx`, `src/state/inventory.tsx`, `src/utils/dashboard-access.ts`, `src/i18n/en.ts`, `src/app/login.tsx`, `src/app/owner-dashboard.tsx`, `src/app/owner-inventory/_layout.tsx`, the layout/index/cart/payment routes under `src/app/owner-pos/`, `src/components/auth/account-choice-screen.tsx`, `src/components/auth/role-login-screen.tsx`, `src/components/dashboard/owner-dashboard-screen.tsx`, `src/components/inventory/inventory-ui.tsx`, and the browsing/cart/payment/frame components under `src/components/pos/`. Owner UI now accepts a shared identity rather than requiring registration completion; registration success and details screens keep their existing completion contract.
