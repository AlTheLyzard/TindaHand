# Inventory refinement — November 9, 2026

This refinement supersedes the single-expiry/form descriptions in `inventory-and-assets.md`. It uses the current MA-INV-001, 002, 003, 005 and 006 exports and Buttons.png in `docs/designs/`. There is no root `designs/` directory. No requirements originals, package versions, app configuration or backend wire contracts were changed.

## Behavior and state

- The existing Inventory route, Products/Assets selector, fixed active navigation, session repository, photo picker, assets forms and success feedback remain in use. Cards have aligned thumbnail/information/quantity columns and equal Edit/Restock actions. Full-catalog summaries retain cost × remaining stock valuation independently of list queries.
- Add Product moves through details, Stock & Expiry, Review Product Details and Confirm & Save. Back and Edit Details keep the detached draft. Only final confirmation dispatches a product write. Clear confirms when populated and resets only that step. New batch quantities must be positive whole units; existing batches can be reduced to zero.
- Each batch explicitly distinguishes a date from `noExpiry: true, expirationDate: null`. Selecting no expiry clears and disables date entry. Multiple dated and undated batches are supported. Existing products without batches adapt to a single legacy batch, preserving their IDs and total stock.
- Edit uses collapsed summaries/expanded fields and Update Batch. Changes and batch deletions stay in the form draft until Save Changes. Cancel and route removal request discard confirmation. A stale edit is rejected if the saved product changed while the form was open. Delete Product is visually separate, confirmed, and preserves sale, debt and restock snapshots/history.
- Restock selection is a searchable resizable sheet. Direct card actions select that product. Existing batches are read-only and incoming batches remain separate. Confirmation states quantity added and resulting stock. Only confirmation appends batches atomically; the existing restock ID rejects duplicate submissions. Clear affects incoming batches only. Stock date entry is retained.
- Sort & Filter uses the existing shared resizable sheet, modal backdrop, chips, radio rows and pinned actions. Categories, sorting and optional stock status are provisional until Apply Filter. Reset changes the sheet draft; closing discards unapplied changes; reopening copies applied selections. Default sort is High-to-Low Stock. Search and first-letter filters remain available; category/status/search intersect before sorting. Sales rankings still use the existing complete recorded-sales collection, including its existing fixture history, without inventing a new reporting period or inferring demand from quantity.

## Shared rules and backend handoff

Search for `BACKEND-INTEGRATION: INVENTORY_RULES` in:

- `src/constants/inventory-rules.ts`: configurable thresholds, maximum stock and Asia/Manila timezone. Replace these defaults with store-provided settings at this boundary.
- `src/utils/inventory-stock.ts`: legacy adaptation, total remaining stock, the internal critical tier, three UI categories, per-batch expiry, earliest eligible expiry, canonical stock projections and depletion.
- `src/utils/inventory.ts`: summaries, combined filtering/sales sorting and validated atomic repository commands compose those selectors.
- `src/utils/inventory-draft.ts`: detached draft creation, validation, no-expiry transitions, step clearing and final product conversion.

Stock is evaluated at product level from all remaining batches. The existing critical tier at 1–2 units is retained internally; the UI groups it into Low Stock (1–5). Zero is Out of Stock and more than five is In Stock. Summary “Good” means the same In Stock category. Existing Dashboard low-stock totals continue to combine low and critical.

Expiry is evaluated independently per batch with remaining quantity. Nearing expiry includes today through 30 calendar days ahead, including both endpoints. Already expired, zero-quantity and undated batches do not trigger nearing-expiry warnings. A product can have both expired and nearing-expiry batches. Expiring Soon sorts by the earliest dated remaining batch, including expired batches; undated/depleted-only products sort last. Date-only expiry values are never localized through a UTC timestamp. The business clock uses the existing Asia/Manila timezone, and UTC midnight is used only as a calendar-day arithmetic representation.

Preserved rules: expired units still count in POS availability and cost-based valuation. POS/credit transactions now deplete recorded batch order and synchronize the existing `stock` projection; no FEFO restriction or automatic expired-stock exclusion was introduced. The legacy `expirationDate` projection is now the earliest remaining batch date (empty when undated/depleted), replacing the previous most-recent-restock projection as explicitly required by this refinement. The existing service remains a synchronous, owner-scoped in-memory adapter. There are no API calls, migrations, uploads or durable writes. A future backend must authorize commands, validate stock/settings, persist batch identities/remaining quantities, and enforce atomic writes and durable idempotency. Local photo URIs remain temporary picker references.

## Source differences and missing assets

The named MAY-ARI and KAHERA workbook sheets were read as the baseline. MA-INV-003 still calls for a distinct critical-stock status, whereas the current instruction explicitly requires three visible stock categories. The internal threshold remains available; visible critical units are grouped into Low Stock. MA-INV-005's first-letter filtering and MA-INV-004's stock date remain available even though current frames omit them. Existing owner-only route guards remain; this refinement does not introduce a cashier module or grant cashier creation/deletion/asset-write access.

