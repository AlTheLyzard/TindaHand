# Authentication handoff — November 9, 2026

November 13 refinement: [Login and PIN recovery](login-pin-recovery-refinement.md)
adds role-scoped remembered IDs, password-first device authentication and
verified PIN unlock. The November 15 account-flow refinement lists only stored
Owner accounts, shows Operator Login only when an Operator record exists, and
persists native Owner/Operator records in app storage. Passwords and PINs use
Expo SecureStore on Android/iOS. Mock sessions and recovery requests still do
not survive a process restart; browser preview storage remains in memory.

Profile follow-up: [Owner Profile](owner-profile.md) adds draft editing, current-PIN reauthentication, pending-email verification, independent Operator capabilities and account lifecycle controls. It preserves Owner ID + assigned Operator PIN login. Profile/email adapters remain proposed development mocks. The Operator now enters the shared mock POS workspace; Inventory and More remain guarded placeholders.

This is a frontend implementation with an explicit development mock, not a backend or an approved HTTP schema. This document supersedes older auth descriptions in `mock-auth.md`, `registration-screen.md`, `account-choice-screen.md`, `owner-settings.md`, `api-contract.md` and `backend-handoff.md`. Original requirements and design sheets are unchanged.

## Approved behavior and source conflicts

Reviewed every panel in MA-LOG-001–007, Buttons.png, the supplied standalone backgrounds, existing tokens/components, and the authentication/access criteria in the workbook's named MAY-ARI MODULE and KAHERA MODULE sheets. The copy sheet has different ID/success timing and a Dashboard shortcut; it was not merged. Older requirements omit registration Email, specify PIN-only Owner login, mention offline recovery codes, expose an Operator PIN in success, and contain conflicting Add Another Operator remarks. The current explicit decisions supersede those examples: English Owner/Operator labels, required Email, password authentication on new devices/full logout, authenticated-device PIN unlock, neutral email recovery, permanent service-assigned Owner ID, direct Dashboard skip, and no displayed/retrieved Operator PIN. Multiple Operators remain supported through existing Settings.

## Routes and files

| Route | Purpose |
| --- | --- |
| `/` | Existing approved Welcome branding/tagline, supplied wave/store backdrop |
| `/choose-account` | Lists registered Owners; shows Operator Login only when a stored Operator belongs to a registered Owner; empty state links to Owner account creation |
| `/register` | Six-field validation, live feedback after interaction, first-invalid focus/scroll, submission lock |
| `/account-created` → `/owner-id` | Existing success/ID cards, real submitted identity, three-step progress; toast has a 15-second deadline and manual dismiss |
| `/operator-setup` | Optional step 3 using the existing credential form; Cancel retains the Owner account, success offers only Dashboard |
| `/login?role=owner` | Shared layout: password without a valid device session; four-digit PIN with one |
| `/login?role=cashier` | Operator label, Owner ID + assigned PIN only; internal role name retained for compatibility |
| `/forgot-pin` | Request and Check Your Email are states of one screen; service cooldown, neutral response, retry/failure |
| `/reset-pin?token=…` | Recovery link entry, service verification before form, error states, atomic reset, clears stack/token/form and returns to Owner login |

`src/components/auth/` contains reusable screens, background, progress, header and success feedback. The background assets are unchanged copies of the supplied `ApplicationBackground.png` and `ApplicationHeaderBackground.png` under `assets/images/auth/`; they contain decoration only. `src/components/ui/form-field.tsx` retains native secure inputs, four progressive PIN slots, independent visibility and cursor restoration. Existing Button, motion/reduced-motion infrastructure and fonts are reused. Dashboard content/navigation is preserved; `src/app/owner-dashboard.tsx` adds only the login toast and full-logout behavior.

`src/state/auth-flow.tsx` consumes the service session, clears sensitive drafts, restores on activation, locks on background, refreshes validity, and exposes full logout separately. Inventory/POS/cash providers are keyed by the service session ID, retaining demo state through locking while clearing it on full logout/session removal. The November 11 Owner Login refinement removes Log Out and Use Password from that screen; Change Role preserves the authenticated device session. Existing Owner-only route guards use `owner`, derived only from an unlocked service session. Registration completion, account availability, selected role and remembered ID alone cannot establish access. `src/components/settings/preferences-screens.tsx` exposes Lock App with the distinction from full logout. Existing Operator administration/reset components retain Owner-PIN authorization; success copy no longer requests Cashier ID at login or shows a PIN.

