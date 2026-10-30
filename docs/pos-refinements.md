# POS visual and layout refinements

Follow-up: [POS stability and navigation polish](pos-stability-polish.md) implements the user's later request to show bottom navigation only on Select Products, use an alphabetical jump index, stabilize selection/search layouts, and refine cart removal. The sections below record the earlier refinement delivery.

Compared the current catalog, cart/checkout, payment and dialogs with every panel in `docs/designs/MA-POS-001.png`, `MA-POS-003.png` and `MA-POS-004.png`. MA-POS-003 also contains MA-POS-002, as previously confirmed by the user. Re-read root AGENTS.md and the workbook's baseline MAY-ARI MODULE criteria for all four stories, compared the copy sheet, and reviewed the existing implementation and documented decisions before editing.

## Changes

- `src/components/pos/pos-frame.tsx`: reserves navigation clearance using the existing navigation height, animation lift, spacing and bottom safe-area inset. Scrollable content ends above the floating navigation instead of passing behind it. The catalog retains a white summary/navigation background. Native keyboard show/hide events hide the navigation and release its reserved space while inputs are in use. The wordmark can shrink to fit on native platforms or truncate on web instead of pushing Settings/Profile off-screen.
- `product-browsing-screen.tsx`: removes duplicated navigation padding from the sticky summary; restores the reference's smaller category pills and slimmer alphabet indicators inside 48-point touch targets; applies consistent action borders and shadows to Add to Cart and View Cart.
- `cart-review-screen.tsx`: uses the shared back arrow, centers the quantity controls and line totals consistently, and uses normal content padding now that the frame owns navigation clearance.
- `payment-screen.tsx`: uses shared pills for methods and quick amounts, tighter form spacing, an inline Done action, matching completion/cancel borders and shadows, and the same navigation-clearance model. Inputs, validation messages and controls retain flexible heights and wrapping.
- `pos-dialog.tsx`: aligns the close control with the top-right corner, reduces excess title-row height, and matches button shadows/borders. Dialogs remain scrollable within safe areas and their actions can wrap at larger text sizes.
- New `pos-chip.tsx`, `pos-back-button.tsx` and `pos-styles.ts`: POS-only shared visual primitives that reuse existing design tokens. No changes to shared authentication or Dashboard appearance were needed.

No dependencies, routes, domain types, seed fixtures, calculation utilities or order/payment state logic were changed. English copy, direct-access guards, stock limits, snapshots, local selection/drafts, payment validation, duplicate protection and demo labeling remain intact. Backend integration remains deferred.

Existing decisions documented in [catalog](pos-product-browsing.md), [cart/checkout](pos-cart-checkout.md) and [payment](pos-payment.md) remain: actual calculated totals take precedence over stale illustrative totals; no low-stock threshold or GCash reference-length rule is invented; demo confirmation does not verify a payment, save a sale or deduct inventory. This refinement does not add split payments or other workflows.

## Validation

- `npm run lint` and `npm run typecheck` pass.
- `node --test tests/*.test.cjs`: all 28 existing tests pass, including stock enforcement, exact centavo calculations, snapshots, validation, and synchronous duplicate confirmation.
- Headless Chrome against the Expo web development server: catalog search/category/letter intersections and reset states, stock exhaustion and zero-stock blocking, cart adjustments/removal/clear confirmations, checkout/payment navigation, live totals, Cash/GCash draft preservation, validation, cancellation, demo completion and duplicate-disabled state pass.
- Screenshots at 320×568, 360×800, 390×844 and 430×932 were inspected. Scrolled screenshots verify Checkout and payment actions stay reachable. Geometry checks confirm scroll viewports and actions end above the navigation.
- Browser text enlarged to 150% at 320×568: header controls stay within the viewport; item names, prices and summaries wrap; modal content/actions fit. A 320×460 browser viewport verifies payment actions remain reachable without horizontal overflow. These are browser layout stress checks, not native accessibility-font or keyboard tests.

Preview scripts, screenshots and results are ignored under `.expo/pos-refinement-check/`. Web development bundling succeeded. No Android/iOS bundle exports or native builds were run.

Android runtime: **not tested**; no Android device/emulator or ADB is available. iOS runtime: **not tested**; this Windows environment has no iOS simulator. Native safe areas, keyboard events/avoidance/dismissal, font scaling, screen readers, Android back and iOS gestures remain to be validated on devices. The smaller visual pills and letter markers intentionally keep full 48-point touch targets rather than reproducing the reference's tiny tap areas.
