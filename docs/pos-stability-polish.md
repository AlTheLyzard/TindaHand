# POS stability, navigation and cart removal refinements

Reviewed root AGENTS.md, baseline MAY-ARI MODULE MA-POS-001–004 acceptance criteria, all MA-POS reference composites, and the supplied Navigation Bar, Icons, clicked Icons and Toast/Status sticker sheets. MA-POS-002 remains included in the MA-POS-003 composite, as previously confirmed. This refinement follows the user's explicit navigation changes even where the original cart/payment exports still show bottom navigation.

## Select Products

- `product-browsing-screen.tsx` and `pos-chip.tsx`: category chips retain their intrinsic width instead of shrinking in the horizontal row. Added edge padding, measured snap offsets and scrolling the selected chip fully into view. Reset returns the category strip to All.
- Clear-button width and search-input height are reserved. Search suggestions overlay the catalog controls rather than moving them. The filter reset action uses a reserved slot, so typing/focus/clear do not insert an extra layout row.
- Every product reserves selection-indicator space, including when nothing is selected. Stock badges reserve two text lines, including “All stock selected,” so repeated additions and stock exhaustion do not change row heights or move later sections.
- New `alphabet-index.tsx`: compact, readable side index with distinct 44-point letter targets for available sections. The user chose smooth jumps instead of letter filtering. Search and category filters continue to intersect; tapping a letter retains all matching products and scrolls to that section. The rail remains beside the visible grid as its headers scroll away. Active letters follow scrolling, and movement respects reduced-motion settings.

## Navigation and icons

- `pos-frame.tsx`: bottom navigation appears only on Select Products and is still hidden during native keyboard use. Cart Review and Payment reserve only the bottom safe-area inset, with no leftover navigation-height space.
- New `pos-icon.tsx`: transparent SVG outline geometry matching the supplied sticker-sheet icon shapes, rendered using the already-installed Expo Image module. The POS cart state uses the navy stroke and blue circular selection background; Home uses an inactive outline. This avoids the white background embedded in the legacy cart raster and the active Home raster.
- `dashboard-navigation.tsx` has an optional icon-rendering callback used by POS. Its default Dashboard rendering and scroll animation remain unchanged. No legacy image assets, authentication screens, dependencies or configuration were changed.

## Cart Review and dialogs

- `cart-review-screen.tsx`: red trash outlines use the existing destructive color. The secondary button is now Empty Cart and opens the existing clear confirmation. The redundant text action below the buttons is removed; the button is disabled when already empty.
- Confirmed removal updates the shared selection and derived totals immediately. The removed row fades out over 160ms, remaining rows and the summary transition over 200ms, and the gap collapses smoothly. The row container does not receive a competing layout transition. Explicit token-based styles are used on animated wrappers to preserve card backgrounds, padding and positioning on both renderers.
- A synchronous pending-confirmation guard blocks repeated confirmation taps and stale actions on exiting items. Items added again can still be removed normally. Cancelling or closing a confirmation preserves the cart.
- `pos-dialog.tsx`: the warning mark now uses fixed square SVG geometry matching the existing circled-exclamation icon. It cannot shrink or distort because of title wrapping or font scaling.
- `src/i18n/en.ts`: English labels for section jumping, returning to the start, and the compact Reset action.

No price, stock, payment-validation, calculation or backend behavior was added or changed. Local demo payment labeling, order snapshots, direct-route guards, native back structure and retained payment drafts remain in place. Backend integration is still deferred.

## Verification

Shared checks: `npm run lint`, `npm run typecheck`, and all 28 existing tests pass. No dependencies were installed.

Chrome/Expo web checks verify stable card and search geometry through repeated additions and stock exhaustion; overlay suggestions; clear/reset; selected category visibility at the end of the strip; index jumps that retain the catalog; correct navigation states; navigation absent from cart/payment; one Empty Cart action; square warning icon; current totals after 20 repeated removal confirmation taps; and remaining-row motion. Captured row positions during removal were 411px → 358.93px → 255px, showing movement between the start and final positions. Cart and payment use the full available viewport below the header. Screenshots cover 320×568, 360×800, 390×844 and 430×932.

Payment regression checks cover checkout, Cash/GCash amount entry, reference validation, remaining balance/change, draft preservation, cancellation, demo confirmation and duplicate blocking. Scripts/screenshots/results are ignored under `.expo/pos-polish-check/`. Web development bundling succeeded; no native builds or platform bundle exports were run.

Android runtime: **not tested** — no Android device/emulator or ADB available. iOS runtime: **not tested** — no iOS simulator on this Windows host. Native SVG rendering, keyboard behavior, safe areas, screen readers, accessibility text sizes, gestures and removal-animation smoothness still require device testing. Browser geometry and motion checks do not establish native runtime behavior.