## Adapter contracts (all proposed)

No HTTP authentication endpoints, schemas or cookie/token protocol are defined. The opt-in development mock now uses app document storage for non-secret Owner/Operator records and Expo SecureStore for native credentials; this is local development persistence, not a production authentication service. `src/types/auth.ts` defines `AuthenticationService`, `DeviceSession`, `AuthResult<T>`, `AuthFailure`, `RecoveryReceipt`, `OperatorPermission` and the extended registration types. The previous `RegistrationService`/`RegistrationResult` and `SettingsService` shapes are existing frontend seams, not backend contracts. Internal `cashier` names/routes remain to preserve existing navigation; UI says Operator.

Connect the API at **`src/services/authentication.ts`**, replacing the mock adapter as a unit. `src/services/registration.ts` delegates to it. Never catch a real API failure and switch to this mock.

| Method | Request | Response |
| --- | --- | --- |
| `registerOwner` | `RegistrationFormValues`: name/email/password/confirmPassword/pin/confirmPin | `RegistrationResult`: confirmed canonical account or safe message/field errors |
| `authenticateOwner` | `{ownerId,password}` | `AuthResult<DeviceSession>` |
| `unlockOwner` | `{ownerId,pin}` plus existing authenticated device context | `AuthResult<DeviceSession>` |
| `loginOperator` | `{ownerId,pin}` | `AuthResult<DeviceSession>` with matched internal Operator ID/name/permissions |
| `createOperator` | `CashierValues`: name/pin/confirmPin | `SettingsResult<Cashier>` |
| `resetOperatorPin` | `PinValues` plus operatorId: current Owner PIN/new PIN/confirmation | `SettingsResult<Cashier>` |
| `setOperatorActive` | `{operatorId,active}` | `SettingsResult<Cashier>` |
| `restoreSession` | existing secure device session context | `DeviceSession | null` |
| `lockSession`, `logout` | existing session context | `void` (awaitable) |
| `requestPinRecovery` | `{email}`; same operation for resend | `AuthResult<{resendAt:number}>`, absolute epoch milliseconds |
| `verifyRecoveryToken` | `{token}` | `AuthResult<{expiresAt:number}>` |
| `resetOwnerPin` | `{token,pin}` | `AuthResult<undefined>` |

Confirmation fields are UI-only; omit them from eventual transport/persistence. PINs remain strings. Account/list/session objects exclude passwords, PINs and recovery tokens. Native mock credentials are stored separately through SecureStore; the current `kind:'mock'`, sequence session IDs, timestamps and in-memory sessions are presentation/testing details, not a production token design. Existing Settings reads/subscriptions remain at `src/services/settings.ts`; Operator records retain their exact `ownerId` and auth operations resolve that linked Owner from the matched record.

## Server responsibilities and exact rule locations

Search the services/configuration for `BACKEND INTEGRATION:`, `BACKEND RULE:`, `SECURITY:` and `MOCK ONLY:`.

- **`authentication.ts`: registration and password/PIN methods** — hash and verify credentials securely; enforce the password policy (8+ characters, uppercase, lowercase, digit, special character); validate email/PIN formats; assign Owner ID once after durable creation. Do not regenerate it during login/reset.
- **`authentication.ts`: session methods and `state/auth-flow.tsx`** — server-issued session/refresh credentials, secure storage, expiry, revocation, authenticated device validation, every-read/write authorization, attempt limits, session restoration and logout failure handling. Frontend gates are navigation aids only. A remembered Owner ID is not authentication. Lock must prevent protected operations until unlock.
- **`settings.ts`: `duplicate`, `createCashier`, `resetCashierPin`, `setOperatorActive`, `matchOperator`** — atomically enforce distinct PINs among active Operators per Owner, identify the matched internal Operator, reject inactive accounts and assign only permitted capabilities. Preserve internal IDs for transaction attribution. Verify current Owner PIN before managed reset, rate-limit attempts and revoke affected Operator sessions. The mock tracks credential/status revisions for restoration invalidation.
- **`authentication.ts`: request/verify/reset recovery methods** — real email delivery; neutral responses and timing; resend/attempt limits; cryptographically random, time-limited, hashed, single-use recovery tokens; atomic token consumption + PIN update; revoke affected sessions, while leaving Owner ID/password unchanged. PIN reset must not authenticate a device. The mock revokes its affected session; agree the production cross-device policy.
- **`config/auth.ts` + `config/mock-auth.ts`** — centralized link configuration and opt-in mock gate. Never put secrets in Expo public configuration.

