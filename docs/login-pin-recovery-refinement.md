# Login and PIN recovery refinement — November 13, 2026

Reviewed root AGENTS.md and the original workbook's named MAY-ARI MODULE stories
MA-LOG-001/003/005/006 and KAHERA MODULE KH-LOG-001/002/003.
Compared the copy-owner rows; their differing invalid-credentials wording and
ID/success timing were not merged. The existing authentication handoff supersedes
the workbook's older PIN-only first login and recovery examples. The current
password-first device authentication, PIN unlock, Operator login and recovery
routes are preserved. Original requirements and design exports are unchanged.

The actual reference directory is `docs/designs/`, rather than a root `designs/`.
Inspected MA-LOG-005, MA-LOG-006 and the supplied icon sheet. The MA-LOG-006 image
contains recovery screens, although the workbook's story with that ID concerns
module access. No standalone envelope illustration was supplied. The bundled
transparent SVG traces the open-envelope outline from the reference's fourth
panel, including its blue color and rounded treatment. It uses contain sizing
at 128 × 128 without the reference's overlapping toast or device chrome.

## Behavior

- Owner Login's reminder margin increases from 8 to 16 points. The existing
  scroll, safe-area background, fonts, buttons and colors remain shared.
- Successful registration, password login and verified Owner PIN unlock remember
  the canonical Owner ID. Successful Operator login remembers the canonical store
  Owner ID in a separate `cashier` role slot, rather than an internal Operator ID.
  Failed authentication never selects or overwrites an identity.
- Returning screens show readable, selectable, non-editable Owner ID text.
  First access without a hint retains the existing input. The live Owner device
  session's ID takes precedence in PIN mode. Role selection never borrows the
  other role's hint. Restoring login details finishes before the form is shown.
- Switch Account revokes the current mock session, forgets the selected role's
  hint, clears sensitive drafts and returns through the existing chooser.
  Change Role keeps its existing behavior and retains the valid device session.
  Full logout continues to require password authentication, retaining the ID hint.
- Identity and credential share the existing measured KeyboardField region, so
  keyboard scrolling can keep both visible. Very short viewports or exceptionally
  large text prioritize the native editor through the existing keyboard utility.
  Entering the fourth PIN digit only changes form state; Log In is required.
- Forgot PIN removes only the required-fields note. The asterisk, inline errors,
  input semantics and first-invalid focus remain.
- Check your Email uses a flexible, vertically centered illustration/title/body
  group between the toast/header and bottom actions. The description has a
  320-point maximum width; small screens and larger text can scroll. Dismissing
  or expiring the toast preserves its existing slot and avoids moving the group.
  Neutral recovery wording, resend cooldown and existing error handling remain.

## Persistence and backend integration

The existing AuthenticationService owns remembering/restoring/switching. Its small
storage seam uses the already-installed Expo FileSystem on Android/iOS, storing
`remembered-login-identities.json` in the app's document directory. The web adapter
uses `tindahand.remembered-login-identities` in localStorage. The only persisted
values are validated Owner IDs keyed by role. No PIN, password, email, name,
session credential or recovery token is persisted. Corrupt or unavailable storage
falls back to first login and never grants access. No dependencies were changed.

**Cold restart limitation:** The mock still has no durable device sessions or
accounts. A full process restart restores the displayed ID, but Owner login
requires the existing password step before PIN unlock becomes available again.
Persisting an ID cannot safely restore authenticated device status. A production
PIN-after-restart flow needs the existing proposed secure session/API adapter;
this refinement does not invent a local credential or weaken PIN/session checks.
Newly registered mock accounts themselves remain ephemeral.

Explicit BACKEND INTEGRATION comments in `src/services/authentication.ts` mark
remembered-identity restoration versus secure session restoration, API PIN
verification/rate limiting, and API session revocation during account switching.
The adapter must remember canonical identities only after successful API results.
Replace the mock as a unit, without a fallback to mock success on API failure.

## Changed files

- `src/components/auth/role-login-screen.tsx`
- `src/components/auth/pin-recovery-screen.tsx`
- `src/components/ui/form-field.tsx` (optional keyboard context slot)
- `src/services/authentication.ts`
- `src/services/remembered-identities.ts`
- `src/services/auth-identity-storage.ts`
- `src/services/auth-identity-storage.web.ts`
- `src/state/auth-flow.tsx`
- `src/types/auth.ts`
- `assets/images/auth/recovery-envelope.svg` and `README.md`
- `tests/authentication-service.test.cjs` and `tests/keyboard.test.cjs`
- `tests/helpers/identity-storage.cjs`; the existing auth-validation, profile and
  avatar test loaders inject this native persistence seam.
- This note and `docs/authentication-handoff.md`.

Existing unrelated working-tree changes were preserved. No commits, pushes,
deployments, native configuration changes or dependency changes were made.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: all 188 tests passed. New behavioral coverage includes failed-login
  persistence, canonical identity restoration across fresh service instances,
  wrong-ID/wrong-PIN rejection, distinct stores across roles, switching/forgetting,
  corrupt/unavailable storage and grouped ID/PIN keyboard scrolling.
- `npx expo export --platform android --platform ios --output-dir .expo/login-recovery-bundles`:
  both Hermes bundles passed. This is compilation, not a native build or runtime test.
- Chrome browser interactions passed first login/validation, invalid password,
  correct password, lock/PIN unlock, invalid PIN, fourth-digit non-submission,
  Owner/Operator role isolation, Operator login and remembered store ID, full page
  reload restoring the ID without a session, explicit account switching, recovery
  validation and neutral confirmation. There were no application runtime exceptions.
- Browser layouts at 320 × 568, 360 × 640, 375 × 667, 390 × 844 and 430 × 932
  confirmed the 16-point reminder gap, aligned actions, no page-width overflow,
  contained square illustration, centered group and separation from controls.
  The card fits without scrolling at 390 × 844 and 430 × 932; smaller screens scroll.
  A 280-point scroll viewport retained the visible ID and focused PIN; doubled
  browser text remained scrollable. These proxies do not validate native keyboards,
  native accessibility text scaling or device safe areas.
- **Android runtime: not tested.** No device/emulator was reached. Installed ADB
  fails during initialization with `Cannot mkdir '\\.android': Permission denied`,
  including with an in-workspace Android user directory. Native persistence,
  keyboard, small-screen safe areas, system Back and TalkBack remain unverified.
- **iOS runtime: not tested.** This Windows host has no iOS simulator or connected
  iOS testing tools. Native persistence, keyboard, small-screen safe areas, back
  gestures and VoiceOver remain unverified. No Android/iOS native build was run.

Ignored local artifacts: `.expo/login-recovery-browser.cjs`,
`.expo/login-recovery-review/*.png`, `results.json` in that directory, and the
platform bundles under `.expo/login-recovery-bundles/`.
