# Navigation and system-area refinements

November 11, 2026. This refinement preserves the existing Design System colors, Poppins typography, four Owner / three Cashier item arrangement, 56-unit navigation height, 28 × 3 underline, drawer width (`min(80% of window width, 360)`), and existing drawer slide/description sequence.

## Requirements and scope

Read `AGENTS.md`, the original workbook's named MAY-ARI MODULE and KAHERA MODULE sheets, the existing navigation documentation, design tokens, route layouts, and shared motion/safe-area components. Relevant criteria are MA-LOG-006, MA-DASH-001/007, MA-MT-001–004, KH-LOG-003, and KH-MT-001/002. The copy sheet was not merged into the baseline. MA-DASH-007 retains a design-confirmation remark; this task explicitly authorizes refinements to the existing navigation design, without resolving unrelated requirements or adding destinations. Original requirements are unchanged.

## Changes

- `src/components/dashboard/bottom-navigation.tsx`: one underline uses each item's `onLayout` center. Its position, icon crossfades, and label color all use the existing shared selection weights and 225 ms cubic ease-out. New selections retarget the running animation. The underline no longer dims during a press; icon/label pressed feedback remains.
- `src/state/navigation-motion.tsx`: cache measured centers separately for Owner and Cashier across route hosts. A newly mounted route can continue the shared animation without an unmeasured indicator frame. Existing route-derived selection, live reduced-motion handling, and drawer ownership remain intact.
- `src/components/dashboard/dashboard-navigation.tsx`: keep the original bar mounted and opaque throughout drawer presentation and exit. Disable its touches and accessibility descendants while the modal is present. No second navigation bar is rendered.
- `src/components/menu/owner-menu-drawer.tsx`: remove the decorative navigation copy that was above the modal backdrop and panel. The native modal covers the screen's bar, independent of screen elevation or z-index. Its backdrop intercepts outside touches, including the exposed bar region, through exit. Keep the existing width, full-height panel, animation, dismissal sequencing, and route mapping. Remove the obsolete extra 56-unit content reservation; the drawer's scroll content now reserves its actual bottom inset once, plus ordinary spacing.
- `src/hooks/use-stack-motion.ts`: every existing stack explicitly uses `autoHideHomeIndicator: false` and `navigationBarHidden: false`.
- `src/components/ui/motion-modal.tsx` and `src/components/dashboard/dashboard-quick-add.tsx`: use edge-to-edge native modal windows consistently. Backgrounds extend behind system bars; content keeps its existing safe-area handling. This avoids combining an Android window-reserved navigation area with another bottom inset in modal content. Translucency does not hide system controls.
- `src/app/_layout.tsx`, `app.json`, `package.json`, `package-lock.json`: add only the SDK-compatible `expo-navigation-bar` module (`~58.0.4`, installed with `npx expo install`). Configure Android system navigation to start visible, with dark controls and OS contrast enforcement, and keep its runtime `NavigationBar` mounted. No dependency upgrades, native-directory edits, fake home indicator, backend changes, or business-logic changes.

## System-area audit

No existing immersive/fullscreen system-control hiding calls were found. The drawer's `overFullScreen` presentation describes modal coverage, not system-control visibility; it remains a transparent overlay. Native iOS modal controllers retain their normal system-managed home indicator behavior. The app does not attempt to override temporary OS-controlled visibility or the user's Android navigation mode.

Screens using the bar reserve `56 + insets.bottom` once. Authentication/Profile use their shared bottom-safe background; checkout and keyboard-hidden navigation states retain their existing inset handling. Shared modal/sheet callers use either bottom-safe containers or explicit bottom footer/content insets. Quick Add already replaces its bottom safe inset with ordinary spacing when the keyboard is shown. Drawer content now clears only the system area, without an obsolete app-bar gap.

Android native configuration requires a rebuilt development app/binary to take full effect. No native build was created in this task.

## Follow-up: underline visibility regression

