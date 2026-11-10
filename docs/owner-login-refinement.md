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
