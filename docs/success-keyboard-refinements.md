# Success checks and keyboard visibility — November 13, 2026

Reviewed `AGENTS.md`, the named MAY-ARI and KAHERA workbook sheets, the existing registration, motion, sheet and form implementations, and the MA-LOG-001 eye assets. Relevant stories include MA-LOG-002/003/004, MA-INV-002/006, MA-AST-002, MA-AR-002/003, MA-AP-002/003, MA-MT-003, MA-PRO-001 and their applicable Kahera counterparts. Existing documented disagreements about registration wording and sequence are preserved. The original source requirements remain unchanged. This note supersedes the animation implementation described in `create-account-refinement.md`.

## Eye icons and toast

Both bundled eye outlines now have `stroke-width="3"`, increased from 2. Their geometry, 24-unit viewBox, rendered size, interaction colors, alignment, accessible Show/Hide labels and 48-point minimum touch targets are unchanged.

The registration toast uses the full available width instead of a 300-point maximum. Its icon, title and dismiss button share the first row; the message gets a full-width second row. “You can now start using TindaHand.” stays on one line, with the existing 10-point Poppins size and a modest fit allowance for constrained space. Custom messages, including long Operator names, retain normal wrapping. The completion deadline, timeout cleanup, manual dismissal and measured empty slot are unchanged; the initial registration deadline remains 15 seconds.

## Animation findings and fix

Two success implementations existed: the registration check used React Native Animated and route focus, while debt/expense confirmations used a separate Reanimated pulse around a static SVG. A component's mount or route focus did not establish that a native modal had finished opening. Retained exit content could also retain stale animation props. The registration strokes previously reached zero scale, so interruption could leave an empty mark. Neither approach offered a common, explicit fallback for the completed check.

A preference bug was reproduced in the browser: load with reduced motion enabled, then disable it while the app remains open. The application's MotionProvider observes the live preference, while Reanimated's default `System` reduction can retain the startup setting. The caller could request animation and the engine would finish it immediately. The installed Reanimated implementation and [its startup-preference documentation](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/) confirm the distinction. This explains a reproducible suppressed-animation case; the exact cause on the reported physical Android and iOS devices still needs native reproduction.

`SuccessCheck` now owns all animated success marks. It draws a completed check with fixed native Views, avoiding font-glyph and SVG decoding dependencies. The existing check SVG used ordinary circle/line geometry; no malformed compact arc was found, so the native failure is not attributed to an unverified SVG bug.

The completed mark receives one 400 ms Reanimated emphasis, using nonzero scales throughout. The shared live MotionProvider is the single authority for reduced motion: a true or unavailable preference produces a static completed check. Only after that gate permits animation do the sequence and timing functions use `ReduceMotion.Never`, preventing a conflicting cached startup setting from suppressing the permitted sequence. Enabling reduced motion during playback cancels it and restores scale 1.

The check starts after layout and an animation frame. Modal/overlay hosts publish their fully opened visibility through `PresentationContext`; context changes reach retained children even while their props are frozen for exit. Page checks use a route adapter and the existing shared stack-entry duration. A stable success-event ID restarts a reused component for new records. Visibility changes, event changes and unmount cancel timers, pending frames and animations. A deadline restores the settled scale if completion is interrupted or unavailable. The completed strokes remain visible independently of animation progress. No animation callback performs navigation or dismissal.

| Confirmation | Shared integration |
| --- | --- |
| Owner account created | SuccessMark route adapter → SuccessCheck, keyed by completion ID |
| Initial Operator account created | SuccessMark, keyed by Operator ID |
| Settings Operator account created | SuccessMark, keyed by Operator ID |
| Customer debt saved | QuickAddSuccess → SuccessCheck, keyed by record ID |
| Store debt saved, including repeat openings | Same QuickAddSuccess integration |
| Expense recorded | Same QuickAddSuccess integration |
| Toast badges | Static small SuccessCheck |
| Financial status, settings option icons and inventory selection checks | Static indicators; not success-event animations |

Standalone debt/expense forms that already save and navigate from their explicit Save action retain that behavior. No new timed navigation was added.

## Keyboard findings and fix

Registration scrolled to stored field offsets on focus, before the keyboard resized its viewport. Other forms often had KeyboardAvoidingView without focused-field scrolling. Custom headers and safe areas were not consistently represented in keyboard offsets. Scrolling to an editor alone also did not ensure its label, help or error was visible.

