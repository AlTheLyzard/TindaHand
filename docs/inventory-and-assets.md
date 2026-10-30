# Owner inventory and asset management

Implements the MA-INV-001–006 design flows against the named **MAY-ARI MODULE** sheet in `docs/requirements/USER-STORY-v.02.10.2026 (1)(1).xlsx`. Requirements Engineering, System Request, Project Charter, the proposed frontend plan, all six inventory image exports, and the supplied palette, typography, button, input, icon, notification and navigation sticker sheets were reviewed. Source requirements and exports are unchanged.

## References and resolved differences

| Reference | Implemented behavior |
| --- | --- |
| MA-INV-001 | Products/assets tabs, search suggestions, derived product count and cost-based inventory value, stock and expiry summaries, product cards, asset summaries and classification filters. |
| MA-INV-002 | Add/edit product, required validation, optional local JPG/PNG photo up to 2 MB, clear/cancel, selected-record delete confirmation, success feedback. |
| MA-INV-003 | High/low stock, fast/slow sales ranking and expiration sorting, draft filters with Apply/Reset/Cancel. |
| MA-INV-004 | Existing-product selection, incoming quantity, stock date, expiration date, atomic stock increment and retained restock history. |
| MA-INV-005 | Search intersected with category, first-letter, stock and expiry filters; reset and empty results. |
| MA-INV-006 | Shared product information and actions; expiry and expired indicators attached to the correct record. |
| Asset acceptance criteria accompanying this component | Asset classification, total/current/non-current values, add/edit/delete, validation, useful life, confirmation showing name and value. |

The named owner sheet requires initial quantity, incoming quantity, stock date, first-letter filtering and product details; the frames omit these controls. They use the supplied form/card styles. Zero-stock products are **Out of stock**, rather than the incorrect “Good” label in several frames. The three identical “In Stock” filter labels are replaced with their actual statuses. Variable product names in delete confirmations always identify the selected record, correcting mismatched frame copy. English copy supersedes the frames’ Products/Assets tab wording.

The copy owner sheet renames “Inventory Dashboard” to “Inventory Page” and adds notes about search, total value, category/filtering, deletion/editing and an asset-add button. These are flagged differences, not a replacement baseline. The named role sheets and project instructions prohibit cashier product creation/deletion and asset mutation despite older Requirements Engineering text allowing broader inventory access. This task implements guarded owner routes; cashier access to this owner module remains denied.

The user approved reusing product-form styles for missing product-detail and asset screens. The user also approved these **demo policies**, not production accounting rules: low stock at 1–5 units, critical at 1–2, zero out of stock, expiry warnings within 30 days including the expiration date, and inventory value calculated from cost × stock. Low-stock filters include critical stock. Critical stock is also separately available. Expired dates are before today's Manila date. Stock and expiry statuses are independent.

Money is exact integer centavos. Forms accept nonnegative cost, positive selling/asset values and up to two decimal places; product quantities are whole numbers 0–1,000,000, incoming stock is 1–1,000,000, future stock dates and invalid calendar dates are rejected. Useful life is whole years 1–100 for non-current assets; it is not applicable to current assets. Zero cost is permitted. Past expiration dates can be recorded and are flagged, rather than silently rejected. Product names and asset names are limited to 120 characters.

## State and integration

- `src/types/inventory.ts`: product, asset, draft, filter and restock contracts.
- `src/data/inventory.ts`: typed immutable seeds and fictional historical sale lines. Existing POS products remain available, enriched with explicit demo costs/expiration dates. The inventory count/value differs from the seven-product frame because totals derive from this combined catalog.
- `src/utils/inventory.ts`: policy, validation, date-only Manila handling, selectors, filtering/ranking and pure immutable mutations.
- `src/state/inventory.tsx`: session-local repository boundary, owner capability check, atomic dispatch and feedback. The provider survives route changes and resets when the owner session changes or ends.
- `src/components/inventory/`: shared shell/controls, inventory/assets lists, product/detail/restock and asset forms. `src/app/owner-inventory/` contains only routes and the guarded layout.
- Existing Dashboard and POS navigation open Inventory with its active state. Dashboard stock alerts derive from shared inventory and open the corresponding filter. Other dashboard sales, cash and ranking fixtures remain unchanged.
- POS browsing, selection limits and cart stock ceilings read the shared catalog. Selected cart item name and price snapshots remain unchanged. If inventory removes a selected item or reduces available stock, the cart/payment surfaces a stock-change warning and blocks checkout/preview until corrected. Payment confirmation remains a **preview**, with no sale saved or inventory deducted.
- `src/i18n/inventory-en.ts`, merged into `en.ts`, holds English copy for the future approved Tagalog catalog. Existing locale fallback remains in place. Welcome and authentication screens are unchanged.
- `app.json`, `package.json` and `package-lock.json` add the SDK-compatible Expo ImagePicker and its plugin. Camera and microphone permissions are disabled. Image-only system-library selection requires no broad photo-library permission; cancellation retains the current photo, format/size failures are shown, and picker failures provide recovery guidance. No camera or barcode scanner is added; scanner belongs to the More Tools requirements.

