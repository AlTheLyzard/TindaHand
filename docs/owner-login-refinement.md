> Authentication update (November 9, 2026): [authentication-handoff.md](authentication-handoff.md) supersedes historical auth behavior below, including Cashier-ID login, PIN-only first access, registration preview and chooser-on-skip instructions.

# Owner Login refinement

Implemented November 4, 2026. Frontend and existing opt-in mock authentication only.

## Requirements and decisions

Read `AGENTS.md`, the original requirements workbook's **MAY-ARI MODULE** stories MA-LOG-003, MA-LOG-005 and MA-LOG-006, and the supporting project charter's Owner Login section. The source example is `TH-MA-0001`: separators follow the first two and next two characters. PINs remain masked strings of exactly four ASCII digits, including leading zeroes.

The **Copy of MAY-ARI MODULE** changes MA-LOG-005's invalid-credentials text from “Incorrect. Please enter correct PIN.” to “Incorrect. Please enter correct credentials.” That discrepancy remains unresolved; this refinement preserves the application's existing authentication-failure notice and recovery behavior. Source requirement documents are unchanged.

The existing handler authenticates the fictional `TH-DEMO-OWNER` fixture in development. Formatting and validation retain that exception, including entry without hyphens. No credentials or ID fixtures were changed. Standard IDs validate against the existing `TH-MA-0001` shape; the backend ID-generation contract remains deferred.

## Behavior

- Owner ID entry uppercases letters and inserts the two separators. Manually typed or pasted separators are accepted without duplication. Selection mapping preserves earlier edits, replacement selections, and backspace across separators, including repeated digits. Hyphens alone are empty.
- The persistent note above the first field reads “Fields marked with * are required.” Owner Login labels use red asterisks in the shared form field's existing error red, `#B42318`; label text keeps its existing color. Other forms retain their existing required-label style.
- No validation errors appear initially. Blur enables validation for that field; submission enables all applicable errors and focuses the first invalid input before any login handler can run. Errors revalidate on every change. Missing values use “Enter your Owner ID.” and “Enter your PIN.” Nonempty invalid values use ID-format or existing four-digit PIN validation.
- Required semantics and current errors are included in each input's accessibility label. Inline errors retain alert semantics and a polite live region. Screen-reader speech has not been tested on devices.

## Changed implementation files

- `src/components/auth/role-login-screen.tsx`: formatting, selection, touched state, note and label options.
- `src/components/ui/form-field.tsx`: opt-in asterisks and accessible validation labels.
- `src/utils/owner-id.ts`: ID formatting, selection mapping and syntax validation.
- `src/utils/account-access.ts`: separate required and malformed validation.
- `src/i18n/en.ts`: note and validation copy.
- `tests/auth-validation.test.cjs`, `tests/mock-auth.test.cjs`: regression coverage for entry, cursor mapping, validation, accessibility markup and formatted demo login.

## Verification

Shared checks passed: `npm run typecheck`, `npm run lint`, and `npm test` (100 tests).

Chrome browser interaction checks passed against Expo's local development server with the existing mock-auth flag enabled:

- Initial note and asterisks, required accessible labels, no initial error alerts.
- Leaving Owner ID empty shows only its error.
- Submitting both fields empty shows both errors, focuses Owner ID and stays on Login.
- Typing clears each required message immediately; incomplete values show format errors; complete values clear them.
- Lowercase typing and paste, formatted and duplicate-hyphen paste, backspace across each separator, deletion among repeated digits, and replacement of earlier characters retain the expected text and cursor position.
- The note stays visible during entry. No horizontal overflow at 320×568 or 390×844.
- Lowercase unformatted demo ID plus valid PIN is accepted and navigates to `/owner-dashboard`.

Review images: [Initial](validation/owner-login/initial.png), [both fields empty](validation/owner-login/both-empty.png), [corrected fields](validation/owner-login/corrected.png). These are browser captures.

**Android runtime: not tested.** Started the existing `Medium_Phone` AVD (`sdk_gphone16k_x86_64`), but it did not finish booting; package-service calls initially failed, and Expo Go could not resolve the launch activity. Stopped the emulator after the failed launch. No native typing, paste, cursor, keyboard, TalkBack or login behavior was validated.