The new shared primitives complement the existing keyboard avoidance patterns, following the [SDK 58 keyboard guidance](https://docs.expo.dev/guides/keyboard-handling/):

- `KeyboardViewport` measures its screen position, including custom headers and safe areas, for the keyboard offset. An explicit caller offset, such as POS's existing measured offset, takes precedence; the values are not added together.
- `KeyboardAwareScrollView` compares the focused region with the measured scroll viewport and keyboard top. It scrolls the minimum necessary distance after focus, viewport/content layout changes, keyboard show/frame changes and a short settling check. It adds no keyboard padding and disables automatic keyboard insets because the host already owns avoidance.
- `KeyboardField` preserves the shared field layout while measuring its label, input, help and inline error together. If that whole region cannot fit with larger text, the editor takes priority. A zero-size region falls back to the measured native input.
- `KeyboardInput` retains the controlled value, selection, forwarded native ref, focus order, input types and caller events. These helpers never call focus. Existing explicit Next/validation actions still choose the next or invalid field.
- Stale asynchronous measurements are rejected after focus/layout changes, unmount and sheet-gesture changes. The resizable sheet pauses automatic adjustment during handle resizing and rechecks after release. Its handle remains the only resize gesture owner.
- Existing native drag-to-dismiss keyboard behavior is retained. A browser-specific fix prevents React Native Web's `on-drag` implementation from blurring a focused input during programmatic scrollTo; actual browser touch drags can still dismiss it.

Registration's stored-offset pre-scroll was removed. The shared controls and form frames now cover authentication/recovery, Settings PINs, Profile, Inventory/product/asset/batch fields, customer/store debt and payment forms, expenses, POS forms, report filters and transaction filter sheets. Search controls use the same input adapter. Non-sheet inventory form modals also receive safe-area-aware keyboard avoidance. Existing form validation, services, data, role gates and save behavior are preserved.

## Changed files

Core: `src/components/ui/keyboard-aware-scroll-view.tsx`, `success-check.tsx`, `form-field.tsx`, `motion-content.tsx`, `motion-modal.tsx`, `motion-overlay.tsx`, `resizable-sheet.tsx`; `src/state/presentation.tsx`; `src/utils/keyboard.ts`.

Authentication: `src/components/auth/registration-screen.tsx`, `registration-toast.tsx`, `success-mark.tsx`, `account-created-screen.tsx`, `operator-setup-screen.tsx`, `role-login-screen.tsx`, `pin-recovery-screen.tsx`; `assets/images/auth/eye.svg`, `eye-off.svg`; `src/i18n/en.ts`.

Other shared controls/frames: Dashboard `add-cash-modal.tsx`, `quick-add-modal.tsx`, `quick-add-success.tsx`, `quick-add-ui.tsx`; Financial `financial-frame.tsx`, `report-filters.tsx`; Inventory `inventory-ui.tsx`, `inventory-screen.tsx`; Payables `payables-ui.tsx`; Receivables `receivables-ui.tsx`; POS `credit-product-browser.tsx`, `payment-screen.tsx`, `product-browsing-screen.tsx`; Profile `profile-frame.tsx`; Settings `settings-frame.tsx`, `cashier-screens.tsx`; Transactions `transaction-filter-sheet.tsx`, `transaction-history-screen.tsx`. Many of these integrations only replace native imports with the shared adapters.

Tests: `tests/auth-validation.test.cjs`, `tests/success-mark.test.cjs`, `tests/keyboard.test.cjs`. Existing static semantics tests isolate the keyboard adapter; focused scrolling is checked with geometry tests and mounted browser interactions.

## Verification and limits

- `npm run typecheck`; `npm run lint`.
- `npm test`: 184 passing tests. New coverage includes minimal scroll movement, keyboard/viewport double-offset avoidance, short or unmeasured regions, layout/presentation readiness, repeated events/openings, cancellation, fallback, and changes to the live reduced-motion preference.
- Android and iOS Hermes exports succeeded using `npx expo export --platform android --platform ios --output-dir .expo/success-keyboard/native-export-final`. This is bundle compilation, not a signed build or native runtime test.
- Headless Chrome: lower registration PINs and validation, switching fields, keyboard Next, password help and viewport-height changes. Checked no focus on page entry and preserved input values. Toast text was measured as one complete line at 320, 360, 390 and 430 px, including 16 px simulated side insets at 320 px. Checked route re-entry, intermediate animation frames and live reduced motion.
- Browser sheet checks: customer debt, store debt, expense and a repeated store-debt opening; lower date fields, switching to amount, multiline details, focus retention and explicit Done dismissal. All four animated confirmations ran; a fifth expense confirmation stayed static with reduced motion. No runtime JavaScript exceptions were recorded in the passing runs.
- Additional 320 px browser checks passed for the lower Settings confirmation PIN, Inventory selling price, and Profile email with an inline validation error. All remained focused and fully within a constrained scroll viewport; no edits were saved in these checks.
- Browser keyboard checks use constrained measured viewports to simulate the space above a keyboard. They do not exercise a native IME, native KeyboardAvoidingView behavior or native sheet gestures. Local scripts, screenshots, measurements, frame samples and logs are under ignored `.expo/success-keyboard/`.
- The local Metro watcher hit the Windows open-file limit during parallel bundling. Restarting the preview in CI/no-watch mode allowed the remaining browser checks to complete without changing project configuration.
- **Android physical runtime: not tested.** ADB reported no connected phone. **Android emulator runtime: not tested.** None was connected. Native keyboard behavior, gesture interaction, actual safe-area coordinates, accessibility text scaling and the reported physical-device animation failure remain to be checked.
- **iOS runtime: not tested.** This Windows environment has no iOS simulator or connected iOS runtime. Native animation rendering, keyboard transitions, secure-field behavior, safe areas and VoiceOver still need validation on iOS.

No dependencies, native build configuration, backend logic, original requirement documents, commits or publishing were changed for this refinement. Pre-existing unrelated workspace edits were preserved.