The copy owner sheet renames Inventory Dashboard to Inventory Page, adds informal search/value/category/edit/delete notes, asks to combine overview/product requirements and remarks on barcode-scanner removal. These were recorded as differences, not merged into the named baseline. Original Android-only wording remains in source documents; the approved dual-platform decision still governs implementation.

Authoritative user decisions replace the frames' repeated In Stock filter labels, incorrect “Enter your name,” inconsistent save labels and 8-versus-15 stock total. No default success banner is shown. Separate reusable add/edit/restock/expiry header illustrations are absent from bundled assets; the existing shared wave/store backgrounds and live photo placeholders are reused. MA-INV-004.png is absent from the current exports and was not one of the five requested references; the new restock reference is in MA-INV-002/006. No missing screen was invented.

## Verification

Automated domain tests cover stock boundaries, inclusive expiry boundaries, Manila midnight/leap/year transitions, depleted/undated exclusions, independent expiry flags, combined filters/sales ranking, undated-last expiry sorting, positive new-batch validation, review/edit-draft/final-save conversion, step-only clear, draft batch edit/deletion versus save, multi-batch atomic restock/replay, and POS/credit depletion with retained historical snapshots.

Platform bundle compilation: Android and iOS Hermes exports succeeded with `npx expo export --platform android --platform ios --output-dir .expo/inventory-refinement-export`. This is not a native build or runtime test.

Android runtime: not tested; no connected Android device/emulator is available. iOS runtime: not tested; this Windows environment has no iOS simulator. Native keyboard, safe-area, system back/gesture, accessibility text/screen-reader and photo-picker behavior require device validation.

Shared checks passed: `npm run typecheck`, `npm run lint` (no warnings), and `npm test` (137 tests). The focused inventory/sheet run also passed all 21 tests. `git diff --check` passed for the refinement files.

Browser runtime: headless Chrome on Windows using the real Expo web preview and fictional onboarding session. Verified add validation, multiple dated/undated batches, disabled/cleared no-expiry input, step-only Clear confirmation, review/edit-details round trip, final save/repeated tap, batch Update/Delete followed by Cancel versus Save, direct and searchable-sheet restocking, confirmation cancellation/Clear/repeated confirmation, category/status/search intersections, applied selections on reopening, dismissal/Reset without applying, reset/apply and empty results. Product deletion cancellation and final confirmation were rechecked after fixing a transition that could unmount the confirmation before navigation/feedback completed. Browser runs reported no uncaught exceptions during these flows.

Overview screenshots at 320, 390 and 430 CSS pixels were inspected with no horizontal overflow. The filter sheet was checked at 320 × 568, including scrolling, pinned actions, navigation interception, and touch-drag resizing from 560 to 280 pixels. Product details/validation, batch cards, review, edit, restock, confirmation, filtered/empty and Assets screenshots were compared with the supplied exports. Development-only preview controls remain available below Inventory/form content. Actual device text scaling, assistive technology and the native image picker were not exercised. Browser checks do not validate either native platform.

Evidence/scripts/screenshots are local ignored artifacts in `.expo/inventory-refinement/`; native exports are in `.expo/inventory-refinement-export/`. Development lazy bundling initially failed before Inventory loaded; successful browser runs used the process-only `EXPO_NO_METRO_LAZY=1` setting without changing project configuration. A development static web export compiled but encountered unknown-module/hydration errors at runtime and was not counted as a successful browser test. Metro also recovered from a cache-deserialization warning by performing a full crawl. No dependency diagnostics, native builds or EAS jobs were run.

## Files changed for this refinement

- `src/components/inventory/inventory-screen.tsx`, `product-screen.tsx`, `inventory-ui.tsx`, `batch-card.tsx`, `inventory-status.ts`.
- `src/constants/inventory-rules.ts`, `src/types/inventory.ts`, `src/utils/inventory.ts`, `inventory-stock.ts`, `inventory-draft.ts`.
- `src/utils/pos-checkout.ts`, `src/utils/receivables.ts`: batch-aware stock deduction only.
- `src/components/ui/segmented-selector.tsx`: opt-in subtle track; `src/components/dashboard/quick-add-ui.tsx`: opt-in red required asterisk for reused date fields.
- `src/components/ui/choice-chip.tsx`: explicit web selection semantics; `confirmation-content.tsx`: opt-in stacked confirmation actions; `resizable-sheet.tsx`: opt-in subtitle visibility in compact space.
- `src/i18n/en.ts`, `src/i18n/inventory-en.ts`: consistent Out of Stock copy.
- `tests/inventory.test.cjs` and this handoff note.

Pre-existing unrelated working changes are preserved. No commit, push, deployment or publication was performed.
