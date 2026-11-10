# Fixed bottom navigation

Implemented against `docs/designs/Navigation Bar.png` (the supplied `designs/Navigation Bar.png` is stored there). The explicit task resolves the reference's conflicting 64-unit reservation note in favor of **56 + actual bottom safe inset**, and its mixed legacy vocabulary in favor of **Home / POS / Inventory / More**.

Reviewed `AGENTS.md`, existing tokens and routing, `docs/frontend-plan.md`, `docs/pos-stability-polish.md`, and the original workbook's named MAY-ARI MODULE and KAHERA MODULE sheets. Relevant criteria include MA-LOG-006, MA-DASH-001/007, MA/KH-POS-001–004, KH-INV-002/007, and MA/KH More Tools. MA-DASH-007's design-confirmation remark is resolved for this change by the supplied reference and task. Original requirements are unchanged; the copy sheet was not merged into the baseline.

## Behavior and layout

- White surface attached to the bottom edge, thin `borderOutline` top border, no rounded shell, floating margins, pill, resizing, or scroll-driven navigation state.
- Owner has four equal slots; the shared Cashier renderer has POS, Inventory, More in three equal slots. Existing route callbacks, guards, retained screen state, and More Tools dismissal sequencing are preserved.
- Slots are 56 high, icons 22 square, icon/label gap 2, labels 12/16. A 28 × 3 Accent Blue underline sits 4 above the navigation area's bottom. Only that underline travels; icon shapes crossfade and labels interpolate color over 225 ms ease-out. Live reduced motion selects immediately. Native Pressable dims content without scaling or adding a background.
- `DashboardNavigation` reads the existing safe-area context. Its surface includes the actual bottom inset. Each screen reserves the navigation area and inset once, plus its ordinary content gap. POS Cart Review and Payment reserve only the inset. Existing POS keyboard hiding, conditional Inventory keyboard hiding, and hidden nested Settings screens remain intact; Inventory now also removes the navigation reservation when hidden.
- Quick Add stays separate, 16 above the bar and at least 16 from the side. Dashboard scroll padding also clears its 56-unit trigger.
- Full tab labels and selected states are exposed to assistive technology, including More's expanded state. Normal-size labels stay on one line. Above 125% text scale, a deliberate label-only layout uses the icon space for up to two lines with fitting inside the fixed 56-unit area. Font scaling remains enabled. Native large-text fitting still requires device validation.

## Differences and existing limits

Barlow Semi Condensed Medium is absent from the bundled assets and font setup. Labels reuse the already-loaded **Poppins_600SemiBold**; no font dependency or other package was added. This is the main visual difference from the reference.

There is no implemented Cashier workspace or authenticated Cashier session in this checkout. The existing Cashier login verifies demo details but reports that its workspace is unavailable. This task supplies and checks the shared three-slot renderer without introducing Cashier routes or granting Owner capabilities. End-to-end Cashier navigation remains dependent on that future workspace.

Icons are bundled SVG vectors using the existing POS outline geometry, filled counterparts, and the reference's four-square More glyph. `node scripts/prepare-navigation-icons.cjs` regenerates the eight assets. No raster navigation glyphs or new native module is used.

## Changed files

- `src/components/dashboard/bottom-navigation.tsx`: shared Owner/Cashier rendering, fixed layout, accessible targets, color and indicator presentation.
- `src/components/dashboard/dashboard-navigation.tsx`, `src/state/navigation-motion.tsx`: existing route/drawer integration and shared selection timing; removed expanding geometry and label measurements.
- `src/constants/design-tokens.json`: standard dimensions, 225 ms timing, and the existing slate-gray value as a shared token; removed obsolete navigation shell tokens.
- Dashboard screen/Quick Add, Inventory UI frame, Menu frame/drawer, POS frame/browsing/cart/payment, and Settings frame: fixed-bar integration and content clearance.
- `scripts/prepare-navigation-icons.cjs`, `assets/images/navigation/*.svg`: consistent outline/filled icon family.
- Removed `src/hooks/use-dashboard-navigation.ts`, `src/utils/scroll-direction.ts`, and their two obsolete tests in `tests/auth-validation.test.cjs`.

## Verification

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: **75 passed** after removal of the two obsolete shrink-on-scroll tests.
- Headless Chrome/Expo web: all four Owner selected states at 320, 360, and 412 widths, including the More Tools modal copy. Measured equal-width 56-high slots, 12/16 labels, 28 × 3 centered underline, 4-unit underline bottom offset, and matching active/inactive colors. Screenshots inspected against the reference.
- Same actual React Native Web component rendered as a Cashier fixture: all three selected states at all three widths, with 0/24/34 bottom-inset fixtures. Confirmed three slots with no Home and total height 56 + inset. These are injected layout fixtures, not measurements of native system insets or a Cashier workspace.
- Browser integration: More close restores route selection; geometry stays fixed during scrolling; Quick Add clears the bar and side by 16; a 70 ms sample captures an in-progress selection animation; reduced motion switches immediately. Added a demo cart item and opened Cart Review and Payment; both omit the bar. Existing checkout frame reserves only the system inset.
- Browser press check: icon/label content and active underline dim to 0.65 while the slot stays 56 high. Injected a 200% font-scale value into the component fixture and checked the label-only branch, full labels, and unchanged height; this does not test native glyph scaling.
- Local browser scripts and screenshots are in ignored `.expo/` files (`verify-navigation.cjs`, `verify-cashier-navigation.cjs`, `verify-navigation-behavior.cjs`, `verify-payment-navbar.cjs`, `navigation-*.png`).
- Android runtime: **not tested** — no ADB/device/emulator available.
- iOS runtime: **not tested** — no iOS simulator on this Windows host.
- No native platform bundle export, native build, or dependency diagnostic was run. Native SVG decoding, safe areas, keyboard behavior, large accessibility text, VoiceOver/TalkBack, gestures, and animation smoothness still need separate Android and iOS device checks. Browser checks do not establish native runtime behavior.

SDK 58 references consulted before editing: [Expo SDK](https://docs.expo.dev/versions/v58.0.0/), [safe-area context](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/), [Reanimated](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/), [Expo Image](https://docs.expo.dev/versions/v58.0.0/sdk/image/), and the [Expo documentation index](https://docs.expo.dev/llms.txt).
