> Authentication update (November 9, 2026): [authentication-handoff.md](authentication-handoff.md) supersedes historical auth behavior below, including Cashier-ID login, PIN-only first access, registration preview and chooser-on-skip instructions.

# Owner Settings

Implemented against `docs/designs/Settings 1.png`–`Settings 6.png`, the existing sticker sheet, and the named MAY-ARI / KAHERA workbook sheets. This is a frontend implementation with in-memory services, not production authentication, synchronization, or offline storage. No dependencies or native build configuration changed.

## Routes and shared state

More Tools → Settings opens `/owner-menu/settings` after the existing drawer finishes dismissing. Dashboard, Inventory and POS Settings shortcuts also reach it through the retained legacy redirect. The landing screen uses the existing expanding-label navigation bar, with Menu selected. Nested screens omit the bar. Native stacks keep the existing reduced-motion transitions and iOS gestures. Header and Android back return to each screen's parent; creating a cashier replaces its form with the success route so Back cannot resubmit the completed form.

Language shows English selected and Tagalog disabled with “Coming soon.” No translation framework changes. No approved Help & FAQs content or existing help destination was found, so it displays a content-unavailable state.

`src/types/settings.ts` defines **proposed frontend contracts**, not agreed API payloads. Typed read fixtures live in `src/data/settings.ts`. `src/services/settings.ts` owns demo operations and closure-held mock PINs. `SettingsProvider` accepts a replaceable service. Its external-store subscription reads immutable snapshots so retained screens and React Compiler observe new cashiers and sync transitions immediately. Lists, counts, PIN targeting, account setup and cashier login use the same store-scoped source. Read/list/completion records contain only cashier ID, name, owner ID and status, with no credential fields. Deterministic mock cashier IDs start at `TH-KH-0003`; backend generation must replace this convention.

Owner PIN change and Cashier PIN reset are separate operations using a shared form. All fields mask by default with independent show/hide controls. PINs are four ASCII digits stored as strings, including leading zeros. Submission reveals validation; corrections update it. Clear resets values, visibility and errors. Request locks prevent duplicate writes. Success, blur and unmount clear sensitive form state, and stale requests cannot navigate after leaving the screen. Reset verifies **Your Owner PIN**, never the cashier's old PIN. Success identifies the selected cashier.

Cashier creation shows the current Owner/store identity and updates both lists immediately. The confirmation contains name, Cashier ID and Owner/store ID without the entered PIN. It offers Back to User Management and Go to Dashboard. Initial account setup reuses this form instead of a separate registration implementation. Development registration preview initializes only the session's mock Owner PIN and clears its draft. Real Owner registration remains unavailable until its backend exists.

Cashier login now requires Store / Owner ID + unique Cashier ID + PIN, using the existing login UI. In development it verifies against the same in-memory accounts/PIN resets. The Cashier workspace and authenticated Cashier session are still unavailable: a successful mock credential check says so explicitly and grants no Owner access. Existing Owner mock login remains opt-in and accepts the current in-memory Owner PIN after a change. Reload restores seeds and the initial demo Owner PIN `0123`.

## Sync and cache behavior

Data Management supports up-to-date (last simulated sync timestamp), offline (pending count), failed (retry), syncing (progress, repeated actions disabled), and complete. Every state explicitly describes the simulation. No export action or durable-storage claim is included. Successful sync sets pending demo records to zero. Cache clearing is disabled while records are pending or sync is in progress, and becomes available after success.

The existing confirmation component/motion modal supplies the warning icon, title, Close, Cancel and Clear Cache actions. Close, Cancel and Android modal back dismiss before clearing. The screen and mock service both recheck eligibility when confirming, including after the asynchronous boundary. Clearing shows progress and either success or retryable failure. No storage-clearing API is called: business data, cashier accounts, credentials, preferences and pending changes are untouched.

## Development scenarios

Enable the existing fictional Owner login as described in [mock-auth.md](mock-auth.md). In PowerShell, set any of these before starting/restarting Metro and reload the app:

```powershell
$env:EXPO_PUBLIC_ENABLE_MOCK_AUTH = 'true'
$env:EXPO_PUBLIC_SETTINGS_SCENARIO = 'offline'
$env:EXPO_PUBLIC_SETTINGS_EMPTY = 'true'
$env:EXPO_PUBLIC_SETTINGS_FAIL_NEXT = 'sync'
npm start
```

`EXPO_PUBLIC_SETTINGS_SCENARIO` accepts `up-to-date`, `offline`, `failed`, `syncing`, `complete`. `syncing` is a fixed 58% visual fixture; use Sync Now from another initial state for a live progress transition. `EXPO_PUBLIC_SETTINGS_EMPTY=true` starts without cashiers. `EXPO_PUBLIC_SETTINGS_FAIL_NEXT` accepts `create`, `change-pin`, `reset-pin`, `sync`, `clear-cache` and fails that operation once, then allows retry. These options are development-only; there are no scenario controls in normal UI. Tests can inject `createMockSettingsService()` or a `SettingsProvider` service and call the mock's development-only `preview` / `failNext` helpers. Remove the variables to restore defaults. All public values are bundled and must never contain secrets.

## Requirements decisions and remaining gaps