**iOS runtime: not tested.** This Windows environment has no iOS simulator or connected iOS testing tools. VoiceOver and native iOS typing, paste, backspace, keyboard and focus behavior remain unverified.

No Android/iOS platform bundle compilation or native build was performed. Browser checks and shared tests do not constitute native runtime validation.

## Action row and reminder spacing — November 11, 2026

Reviewed `AGENTS.md`, the named MAY-ARI MODULE's MA-LOG-003/005/006 criteria,
the current authentication handoff, button tokens and the saved MA-LOG-001 artwork.
The current request supersedes the handoff's previous login-screen logout shortcut.
The existing password-on-new-device/PIN-on-authenticated-device behavior and
recovery action availability are preserved.

`src/components/auth/role-login-screen.tsx` removes Log Out and Use Password.
Change Role stays on the left, with the existing left-arrow SVG before its label;
Forgot PIN? is on the right in PIN mode. The arrow uses a 20-point canvas,
the SVG's existing 1.6-unit stroke and accent blue (`#2F6CC9`). Both buttons reuse
the shared Button's typography, minimum 50-point height, semantics, disabled state
and press feedback. A horizontal ScrollView allows longer scaled labels to stay
on one line and remain reachable on narrow screens. No text scaling is disabled.

The Owner reminder card follows the action row with an 8-point margin instead
of a flexible spacer plus margins. Its existing content, colors and padding are
unchanged. The outer vertical scrolling, safe-area wrapper and platform-specific
keyboard avoidance remain intact. The Operator layout and authentication handlers
are unchanged.

Verification on the final implementation:

- `npm run lint` and `npm run typecheck`: passed.
- `npm test`: all 169 existing tests passed.
- Android and iOS Expo/Hermes bundle exports: passed. These are bundle compilation
  checks, not native builds or runtime testing.
- Chrome browser checks: 320×568, 360×640, 375×667, 390×844 and 430×932.
  Action labels have identical vertical positions, remain on one line and do not
  overlap; touch targets remain 50 points high. The card is fully visible without
  scrolling at 390×844 and 430×932; smaller viewports scroll. An 8-point gap and
  no horizontal page overflow were measured. The 320-point check with doubled
  text retained single-line action labels and allowed both scrolling directions.
- Browser interactions passed for password login, Lock App, PIN login, Forgot PIN
  navigation and Change Role retaining the PIN session. A focused-input check
  at 320×320 confirmed scrolling to Log In and successful submission. Reduced
  viewport height and browser text scaling do not reproduce native keyboards or
  system accessibility settings.
- Android runtime: **not tested**. The installed ADB executable could not
  initialize (`Cannot mkdir '\\.android': Permission denied`), so no device or
  emulator session was available. Native keyboard, small-screen safe areas,
  system text scaling and TalkBack remain unverified.
- iOS runtime: **not tested**. This Windows host has no iOS simulator or connected
  iOS runtime. Native keyboard, safe areas, system text scaling and VoiceOver
  remain unverified.

Local browser scripts, measurements, screenshots and bundle outputs are under
`.expo/owner-login-actions*` (ignored artifacts). No native builds were run.

## Login identity and spacing — November 15, 2026

Reviewed root `AGENTS.md`, the original workbook's named MAY-ARI MODULE stories
MA-LOG-001/003/005/006 and KAHERA MODULE KH-LOG-001/002/003, the current
authentication handoff, and existing form, button, typography and spacing tokens.
The copy-owner sheet's differing invalid-credentials wording and ID/success timing
remain unresolved and were not merged. The existing password-first authentication
and authenticated-device PIN unlock remain unchanged. This request supersedes
earlier refinement notes that added Switch Account and a required-fields notice.
Source requirements remain unchanged.

`src/components/auth/role-login-screen.tsx` now shows a subtle, regular-weight
Owner ID label above the full, selectable ID in the existing primary text color.
The identity has no input decoration or edit action. It remains inside the
credential's measured keyboard region, preserving joint ID/PIN visibility.
Switch Account and its local handler are removed; the underlying authentication
and persistence services are unchanged. The required-fields notice is removed;
required asterisks, accessible labels, field validation and focus behavior remain.
The identity uses 4-point internal spacing and a 16-point gap before the PIN;
the form and Log In sections use 24-point margins from shared spacing tokens.
Change Role retains its arrow and left alignment, Forgot PIN? stays on the right,
and the reminder keeps its existing 16-point margin below the actions.

