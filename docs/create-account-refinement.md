# Create Account refinement — November 13, 2026

Reviewed `AGENTS.md`, MA-LOG-001/002/003 in the original workbook's named MAY-ARI MODULE, the corresponding copy-sheet differences, existing registration notes, and `docs/designs/MA-LOG-001.png`. The main sheet combines success and ID details and uses different success wording; the copy sheet and existing approved screens separate them. This refinement preserves the current wording, Email field, separate pages, registration adapter, validation, account state, route guards, and explicit button navigation. Original requirements are unchanged. These positioning notes supersede the historical fixed success-card positioning in `registration-screen.md`.

## Changes

- Shared `FormField` uses Text Primary (`#0C1B3C`) for entered text, including secure passwords and revealed PINs. Placeholder color is independently derived at 60% alpha; help text uses 75% alpha. Filled PIN masks also use Text Primary. Input/border opacity is unchanged. Existing caller overrides and native PIN masking remain supported.
- Paired bundled eye/eye-off SVG outlines replace the improvised rounded rectangle. Both use the same 24-unit canvas, two-unit rounded stroke, shared 20-point button icon size, and interaction color. The existing accessible Show/Hide labels, 48-point minimum button target, controlled value, focus and selection restoration are retained. The files use cubic curves and separately defined circles, avoiding compact SVG arc syntax that the Expo Image documentation identifies as problematic on iOS.
- Both result screens share `RegistrationResultLayout`. `AuthBackground` already applies all safe-area insets; the new layout centers the main content in the remaining region between the progress/notice area and actions. It distributes surplus height around the content instead of putting all of it below the card. With insufficient height or larger text, content and actions retain their intrinsic sizes and scroll together. The toast retains its measured slot after dismissal.

## Animation investigation and fix

The success check contains native Views, not an animated SVG. Previously, two rotated strokes grew from zero width/height using JavaScript-driven `Animated.timing`. The Animated values were initialized only on mount, with no reset when a retained screen regained focus or its effect restarted. That is a concrete replay/lifecycle defect. Zero native stroke bounds and per-frame layout updates were also rendering risks during native screen entry; the precise cause of the reported iOS-only failure could not be reproduced without an iOS runtime.

The check now keeps both stroke bounds fixed and nonzero and draws them using native-driven scale/translation transforms. It waits for its host's first layout and an animation frame before starting. A memoized Expo Router focus effect resets both strokes on entry and cancels the pending frame and animation on blur or unmount. Re-renders and repeated layout events do not restart it. Completion leaves the full check visible; there is no completion callback or navigation in the animation.

The shared MotionProvider supplies the live reduced-motion preference. Reduced motion, small marks, and nonanimated marks render completed strokes directly, and switching to reduced motion unmounts/cleans up the animated child. No new animation or SVG dependency was installed.

API references checked against the installed Expo SDK 58: [safe-area context](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/), [Expo Router focus effect](https://docs.expo.dev/versions/v58.0.0/sdk/router/#usefocuseffecteffect-do_not_pass_a_second_prop), [Expo Image SVG support](https://docs.expo.dev/versions/v58.0.0/sdk/image/), and [React Native Animated native driver](https://reactnative.dev/docs/animated#using-the-native-driver).

## Files

- `src/components/ui/form-field.tsx`
- `src/components/ui/visibility-icon.tsx`
- `assets/images/auth/eye.svg`, `eye-off.svg`
- `src/components/auth/registration-result-layout.tsx`
- `src/components/auth/account-created-screen.tsx`
- `src/components/auth/owner-id-screen.tsx`
- `src/components/auth/success-mark.tsx`
- `tests/auth-validation.test.cjs`: existing static renderer now resolves the project's asset alias and Expo Image adapter.
- `tests/success-mark.test.cjs`: focused lifecycle checks without adding a test dependency.
- This document.

## Verification

- `npm run lint` and `npm run typecheck`.
- `node --test tests/auth-validation.test.cjs tests/authentication-service.test.cjs tests/mock-auth.test.cjs tests/success-mark.test.cjs`: 40 passing tests, including layout-before-start, single start, focus replay, cleanup/cancellation, persistent final state, and reduced-motion static rendering. These tests isolate animation scheduling; they do not emulate native rendering.
- `npx expo export --platform android --platform ios --output-dir .expo/registration-refinement/native-export`: both Hermes bundles compiled, including the new SVG assets. No signed native builds were run.
- Headless Chrome: both result screens at 320×568, 360×640, 390×844, 412×915, and 430×932. Simulated top/bottom insets ranged from 20/16 to 59/34 points. Checked horizontal overflow, scroll access to actions, larger text on the smallest size, and visually inspected large-screen success/ID screenshots. Normal 390/430-point screens show the main content and actions together; short screens scroll.
- Browser interaction checks confirmed full-opacity entered text, separate placeholder alpha, password/PIN values, focus and selection after real pointer toggles, minimum touch targets, intermediate animation frames, reduced motion, a retained success route, and explicit Continue navigation. Two further fresh mock registrations both animated and retained the completed check without automatic navigation; manual toast dismissal kept the card in place. Local scripts, screenshots, and measured results are under `.expo/registration-refinement/` and are ignored artifacts.
- Android native runtime: **not tested**. ADB was available; `adb devices -l` reported no connected device or emulator. Physical-device positioning, native keyboard behavior, system back, TalkBack/text scaling and actual animation rendering still need Android validation.
- iOS native runtime: **not tested**. This Windows environment has no iOS simulator or connected iOS runtime. Native SVG decoding, secure-input focus, VoiceOver/text scaling, gestures and the reported animation failure still need iOS validation. Browser checks and bundle compilation do not establish native runtime correctness.

Pre-existing unrelated workspace edits were preserved. No dependencies, native configuration, backend behavior, commits, or publishing were changed.
