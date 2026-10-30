# MA-POS-002 and MA-POS-003 — Cart management and checkout review

Follow-up: [MA-POS-004](pos-payment.md) now connects Checkout to the local payment demo and replaces the unavailable-payment notice described below. The remaining sections record the MA-POS-002/003 delivery at that time.

The existing POS now opens a working cart through **View Cart**. The cart and checkout review share the layout shown in `docs/designs/MA-POS-003.png`: selected item cards, quantity controls, delete actions, calculated line totals, Order Summary, Cancel and Checkout. Every panel of the composite was inspected, including both removal dialogs and the final post-removal state. No separate checkout design was supplied, so no additional checkout screen was invented.

## Requirements and reference decisions

The MAY-ARI MODULE workbook is the baseline. MA-POS-002 requires selected products, quantities, prices, quantity changes and recalculated totals. MA-POS-003 requires order review before payment and no completed sale until payment confirmation. The copy worksheet also mentions removal, clearing and proceeding to payment; removal dialogs and Empty Cart are visible in the supplied design and are included here. The original requirements documents remain unchanged.

The reference contains inconsistent amounts: removing Argentina from a ₱83 order leaves milk (₱39) and Ariel (₱12), which total ₱51, although the last panel still shows ₱83. Totals here derive from quantities and integer-centavo price snapshots. The reference also displays a low-stock warning without an agreed threshold; this implementation enforces the fixture stock ceiling and shows “Stock limit reached” without inventing low-stock rules.

Decreasing a quantity from one requests confirmation before removal. Unlike the reference's transient zero, the original quantity and total remain intact behind the dialog until confirmation; Cancel, Close and modal back dismissal discard the request. Trash removal and emptying the whole cart also require confirmation. Cancel on the review screen returns to products and retains the current selection.

## Implementation

- Moved `src/app/owner-pos.tsx` to `src/app/owner-pos/index.tsx`, preserving `/owner-pos`. Added `_layout.tsx` and `cart.tsx` for a guarded nested Expo Router stack. The owner capability guard applies to direct cart links as well as navigation.
- Added `src/state/pos.tsx` for selection shared between products and cart. Quantities and original name/price snapshots survive moving between these routes. This state is ephemeral and scoped to the POS flow; leaving the flow or refreshing discards it. No persistence or backend schema is introduced.
- Added `src/components/pos/cart-review-screen.tsx`, `pos-dialog.tsx` and `pos-frame.tsx`. The frame shares the existing header, progress indicator, unavailable-feature messages and animated floating navigation. Cards, summaries and dialogs scroll on small screens; quantity and removal actions have 48-point touch targets and English accessibility labels. Delete icons use native vector-like view primitives without new dependencies.
- Updated `product-browsing-screen.tsx` to use shared selection and enable View Cart, including an explicit empty cart state. Search and filters retain their existing behavior.
- Extended `src/utils/pos.ts` with immutable, stock-bounded quantity changes and explicit removal. Adjustments never change seed inventory; returning to products reflects the updated remaining selectable quantity.
- Updated `src/i18n/en.ts` and `tests/pos.test.cjs` for English cart messages and targeted quantity/removal tests.

**Payment boundary:** Checkout is enabled only for a nonempty order. It currently opens an explicit payment-unavailable notice and preserves the selection. MA-POS-004 payment entry, Cash/GCash choice, confirmation and recording remain deferred. This handoff is a temporary boundary, not a functioning payment flow. No sale, debt, payment, inventory deduction, database write or accounting record is created.

## Verification

Shared checks: `npm run typecheck`, `npm run lint`, and `node --test tests/*.test.cjs` pass (23 tests). Tests cover positive whole-number stock limits, rejected zero/negative/fractional/nonfinite quantities, price snapshots, derived totals, immutable removal and unchanged seed inventory, alongside existing authentication and catalog tests.

Browser preview: Chrome with the Expo development web server. The harness checks unauthorized direct cart redirect; registration preview → Dashboard → POS → cart; correct ₱115 → ₱83 → ₱51 totals; cancelled and confirmed zero-quantity removal; trash cancellation/close/removal; capped quantities; selection and availability continuity on return to products; checkout's explicit payment boundary; cancelled and confirmed empty-cart behavior; and disabled checkout for an empty cart. Layout screenshots use 320×568, 360×800, 390×844 and 430×932. Scrolled summary screenshots verify Checkout remains reachable above the navigation at 320×568 and 390×844. Preview artifacts and harness are ignored in `.expo/cart-check/`.

Android runtime: **not tested**; no Android device/emulator or ADB is available. iOS runtime: **not tested**; this Windows environment has no iOS simulator. Native modal/back/gesture behavior, safe areas, font scaling, TalkBack/VoiceOver and keyboard behavior need device validation. The web bundle compiled; no native builds or Android/iOS bundle exports were run. Browser validation is not native runtime validation.