Validation:

- `npm run lint` and `npm run typecheck`: passed.
- Targeted authentication, login validation and keyboard tests: all 50 passed
  (`auth-validation`, `authentication-service`, `keyboard`, `keyboard-scroll`).
- **Android runtime:** tested on `emulator-5554`, `sdk_gphone16k_x86_64`, Android 17
  / API 37, Expo Go 58.0.5. Checked the normal 1080×2400 / 420-dpi configuration
  and a temporary 960×1704 / 480-dpi override (320×568 logical pixels). The full
  remembered ID is readable plain text; Switch Account and the notice are absent;
  the PIN asterisk remains. Action labels share the same vertical position.
  The normal-size PIN page fits without scrolling; the smallest screen permits
  scrolling to the reminder. With the native numeric keyboard open at 320×568,
  the ID and focused PIN stay above it. Dragging dismisses the keyboard and
  exposes the actions. Required-password and empty-PIN feedback, incorrect PIN
  rejection, explicit four-digit submission, successful `0123` unlock to the
  dashboard, Forgot PIN navigation, and Change Role retaining the PIN session
  were exercised. An ephemeral mock account matching the already remembered
  `TH-MA-0001` was initialized through the local debugger for these checks; no
  account data or fixtures in the repository were changed. At 150% system text
  size and 320×568, the complete ID remained readable and vertical scrolling
  exposed all content; the existing horizontal action row allowed each action
  to be fully revealed without changing its alignment. TalkBack was not tested.
  Temporary emulator size, density, text-scale and keyboard settings were restored.
- **iOS runtime: not tested.** This Windows host has no iOS simulator or connected
  iOS device. Native keyboard, safe areas, gestures and VoiceOver remain
  unverified. `npx expo export --platform ios --output-dir .expo/login-identity-ios
  --max-workers 2` passed; this checks Hermes bundle compilation, not a native
  build or runtime layout. No Android or iOS native build was run.

Local Android screenshots and UI dumps are in `.expo/login-identity-review/`;
the validation helpers and iOS bundle are also ignored `.expo/` artifacts.
No dependencies, native configuration, credentials or identity persistence were
changed. Existing unrelated working-tree edits were preserved.

## PIN layout and validation repair — November 15, 2026

`src/components/ui/form-field.tsx` now keeps the PIN control at the shared
48-point touch target in empty, focused, filled and error states. The input,
masked digits and visibility icon remain vertically centered. Helper and error
copy render below the control in normal flow with system-scaled line heights;
an error replaces the helper, and the helper clears when the PIN reaches four
digits. The PIN filter, four-ASCII-digit rule and real-time validation remain
unchanged.

`src/components/auth/role-login-screen.tsx` keeps the form from shrinking when
the available viewport changes, and lets the bottom actions wrap when the
screen or system text size needs more room. Shared field labels and button text
scale line heights with system text to avoid clipping.

Validation:

- `npx tsc --noEmit`, `npx expo lint`, and the targeted auth/keyboard tests
  passed (41 tests).
- Android runtime: the PIN validation, credential-error and visibility checks
  were tested on the `sdk_gphone16k_x86_64` Android 17 / API 37 AVD with Expo Go
  58.0.5. Covered normal 1080×2400 / 420-dpi and small 960×1704 / 480-dpi
  layouts at 150% system text, keyboard-open scrolling, empty/incomplete/valid-
  length PINs, incorrect credentials, and password/PIN visibility toggles.
  Field geometry stayed stable and helper/error messages did not overlap in
  those checks. The final measured scroll reserve for the Log In button was
  added afterward. A follow-up Expo Go launch stalled before the project loaded,
  so visibility of the button while the keyboard is open remains unverified on a
  device. Reset commands for the temporary display, density, text-scale and
  keyboard settings were sent before stopping the AVD.
- Android and iOS Expo bundle exports passed. iOS runtime was not tested because
  this Windows host has no iOS simulator or connected iOS device. No native
  build was run.
