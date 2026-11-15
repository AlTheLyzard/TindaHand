# More Tools description animation

November 14, 2026. This fixes descriptions remaining visible over feature titles after the sidebar's hide sequence.

Read root `AGENTS.md`, the existing sidebar/row, description sequence and drawer transition, design tokens, configuration, npm lockfile, and route/navigation implementation before editing. Reviewed the original workbook's named MAY-ARI MODULE and KAHERA MODULE sheets: MA-LOG-006, MA-DASH-007 and MA/KH More Tools. The copy owner sheet's different transaction-management criteria and remarks remain separate from the baseline. Existing unresolved destination/design remarks do not change this animation-only scope; original requirements remain untouched.

## Implementation

- `src/hooks/use-menu-descriptions.ts`: retain the single UI-thread clock, 55 ms typing, existing 15-second period (including typing), 35 ms backspacing, 280 ms collapse timing, and reduced-motion behavior. Send character counts to React only when counts change so native `Text` renders the actual substring. Opening generations reject queued updates after closing, reopening, or unmounting. Close/unmount cancels the clock; reopening resets it before publishing the next generation. No JS timers or additional dependencies.
- `src/components/menu/menu-row.tsx`: replace animated nested text colors with actual substring contents. An invisible full-text measurement keeps wrapping height stable while typing/backspacing. A clipped container hides immediately when its count reaches zero, animates its measured height and existing four-unit gap to zero after backspacing, then uses `display: none`. Visible text unmounts when empty. Titles follow normal centered row layout as description space collapses; no independent title transform can overlap a description. Retain Poppins, existing row sizes/colors/icons and shared description-color/spacing tokens.
- `src/components/menu/owner-menu-drawer.tsx`: pass character counts and the existing derived animation frame into the reused `MenuRow`. Navigation, drawer transitions, capabilities and selected More state retain their existing implementation.
- `tests/menu-descriptions.test.cjs`: exercise real hook/component code with delayed UI-to-RN work. Cover typing/deadline/erasing, closing during each phase, stale queued callbacks, rapid reopening, unmount cleanup, reduced motion, measured collapse, hidden text and retained selected-row semantics.

## Shared and browser validation

- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `npm test`: 230 passed, zero failed. After the final opening-reset ordering adjustment, the 13 description/sequence tests passed again.
- `git diff --check` for the three changed source files: passed.
- Chrome against Expo web at 390 × 844: opening types actual substrings; full descriptions remain until the existing deadline; backspace removes characters before any space collapses; every finished description has empty text, zero height and `display: none`; descriptions stay hidden while the drawer stays open. Measured descriptions remain below titles. Six interrupted open/close cycles, close during erasing and reopening restart typing without retained text. More stays selected while the drawer is open; Settings navigation retains More selection.

Browser measurements, native screenshots/accessibility trees, and local review scripts are in ignored `.tmp/more-tools-*` artifacts. Browser checks and simulated scheduling tests are separate from native runtime validation.

## Native runtime validation

Android: `Medium_Phone` emulator, Android 17 / API 37, x86_64, 1080 × 2400, Expo Go 58.0.5. Opened the app with the existing opt-in fictional Owner fixture. Inspected screenshots of full descriptions, backspacing, and the final description-free layout: titles/descriptions do not overlap, and descriptions disappear with their space collapsed. The original online dev server could not resolve its Expo current-user request (`UnexpectedServerError`); restarting the local server with `EXPO_OFFLINE=1` allowed the app to run without changing project configuration. An initial blind Back-key automation left the app before a modal appeared; that rapid sequence was discarded and repeated with the validated drawer Close-button target.

The repeated native run passed four close/reopen cycles interrupting typing, reopening from a clean description frame, closing during backspacing, and successfully typing the descriptions again. Checked that closing restores Home selection; navigating through the drawer to Settings selects More. Inspected the final native Settings screenshot and selected-state accessibility tree. Native evidence includes `more-tools-android-still-hidden.png`, `more-tools-android-confirmed-mid-erase.png`, `more-tools-android-confirmed-reset-shown.png`, and `more-tools-android-settings-more-selected.png`. These are emulator observations and sampled frames; physical-device frame pacing was not measured.

iOS: not tested. This Windows host has no iOS simulator or connected iOS device. Opening, waiting for disappearance, closing mid-animation, rapid reopening and native animation smoothness still require iOS runtime verification. No iOS native build was produced, and Android/browser results do not validate iOS.

## API references

Checked [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), the [Expo documentation index](https://docs.expo.dev/llms.txt), [SDK 58 Reanimated](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/), [Expo animation guidance](https://docs.expo.dev/develop/user-interface/animation/), [React Native Text](https://reactnative.dev/docs/text), [useAnimatedStyle](https://docs.swmansion.com/react-native-reanimated/docs/core/useAnimatedStyle/), [useAnimatedReaction](https://docs.swmansion.com/react-native-reanimated/docs/advanced/useAnimatedReaction/), and [scheduleOnRN](https://docs.swmansion.com/react-native-worklets/docs/threading/scheduleOnRN/).