The user reported a missing underline after this refinement. The initial measurement updater used `centers.set(updater)` from RN layout callbacks. In the installed native Reanimated implementation, that callback reads the RN-side snapshot before scheduling the UI write. When multiple item layouts arrive in the same batch, later writes can overwrite earlier item measurements. The all-items-measured visibility gate then keeps the underline at opacity zero. Web shared-value updates are synchronous, so the earlier browser checks did not cover this native scheduling failure.

`bottom-navigation.tsx` now merges each measurement using a worklet passed to `centers.modify`, which executes against the latest value on the UI runtime. The existing single underline, measured placement, styling, and shared selection timing remain in place. `tests/navigation-indicator.test.cjs` exercises the actual component's layout callbacks with queued native-style shared-value updates, including Owner/Cashier batches, resizing, and intermediate selection weights. Both tests fail with the previous setter and pass with the atomic modifier. This is a scheduling regression test, not native runtime validation.

## Validation performed

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 167 passed, 0 failed.
- `npx expo config --type introspect`: passed without generating `android/` or `ios/`. Inspected generated Android theme values: `expoNavigationBarHidden=false`, `android:windowLightNavigationBar=true`, and navigation-bar contrast enforcement enabled.
- `npx expo export --platform android --platform ios --output-dir .tmp/navigation-native-export`: both platform bundles passed. These are bundle compilation checks, not native builds or runtime validation.
- Headless Chrome against Expo web with the existing opt-in mock Owner login: Home, POS, Inventory, and More selection at 320/390/430 widths; measured indicator alignment; unchanged bar rectangle; same bar and underline DOM nodes through drawer open/close; no decorative copy; panel width preserved; covered bar hit testing reaches the overlay; original bar is opaque with touches disabled underneath.
- Browser behavior: observed intermediate underline positions with constant opacity; rapid route taps settle on the final route; back restores route-derived selection; five repeated openings closed during entrance complete without stale selection; Settings destination selects More; closing restores Home; deliberately unequal item widths still align the underline to measured centers; live reduced motion selects immediately.
- Actual shared Owner/Cashier navigation renderer with injected bottom-inset fixtures of 0/24/34 at 320/390/430 widths: all selected states have a 56-unit item area, total height `56 + inset`, and interactive items above the injected system area.
- Actual shared inventory modal/bottom-sheet components with a 34-unit injected bottom inset at 320×568, 390×844, and 390×320: scrollable actions remain above the reserved bottom area. Compact viewport tests simulate limited space; they do not show a native keyboard.
- Inspected the drawer screenshot: panel covers the bar within its bounds; More and its underline remain visible underneath the dimmed backdrop outside the panel.

Local browser scripts, measurements, screenshot, config inspection, and native bundles are in ignored `.tmp/navigation-*` artifacts. These browser measurements are not native safe-area measurements. No dependency diagnostic was run.

## Native runtime limits

- **Android: not tested.** Attempted the installed `Medium_Phone` AVD (`android-37.1`, x86_64) in read-only/headless mode, then a cold boot. ADB connected, but `sys.boot_completed` remained unset and package/activity services did not start (`Can't find service: package`). Stopped the test emulator. App runtime, gesture navigation, three-button navigation, keyboard behavior, native modal/system-bar contrast, TalkBack, and animation smoothness need a working emulator or device.
- **iOS: not tested.** This Windows host has no iOS simulator. Home indicator visibility/contrast, safe areas, keyboard avoidance, VoiceOver, gestures, and animation smoothness need an iOS device or simulator.

## API references

Checked Expo SDK 58 and the Expo documentation index before editing APIs: [SDK reference](https://docs.expo.dev/versions/v58.0.0/), [documentation index](https://docs.expo.dev/llms.txt), [safe-area context](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/), [Reanimated](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/), [system bars](https://docs.expo.dev/develop/user-interface/system-bars/), [NavigationBar](https://docs.expo.dev/versions/v58.0.0/sdk/navigation-bar/), [React Native Modal](https://reactnative.dev/docs/modal), and [native stack options](https://reactnavigation.org/docs/native-stack-navigator/#autohidehomeindicator). Installed module source/types were also checked for the SDK 58 configuration and stack options.
