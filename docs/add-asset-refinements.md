# Add Asset refinements

November 14, 2026. Scope: amount entry, classification presentation, successful-save confirmation, and Add Asset button text. Mock writes, service/type contracts, owner guards, classifications, fixtures, and validation rules are retained.

## Requirements and design decisions

Read `AGENTS.md`, the named MAY-ARI sheet's MA-AST-001/002 and MA-QA-004 acceptance criteria, and the KAHERA restrictions in `docs/requirements/USER-STORY-v.02.10.2026 (1)(1).xlsx`. MA-AST-002 requires required-field validation, a classification, Save/Add and Cancel actions, and a dismissible successful-save confirmation showing the asset and value. The copy owner sheet adds an asset-button remark to MA-AST-001; it does not replace the named sheet.

The supplied reference is `docs/designs/MA-AST-002.png`, rather than a root `designs/` directory. It shows three always-visible radio cards with icons, descriptions and classification badges. There is no chevron or open/close dropdown interaction to reproduce. The asset form now follows those cards instead of the generic modal picker. Existing option labels and values remain `Current Asset` / `current`, `Equipment` / `equipment`, and `Furniture & Fixtures` / `furniture`. The reference's narrower “Cash on Hand” title is not imposed on existing current-asset records. Useful life remains whole years, including the current-asset exemption; the reference's date-like useful-life field does not change that contract. No review screen was added.

The success reference is the current implemented Quick Add `Debt Saved` card. Its existing markup, dimensions, typography, spacing, focus behavior, Done action and `SuccessHalo` were extracted into `SuccessContent` and reused by both flows. Quick Add keeps its existing modal host. Asset save uses the existing animated modal host with Quick Add's backdrop color and centering/inset layout. “Changes Saved” shows the saved asset name and exact amount. Only an accepted mock dispatch opens it; dismissal finishes before returning to the previous route. No second inventory-feedback popup is queued.

## Amount bug and integration boundary

The shared formatter already supported grouping and decimal drafts, but its event handlers read text/value from their last render. A change followed by blur, rejection, or an intervening render could replace the latest draft with older presentation state. Selection notifications can also lag clearing or an external value update. An offset beyond the current text length caused edit-range slicing to drop an entire inserted amount.

`MoneyInput` now keeps a synchronous latest draft for event handling and distinguishes a changed external prop from an acknowledgement of its own edit. Rendered text remains React state. Edit ranges clamp stale selections to the current text. Grouping, caret mapping, paste validation and existing precision limits are retained. Blur settles the latest valid draft to two decimal places without filling an empty input. Parent form values remain ungrouped decimal-peso strings.

An integration comment in `AssetScreen.save` identifies the boundary: `parsePaymentAmount(value)` converts ungrouped pesos to exact integer centavos before mapping `valueCentavos` into the unchanged `saveAsset` payload. Commas never enter calculations or payloads.

## Changed files

- `src/components/ui/money-input.tsx`: latest-draft event handling and external-value reconciliation.
- `src/utils/money-input.ts`: bounded selection offsets after clearing/external changes.
- `src/components/inventory/asset-classification-field.tsx`: reference-based accessible radio cards using the existing classification mappings and design tokens.
- `assets/images/inventory/asset-current.svg`, `asset-equipment.svg`, `asset-furniture.svg`, and `README.md`: scoped outlines and provenance.
- `src/components/ui/success-content.tsx` and `src/components/dashboard/quick-add-success.tsx`: extracted, shared Quick Add success presentation.
- `src/components/inventory/asset-screen.tsx`: classification field, successful-save confirmation, payload comment and centered Add Asset action.
- `src/components/inventory/inventory-screen.tsx`: removes the literal plus from the overview's Add Asset button.
- `tests/money-input.test.cjs` and `tests/asset-form.test.cjs`: regressions for stale offsets/events, retained drafts, centavo payloads, invalid/rejected saves, duplicate taps and repeated confirmations.
- This document.

Pre-existing working-tree edits were preserved, including earlier changes in some of these files. No dependency, configuration, backend, source-requirement, commit, push or publication changes were made.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 225 passed. This includes the existing inventory, payment, cash, debt, expense, shared-field, keyboard, overlay and success-animation checks.
- The new money regressions fail when run against the saved pre-change implementation and pass with the changes.
- Chrome browser checks at 320, 390 and 430 px: integer/decimal typing, thousands separators, trailing decimal, blur padding, empty input, peso/grouped paste, invalid paste, middle insertion/selection replacement, backspace across a separator, precision rejection, unchanged form fields across classification selections, and exact saved amounts.
- Three successive asset additions: correct name/value confirmation, pulsing halo on every opening, Done/Escape dismissal, removal of halo nodes and return to saved records. Invalid submission does not open success.
- Customer Debt and Store Debt browser checks: correct grouping, blur and saved values; Quick Add's success and dismissal still work. Asset and Quick Add cards both measured 340 × 345 px at a 390 px viewport, with 24 px padding, 16 px gaps/corners, 24 px headings and 22 px amounts.
- A constrained 320 × 300 browser viewport kept both focused amount and useful-life editors visible. This is a layout/focus check, not native keyboard validation.

Ignored local scripts, screenshots, results and baseline copies are in `.expo/add-asset-refinements/`. The browser preview used process-only mock-auth settings and fictional credentials. A transient Metro module-cache error required restarting the preview; the completed browser run reported no uncaught application exceptions.

Android runtime: **not tested**. The installed ADB was checked and lists no connected device or emulator. iOS runtime: **not tested**; this Windows environment has no iOS simulator. Native keyboards, text scaling, screen readers, safe areas and platform back/gesture behavior still require device checks. No Android/iOS bundle compilation, native build, dependency diagnostic or EAS job was performed. Shared checks and browser rendering do not establish native runtime validation.
