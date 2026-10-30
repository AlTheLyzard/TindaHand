# MA-POS-001 — Product browsing and selection

Follow-up: [MA-POS-002/003](pos-cart-checkout.md) now enables View Cart, shares selection across browsing and review, and moves this route to `src/app/owner-pos/index.tsx` without changing its URL. The sections below record the original MA-POS-001 delivery and its validation at that time.

Implemented the owner POS route at `src/app/owner-pos.tsx`, opened from the existing Dashboard POS navigation item. Direct route access reuses the owner mock-session guard. Authentication is still a frontend simulation. Welcome and authentication implementations are unchanged.

## References and scope

Reviewed all panels in `docs/designs/MA-POS-001.png`, `MA-POS-003.png` and `MA-POS-004.png`. The user confirmed that MA-POS-002 is included in the MA-POS-003 composite. Reviewed the Requirements Engineering, Project Charter, System Request and the workbook's baseline MAY-ARI MODULE stories MA-POS-001–004.

The copy worksheet adds stock-display wording, cart removal/clear notes, and unresolved questions about low-stock numbers and real-time updates. Those notes do not expand this implementation. Remaining selectable quantities are displayed without defining a low-stock threshold. Seed inventory is never decremented.

The primary composite disagrees on Bear Brand's price (₱13 in the first view, ₱10 in the second); this fixture uses ₱13, also shown in later cart panels. Reference totals are illustrative and inconsistent with shown selections; this implementation starts empty and calculates totals from selections. Product image placeholders reproduce the supplied pale blue blocks; no product photography was supplied.

## Behavior and files

- `src/components/pos/product-browsing-screen.tsx`: shared mobile screen, case-insensitive search and matching-name suggestions, intersecting category/letter filters, reset and empty states, alphabetical product groups, availability labels, accessible selection buttons, local quantities and derived peso total. Header primitives and animated floating navigation reuse existing components. Category chips scroll horizontally and the letter rail scrolls vertically to preserve 48-point touch targets. The catalog scrolls separately from the selection summary.
- `src/data/pos.ts`, `src/types/pos.ts`: six typed fictional reference products, stable IDs and integer-centavo prices. These sizes/names differ from existing dashboard products, so they have distinct IDs. Household, Personal Care and Groceries are explicit mock category assignments for the reference's detergent, conditioner and sugar; the supplied category chips remain present. Empty categories remain browsable and show the resettable no-results state. No backend category taxonomy is implied.
- `src/utils/pos.ts`: filtering, immutable stock-limited selection and summary calculations. Functional updates cap rapid repeated taps at stock. Selected lines preserve product ID, name and unit-price snapshots. Filters never discard selections.
- `src/components/dashboard/dashboard-navigation.tsx`, `owner-dashboard-screen.tsx`: POS destination and active navigation support; existing scroll animation and unavailable-feature behavior remain.
- `src/i18n/en.ts`: new English catalog entries using the existing localization structure.
- `tests/pos.test.cjs`: filter intersection, stock ceiling, zero-stock blocking, immutable fixtures, snapshot and total checks.

Selection is local to the mounted POS screen; leaving/remounting may reset it. No sale, payment, inventory mutation, API, database or persistence is implemented. View Cart is disabled with visible explanatory text. Quantity editing/removal, cart review and clearing belong to MA-POS-002; checkout and payment remain deferred to MA-POS-003–004.

## Validation

`npm run typecheck`, `npm run lint` and `node --test tests/*.test.cjs` pass (21 tests). Expo's dev server regenerated ignored route types for the new screen; no dependency or configuration changes were needed.

Headless Chrome browser checks cover unauthorized direct access redirect, registration preview → Dashboard → POS navigation, selected POS highlight, product rendering, combined case-insensitive search/category/letter filtering, no-results/reset behavior, selection totals, stock exhaustion, initially zero-stock products, disabled View Cart and return navigation. Screenshots at 320×568, 360×800, 390×844 and 430×932 were inspected for layout and horizontal overflow. Preview artifacts and the browser harness are ignored under `.expo/pos-check/`. Browser checks do not establish native behavior.

Android runtime: **not tested**; no attached emulator/device or ADB available. iOS runtime: **not tested**; no iOS simulator is available on this Windows host. Native keyboard avoidance/dismissal, large accessibility text, font rendering, safe areas, screen readers, system back and iOS gestures require device validation. No native builds or platform bundle exports were run for this task. The web development bundle compiled successfully.
