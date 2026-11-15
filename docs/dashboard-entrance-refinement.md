# Dashboard chips and focus entrance

Reviewed root AGENTS.md, the requirements engineering document, MAY-ARI MODULE MA-DASH-001–007 acceptance criteria in the original workbook, and the supplied `docs/designs/MA-DASH-001.png` and `MA-DASH-002.png` exports before editing. The named owner sheet remains the baseline. Its older Financial Overview/Store Health labels and the copy sheet's separate growth, capital, ranking and stock remarks remain unresolved source differences; this refinement preserves the existing Sales Report/Stock Health presentation and calculations. Original requirements and design exports are unchanged.

Neither the current Dashboard nor these exports includes Sales Report chevrons. The chips therefore align to the existing card's inner content edges; no date controls were added.

Daily, Weekly and Monthly each occupy one equal flex slot. Their compact pill surfaces stretch across those slots with the existing four-point gaps, standard card padding, centered single-line labels, selected colors and 48-point minimum touch targets. Existing selection and filtering handlers are unchanged. Horizontal pill padding uses the existing eight-point spacing token so Monthly fits on narrow phones.

`FocusRise` wraps each entire card in order: Cash on Hand, Sales Report, Stock Health, Top Selling Items and Recent Activity. One Reanimated progress value per card drives opacity 0→1 and translateY 20→0, using a 400 ms cubic ease-out and 60 ms stagger. Wrappers change only visual opacity and translation; they add no padding, margins, clipping, scale or pointer blocking. Card content, borders, shadows and layout remain owned by the existing cards. Header, bottom navigation and FAB stay outside the wrappers.

The memoized Expo Router focus effect prepares the sequence on initial focus and each subsequent focus. On Android and iOS, the entrance waits for the opening native-stack `transitionEnd` (screen appearance), so its duration is not spent behind the screen transition. Web starts directly on focus. Native routes without a transition event have a bounded fallback; a reported transition gets a longer watchdog. Filter/data/preview/overlay renders do not change the focus callback. Blur and unmount cancel pending timers/listeners as well as delayed/running animations and restore the final visible position. The shared live reduced-motion provider shows final positions immediately and cancels a pending or active entrance when enabled. Disabling reduced motion does not restart the current visit.

Browser verification exposed Home's previous `navigate` call creating another Dashboard instance. The shared navigation component now uses `dismissTo('/owner-dashboard')` when returning from another screen, preserving the retained Dashboard's filters, data and scroll. The existing navigation guard still wraps the action. Pressing Home while already on the Dashboard retains its scroll-to-top callback; other destinations and drawer behavior are unchanged.

Files changed for this refinement:

- `src/components/dashboard/dashboard-cards.tsx`: stretch the period chips.
- `src/components/dashboard/owner-dashboard-screen.tsx`: wrap the five cards.
- `src/components/dashboard/dashboard-navigation.tsx`: return Home to the retained route.
- `src/components/ui/focus-rise.tsx`: reusable focus entrance and cancellation.
- `tests/focus-rise.test.cjs`: focus, ordinary renders, cancellation, rapid focus changes and reduced motion.
- `tests/dashboard-navigation.test.cjs`: retained Home return, navigation guard, existing Home callback and Inventory destination.
- This document.

No dependencies, fixtures, services, API interfaces, authentication rules or native configuration changed. Pre-existing unrelated workspace edits were preserved.

Verification on November 14, 2026:

- `npm run lint` and `npm run typecheck`: passed.
- `node --test tests/focus-rise.test.cjs tests/dashboard-navigation.test.cjs tests/auth-validation.test.cjs`: all 31 tests passed.
- Headless Chrome at 320, 360, 390, 430 and 768 pixels: all three periods have equal chip widths (within subpixel rounding), balanced inner edges, compact single-line labels and at least 48-point touch targets. Narrow and wide screenshots were visually inspected.
- Browser animation sampling: initial entry and retained Home returns replay in order; card layout and navigation/FAB positions remain fixed. Filter changes, Add Cash, Quick Add and More Tools opening/closing, and a saved cash update do not restart card entrances. Home return preserves the selected period and exact scroll offset. Rapid navigation finishes with all cards visible; period selection works during entry. Emulated reduced motion skips entrances and enabling it mid-animation ends movement immediately. At maximum scroll, Recent Activity clears the fixed navigation; final screenshots were visually inspected.
- `npx expo export --platform android --platform ios --output-dir .tmp/dashboard-entrance/native-bundles-verified`: both Hermes bundle exports passed. These are bundle compilation checks, not native builds or runtime tests.

Android runtime: **not tested**. ADB reported no connected device or emulator. No native Android build was performed.

iOS runtime: **not tested**. This Windows host has no iOS simulator or connected iOS device session. No native iOS build was performed.

Both platforms still need native checks for initial/refocus/rapid navigation, system reduced motion, touch responsiveness, scrolling, safe areas, shadow rendering, large accessibility text and animation smoothness. Browser checks do not establish native frame rate or device behavior. Local browser scripts, animation samples, screenshots and bundle exports are ignored under `.tmp/dashboard-entrance/`.

## Android visibility follow-up

The user reported no evident card animation on Android with reduced motion off. The original implementation started at route focus, before the native screen finished appearing. This could consume most or all of the short entrance behind navigation. `FocusRise` now waits for native appearance without changing the requested 20-point rise, opacity, 400 ms duration or 60 ms stagger. Event/fallback starts are limited to once per visit. Closing transitions, stale events after blur/unmount, and disabling reduced motion cannot start a second entrance.

Changed for this follow-up: `src/components/ui/focus-rise.tsx`, `tests/focus-rise.test.cjs` and this document. No dependencies or application configuration changed.

Follow-up checks: lint and TypeScript passed; all 34 targeted Dashboard/navigation/auth tests passed, including native presentation, absent/interrupted events, and cancellation while waiting. The browser regression passed again. Both Android and iOS Hermes exports passed into `.tmp/dashboard-entrance/native-presentation-fix/`.

Native Android verification was attempted using the installed Medium_Phone emulator (`emulator-5554`) and Expo Go 58.0.5. An initial manifest HTTP 500 was bypassed using the CLI's offline development mode (process-only configuration). The emulator repeatedly reported “System UI isn't responding.” Restarting System UI allowed the Welcome/Owner Login screens to display, but input injection subsequently stalled. Metro also terminated with `EMFILE` (too many open files) during the session. These environment failures prevented reliable Dashboard visual validation; no passing Android animation runtime result is claimed. iOS runtime remains untested because no simulator/device session is available on this Windows host.