The Settings mock persists non-secret Operator records to the app document directory and stores Operator PINs in SecureStore on native. Owner records are stored separately from Owner passwords/PINs. The remembered login IDs remain a separate convenience file. Browser preview uses in-memory account and credential stores. Seeded demo identities remain development fixtures but are excluded from the chooser and direct login-route availability checks. Production still needs a server-owned account database, credential verification, authorization, and secure session adapter; process restarts lose mock sessions and pending recovery requests, while native mock accounts survive.

## Development configuration and scenarios

Set `EXPO_PUBLIC_ENABLE_MOCK_AUTH=true` in an uncommitted `.env.local`, restart Metro and fully reload. Both the exact flag and `__DEV__` are required. With it disabled, authentication/registration/recovery fail as unavailable. No requests or real emails are sent. User-created account records survive native process restarts; mock sessions do not. Native passwords/PINs use SecureStore. Browser preview stores accounts and credentials in memory only.

Legacy fictional fixtures still exist for service regression scenarios, but the chooser filters them out and `/login` redirects when no user-created account of the requested role exists. New Owner records receive IDs such as `TH-MA-0001`; the exact ID is stored with the account record. Operator rows persist their Owner foreign key and are matched by that Owner ID plus PIN. The linked ID in the matched Operator row is authoritative when constructing the session.

Recovery scenarios:

1. Request with a valid unknown email: same neutral confirmation/cooldown; no account enumeration.
2. Request with `owner@example.test` or an email just registered: creates the dev token, never opens reset automatically. The first requested token is `mock-owner-recovery`; subsequent requests use `mock-owner-recovery-2`, `-3`, etc., invalidating earlier links. A cold-start scenario already seeds the first token.
3. `failure@example.test`: predictable sending failure. Invalid/empty email: validation failure.
4. Resend cooldown is returned by service (30 seconds in mock). Use the existing buttons to retry after it elapses.
5. Link route `/reset-pin?token=mock-owner-recovery`: valid only after request in that running app instance, or after explicit cold-start configuration below. Missing/unknown tokens are rejected; successful consumption rejects replay; tokens expire after 15 minutes.
6. For cold-start testing only, set `EXPO_PUBLIC_MOCK_RECOVERY_SCENARIO=valid`, `expired`, or `used`, then restart Metro with `npx expo start --clear` and reload. This seeds the same fixed mock token. Remove the variable for normal development. No demo controls are placed in production UI.

`tests/authentication-service.test.cjs` injects a clock to test cooldown/expiry and concurrent token consumption without waiting. Existing settings tests also cover duplicate rejection, safe reads, failed saves and Owner verification. UI test scripts/screenshots are under `.expo/authentication-review/` (local ignored artifacts).

## Recovery links and outstanding integration gaps

Existing `app.json` scheme is `tindahand`; Expo Router maps `/reset-pin`. In a development build, open `tindahand://reset-pin?token=mock-owner-recovery` using the OS or development link tooling. Expo Go uses its current Metro URL plus `/--/reset-pin?token=mock-owner-recovery`; web preview uses the current local origin plus `/reset-pin?token=mock-owner-recovery`. Cold-start mock testing needs the explicit scenario above because the fake server is in memory.

`src/config/auth.ts` centralizes the route, development scheme and **unset production HTTPS origin** (`EXPO_PUBLIC_RECOVERY_ORIGIN`). It is configuration for the future delivery adapter, not a working email system. Supply an owned HTTPS domain, Android intent filters/domain association and iOS associated domains/AASA before production app-link delivery. No domain was invented and no native configuration/build change was made. Tokens are expected only in the incoming recovery URL; passwords/PINs/session credentials never enter route parameters. The backend/link handler must redact token URLs from logs/analytics.

**Password recovery is unsupported**: no existing flow or approved password-recovery design/API was found. No Forgot password action is connected to PIN recovery.