Restocks retain an ID, product name snapshot, incoming quantity, stock date, incoming expiration date and ISO event timestamp. Duplicate submission IDs do not increment stock twice. The catalog displays the most recently recorded expiration date; this frontend does not implement stock lots, FIFO, per-batch depletion or accounting depreciation. Photo URIs refer to temporary device picker files, not uploaded images.

## Verification and remaining work

Shared checks: `npm run typecheck`, `npm run lint`, and `node --test tests/inventory.test.cjs tests/pos.test.cjs tests/payment.test.cjs tests/auth-validation.test.cjs`. Domain tests cover exact cost-based summaries, stock/expiry boundaries, leap dates, invalid money/quantity/dates, intersected filters, historical-sales sorting, immutable edits, duplicate restock prevention and retained history.

All 36 tests pass. Browser checks passed Welcome → registration preview → dashboard → inventory, product required validation/add/edit/restock, delete cancellation and confirmation, empty search results, stock sorting, asset required validation/addition and updated totals, navigation back to POS, and active Inventory semantics. Screenshots at 320, 390 and 430 px were checked for horizontal overflow; representative inventory, form, filter-result and asset screens were visually inspected. This checks browser rendering, not Android/iOS runtime. Picker/system permissions were not exercised. Ignored check scripts, screenshots and results are in `.expo/inventory-work/`.

Android and iOS Hermes bundle compilation is checked with `npx expo export --platform android --platform ios --output-dir .expo/inventory-export`. This is neither a native build nor runtime validation. No native builds or EAS jobs are submitted.

Android runtime: **not tested**. No ADB, connected device or emulator is available in this environment. iOS runtime: **not tested**. This Windows environment has no iOS simulator. Device validation is still required for safe areas, gesture/back behavior, keyboard/focus/scrolling, large accessibility text, screen readers and image selection. Expo's native image-picker/config changes require an appropriate development build when used outside a compatible Expo Go runtime.

Backend work remains: authenticated owner/cashier capabilities, store settings and agreed policy, persistent product/asset/restock storage, Node.js/MySQL integration once its contract is agreed, photo upload/storage, real sales rankings, transactional inventory deduction, multi-device synchronization and stock-lot rules. The frontend demo performs no API requests, permanent writes or accounting entries.

## Changed files

New files:

- `src/app/owner-inventory/_layout.tsx`, `index.tsx`, `product.tsx`, `asset.tsx`.
- `src/components/inventory/inventory-ui.tsx`, `inventory-screen.tsx`, `product-screen.tsx`, `asset-screen.tsx`.
- `src/data/inventory.ts`, `src/types/inventory.ts`, `src/state/inventory.tsx`, `src/utils/inventory.ts`.
- `src/i18n/inventory-en.ts`, `tests/inventory.test.cjs`, this document.

Updated files:

- `src/app/_layout.tsx` for session-scoped inventory state.
- `src/components/dashboard/dashboard-navigation.tsx`, `dashboard-ui.tsx`, `owner-dashboard-screen.tsx`, `dashboard-cards.tsx` for inventory navigation, active tab semantics and current stock alerts.
- `src/state/pos.tsx`, `src/utils/pos.ts`, `src/components/pos/product-browsing-screen.tsx`, `cart-review-screen.tsx`, `payment-screen.tsx` for shared catalog availability and stale-cart checks; `src/components/pos/pos-icon.tsx` for sticker-sheet outline icons.
- `src/i18n/en.ts` and `tests/pos.test.cjs` for copy and availability regression coverage.
- `app.json`, `package.json`, `package-lock.json` for Expo ImagePicker.

The repository already contained unrelated modified/untracked files before this task. They are preserved; this list describes this task's edits, not the entire Git status.