- MA-SET-001 covers available preferences/security and also mentions notifications. Notifications are outside this confirmed task; no controls are invented.
- MA-LOG-004 asks for cashier setup, permits multiple accounts, and asks to display a cashier PIN after creation. Its remarks propose removing “Add Another Cashier.” The confirmed task requires multiple accounts through Add Cashier and prohibits displaying credentials; those decisions govern this implementation.
- KH-LOG-002 and the charter describe Owner ID + Cashier PIN without a unique cashier identifier. The confirmed identification scheme adds Cashier ID. Source requirements need formal revision; originals are unchanged.
- The Copy of MAY-ARI MODULE adds a confirmation PIN field and Owner identity to setup, and removes the baseline's Add Another option. It also differs on Owner registration/ID page wording and sequencing. These copy-sheet differences were not merged as requirements. The confirmed task independently requires confirmation PIN and Owner identity.
- Screenshot errors that disclose an old cashier PIN, call Tagalog available, describe exports/durable offline changes, or say Account Created after sync are corrected by the confirmed decisions.
- Permission editing, deactivation/deletion, notification preferences, translation and Cashier workspace implementation remain outside scope. Help copy is unavailable.

## Backend responsibilities

Replace the mock adapter with agreed transport/session contracts. Derive Owner/store/role authorization from the authenticated server session on every list/create/change/reset/sync/cache request; client IDs and route guards are not security. Verify the Owner PIN server-side, enforce failed-attempt limits and throttling, securely hash PINs, protect credential transport/storage, and never return PINs in lists or identities. Generate canonical cashier IDs and enforce uniqueness/store ownership. Reset only the selected cashier; record reset audit events without PIN values and invalidate the affected cashier's sessions. Define durable offline queues, conflict handling, progress/retry semantics, cache boundaries and session expiry/revocation before real sync or local cache removal. See [api-contract.md](api-contract.md) and [backend-handoff.md](backend-handoff.md).

## Verification

`npm run lint`, `npm run typecheck`, and `npm test` passed (77 tests). Settings tests cover required/invalid/mismatching PINs, leading zeroes, immutable store snapshots, unique IDs, duplicate requests, store isolation, reset targeting, incorrect Owner PIN, credential-free reads, service failure/retry, all sync transitions and cache eligibility rechecks. An authentication regression verifies that Owner login accepts the changed PIN and rejects the old one. Existing inventory/POS/expense/auth tests remain passing. Dependency diagnostics were not run; dependencies and configuration did not change.

Headless Chrome checked the UI at 390 × 844, with additional 320 × 568, 360 × 640 and 430 × 932 layouts. Screenshots were compared to all six supplied references. The complete workflow and separate empty-list/setup runs passed without browser console errors or exceptions: signed-out direct Settings access was denied; the drawer dismissed before navigation; nested screens hid the bottom bar; Language stayed English; required/mismatch/incorrect Owner PIN errors, independent visibility and Clear worked; changing the Owner PIN and resetting the selected second cashier succeeded; creation updated the retained User Management count and PIN list; duplicate create attempts created one account; failure preserved fields for retry; initial account setup reused the form; all sync states/progress/retry and cache restriction/recheck/cancel/close/failure/success paths worked. Three-part Cashier login verified the newly created account and granted no Owner access. Small-screen form actions were reached by scrolling. Browser artifacts/scripts/results are under `.expo/settings-check/` and are not native runtime evidence.

| Platform | Bundle compilation | Native build / runtime |
| --- | --- | --- |
| Android | Expo export produced a Hermes bundle in `.expo/settings-export/android` | No native build. Runtime **not tested**: no connected device/emulator or ADB available. |
| iOS | Expo export produced a Hermes bundle in `.expo/settings-export/ios` | No native build. Runtime **not tested**: this Windows environment has no iOS simulator. |

Native keyboard avoidance, four-digit keypad focus/dismissal, safe areas/system bars, larger accessibility text, screen readers, Android system back and iOS back gestures still need device checks. Browser back/buttons and scroll access do not establish those behaviors. An intermediate watch-mode preview hit the environment's open-file limit; final browser checks used one Metro instance in CI mode and passed.

## Changed files

- New routes: `src/app/owner-menu/settings/` (guarded layout, landing, Language, Security, PIN forms/lists, Users, Add/Created, Data and Help).
- New presentation: `src/components/settings/` and `assets/images/settings/` (bundled SVG outlines). Existing `components/ui/form-field.tsx` adds an opt-in PIN visibility control; other callers retain their current style.
- New domain/state: `src/{types,data,services,state,utils}/settings.*`.
- Integration: `src/app/_layout.tsx`, `src/app/owner-menu/[tool].tsx`, `src/app/owner-id.tsx`, `src/components/menu/owner-menu-drawer.tsx`, `src/components/auth/{account-choice-screen,role-login-screen,registration-screen,owner-id-screen}.tsx`, `src/services/mock-auth.ts`, `src/state/auth-flow.tsx`, `src/types/auth.ts`, `src/data/menu.ts`, `src/i18n/en.ts`.
- Tests: `tests/settings.test.cjs`, `tests/mock-auth.test.cjs`.
- Handoff: this document, `README.md`, `.env.example`, and `docs/{api-contract,backend-handoff,mock-auth,registration-screen,account-choice-screen}.md`. Source requirements and supplied reference images are unchanged.