**Operator workspace follow-up (November 15, 2026)**: login creates a credential-free Operator session with the matched internal ID and permissions, then routes to the shared POS flow. The three-item navigation exposes POS, Inventory and More; POS sale writes check the POS capability and cannot invoke Owner-only inventory actions. Inventory and More are placeholders for later phases, and no Owner privileges are granted. The internal Operator ID remains available in `DeviceSession.operator.id`.

**Production auth and durable restoration are not connected**. Replace the unavailable production adapter, choose the secure storage/session protocol, implement real email delivery/verification and rate limits, and agree wire schemas before release. No new backend or migration was created.

## Verification

Shared automated checks, browser comparisons, platform bundle compilation and native runtime testing are separate. Actual final results are recorded below after execution. Native keyboard, safe-area/notch behavior, text scaling, TalkBack/VoiceOver, Android back and iOS gesture behavior still require platform runtime checks.

### Recorded results

- `npm run typecheck`: passed on the final code.
- `npm run lint`: passed with no errors or warnings on the final code.
- `npm test`: **144 passed, 0 failed**. Includes registration/email/password/PIN validation, permanent ID behavior, password vs PIN session transitions, expiry/logout, neutral recovery/cooldown, token replay/atomic consumption, Operator identity, distinct PINs, inactive login rejection, reset authorization and reactivation conflicts.
- Headless Chrome on Windows: passed the full authentication flow through the actual application components, Router and mock service in a local SPA validation harness. Checked required/live errors, formatted Owner ID, empty initial ID, password entry and failure, lock/PIN unlock, progressive PIN masks, role switching, registration success, actual name/ID summaries, optional setup and Skip for Now, Operator creation/identity, direct Owner-route denial for an Operator, full logout, neutral recovery confirmation/cooldown, verified-link reset and completion. The success toast remained at six seconds and expired by sixteen seconds without removing the success page.
- Additional browser checks passed password masking/visibility and preserved text/selection, recovery sending failure with retained email, and blocked invalid/used link forms. Missing links were checked in the main flow. Expired-link service behavior was tested with an injected clock; native expired-link UI was not tested.
- Compared Poppins-rendered screenshots against the supplied sheets at **390 × 844**. Password login also had no horizontal overflow at **320 × 568**, **360 × 800** and **430 × 932**. These are browser viewports, not devices. Screenshots/results are in `.expo/authentication-review/`; local runners are `.expo/authentication-acceptance.cjs` and `.expo/authentication-edge-final.cjs`. The SPA harness is validation tooling only, outside application code.
- Standard Metro browser reloads hit Windows `EMFILE` and Expo development/static-render unknown-module errors. The SPA harness used the same Metro client application bundle without SSR to finish interaction/visual checks. Standard web SSR/direct-reload behavior remains unverified; no stack/configuration upgrade was made to mask this tooling issue.
- **Android runtime: not tested.** ADB reported no attached device or emulator. Keyboard/safe areas/back behavior, native font rendering and screen-reader behavior need a device/emulator.
- **iOS runtime: not tested.** This Windows host has no iOS simulator or connected iOS device. Keyboard/safe areas/back gestures, native font rendering and VoiceOver need a device/simulator.
- No native APK/IPA build, commit, push, deployment, publication or real email delivery was performed. Local platform bundle results are recorded separately below.

The final all-platform production export completed successfully with `npx expo export --platform all --output-dir .tmp/authentication-bundles --max-workers 2 --clear`: Android and iOS JavaScript/Hermes bundles and web static routes were generated. This is bundle compilation/export only, not an APK/IPA build or native runtime validation. Logs are `.expo/authentication-bundles.log`. An incremental final export rechecks the last session-draft/autofill refinement; its result is recorded below.

The incremental export also **passed** on the final source, generating Android/iOS bundles and web static routes; see `.expo/authentication-bundles-final.log`. Final lint, typecheck and all **144 tests** passed again. The last Operator setup fields-only card/storefront spacing adjustment passed those checks and bundle compilation; the saved setup screenshot predates that visual adjustment. Native visual validation remains outstanding on both platforms.

`src/services/mock-auth.ts` remains a legacy fixture checker for regression tests. It is no longer the application login entry point and does not establish the new device session; connect production authentication through `src/services/authentication.ts` and update the session-kind/identity mapping in `src/state/auth-flow.tsx` for the agreed real session protocol.
