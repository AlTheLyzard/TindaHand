# Shared application motion

This refinement applies to the implemented authentication, Dashboard, Inventory, POS, More Tools and Quick Add flows. It preserves the supplied visual system, role/capability gates, fixtures, calculations and acceptance criteria. The Operator account-choice/login flow uses the same controls; a complete authenticated Operator workspace remains unimplemented.

Reviewed AGENTS.md, source requirements and named-role acceptance criteria, the proposed frontend plan, and the existing authentication, Dashboard, Inventory, POS, content-state, Quick Add and More Tools notes. The original requirements and existing documented disagreements with the copy sheet remain unchanged.

## Behavior

- `src/constants/motion.ts` defines 140 ms press feedback, 210 ms state changes and 280 ms larger transitions, with a shared restrained easing curve. Reanimated's native `cubicBezier()` object is used for color transitions.
- `MotionProvider` observes the live system reduced-motion preference once. Controls, overlays, navigation, content and native stacks use it. Existing accessible skeleton/success behavior is retained.
- Native Expo Router stacks provide forward/back transitions without a competing screen entrance animation. A focused-screen push guard dispatches immediately and prevents duplicate cart, checkout and inventory-detail pushes.
- Shared pressables animate opacity and a small scale change without adding a layout wrapper. Disabled states, refs, focus styling, accessibility semantics, touch-target layout and original handlers are retained. Selection surfaces/text transition colors smoothly. Loading spinners occupy an overlay slot so button labels stay centered.
- The existing navigation bar retains its width budget and measured labels. One shared clock drives the active pill, label opacity and item width; both icon states stay mounted and crossfade. Bar dimensions and safe-area clearance remain stable during selection changes. The selected Home action still scrolls to the top.
- Modal surfaces and backdrops share progress and remain mounted through exit. Interrupted transitions cancel obsolete completions; hidden callbacks run once. Content remains intact during dismissal. Native window handoff and focus restoration remain coordinated. Inline confirmations use the active modal window and release touches when dismissed.
- Customer Debt, Store Debt and Expense retain their shared 412-point maximum width and 750-point maximum height, bounded by safe areas and the keyboard-adjusted viewport. Form content fades without remounting focused inputs. Dropdown height collapses in layout, preventing exiting options from overlapping following fields. Date/amount inputs show a single formatted value while blurred and their editable raw value while focused.
- Empty states, validation regions, loading-slot changes and success toasts use bounded motion. List rows do not receive scroll-triggered entrance animations. Existing cart-removal motion is preserved.
- More Tools preserves the 55 ms character cadence, shared 15-second window, 35 ms backspacing and subsequent 280 ms title movement. Its UI-thread description clock and reduced-motion semantics are unchanged.

Android runtime inspection exposed the existing SVG data-URI icons failing to render. Their exact existing path geometry is now bundled as normal/active SVG assets and tinted with the existing colors. Regenerate these files with `node scripts/prepare-pos-icons.cjs`; this adds no library or native configuration.

## Changed files

New shared infrastructure:

- `src/constants/motion.ts`, `src/state/motion.tsx`
- `src/hooks/use-overlay-transition.ts`, `use-stack-motion.ts`, `use-push-once.ts`
- `src/components/ui/motion-pressable.tsx`, `motion-content.tsx`, `motion-modal.tsx`, `motion-overlay.tsx`
- `src/constants/pos-icon-paths.ts`, `pos-icon-assets.ts`, `assets/images/pos/*.svg`, `scripts/prepare-pos-icons.cjs`

Integration changes:

- `src/app/_layout.tsx`, `src/app/owner-{pos,inventory,menu}/_layout.tsx`
- `src/state/navigation-motion.tsx`, `src/hooks/use-menu-drawer-transition.ts`
- `src/components/ui/{button,form-field,confirmation-content,content-state,collapsible}.tsx`
- `src/components/auth/{account-role-card,auth-header,role-login-screen,registration-toast}.tsx`
- `src/components/dashboard/{activity-tile,add-cash-modal,dashboard-cards,dashboard-navigation,dashboard-quick-add,dashboard-ui,owner-dashboard-screen,quick-add-modal,quick-add-ui}.tsx`
- `src/components/inventory/{inventory-screen,inventory-ui,product-screen}.tsx`
- `src/components/menu/{menu-frame,menu-row,owner-menu-drawer}.tsx`
- `src/components/pos/{alphabet-index,cart-review-screen,credit-product-browser,credit-product-selector,payment-preview-toast,payment-screen,pos-back-button,pos-chip,pos-dialog,pos-frame,pos-icon,product-browsing-screen}.tsx`
- `tests/auth-validation.test.cjs`: isolates the animated renderer in the existing static Button accessibility test. Mounted motion is checked in browser/native interaction checks.

No dependencies were added or upgraded. Backend work, native project generation, publishing and source requirement changes are outside this refinement. Pre-existing unrelated workspace edits are preserved.

## Verification

- `npm run lint`, `npm run typecheck`, and `node --test tests/*.test.cjs` (55 existing tests).
- `npx expo export --platform android --platform ios --output-dir .expo/motion-native-export`: both Hermes bundle exports succeeded. These are bundle compilation, not signed native builds.
- Chrome: navigation geometry/label/icon handoffs, rapid switching, all drawer dismissal paths and restoration, 320–430 px layouts, safe-area overrides, scroll clearance, live reduced motion; real pointer press feedback; fixed Quick Add dimensions at 320×568, 390×844, 390×360 and 430×932; category/dropdown/validation/success changes; repeated save taps; discard/cancel and overlay cleanup. Reduced height is a browser viewport simulation, not a native keyboard test.
- Android: Medium_Phone AVD, `emulator-5554`, Android 17, Expo Go 57.0.9. Checked mock login, keyboard dismissal, Dashboard/Inventory/POS navigation, drawer system Back, cart stack Back, all three Quick Add categories, expense selection, discard/cancel, FAB system Back and touch recovery. Native screenshots and ignored local harnesses are under `.expo/motion-android/` and `.expo/motion-native-check.ps1`.
- Android validation is **partial**: the checks above passed during refinement. Later reruns on the final source were interrupted by development refresh/startup and Expo Go returning to the launcher. Final bundled-SVG rendering and the last dropdown/field presentation corrections were not confirmed in a complete native rerun. The final-source browser form regression and both platform bundle exports passed. The emulator screenshots are intermediate evidence, not a final visual acceptance set.
- iOS runtime: **not tested**. This Windows host has no iOS simulator or attached iOS device. iOS gestures, native keyboard/focus, VoiceOver, safe areas and image rendering require runtime checks. No iOS or Android signed native build was run.
- Browser checks and emulator screenshots do not establish physical-device frame rate. TalkBack/VoiceOver, maximum system text scaling, landscape and physical-device performance remain manual checks.

Local browser reports/screenshots are under ignored `.expo/motion-review/` and `.expo/motion-interactions/`. No local test artifacts are application routes or production data.

References checked against the installed SDK: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [native stack navigation](https://docs.expo.dev/router/advanced/stack/), [Reanimated timing functions](https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-timing-function/), [Expo Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/).
