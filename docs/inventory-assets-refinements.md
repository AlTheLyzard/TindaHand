# Inventory and asset refinements

The subsequent [filter and menu refinement](inventory-menu-refinements.md) restores the Business assets filter shortcut and changes card menus to Edit-only. Delete-menu checks below describe the earlier version.

November 14, 2026. Read `AGENTS.md`, the named MAY-ARI and KAHERA workbook sheets in `docs/requirements/`, and the existing inventory implementation notes before changing the UI. Relevant criteria: MA-INV-001–006, MA-AST-001–002 and KH-INV-007. The supplied card image is the visual reference. Expo SDK 58 and the current React Native input, scrolling, modal and measurement documentation were checked.

The copy owner sheet adds overview/search/filter/edit/delete remarks; it remains a comparison rather than a replacement baseline. Older Android-only documents and broader cashier permissions do not override the project's Android/iOS scope or the named role criteria. This task does not change access rules.

## Changed files

- `src/components/inventory/asset-category-chips.tsx`: one horizontal row using `PosChip`, with the POS catalog's 8 px spacing, padding, snap offsets, fast deceleration and scroll-to-selection behavior. Reduced motion is respected.
- `src/components/pos/pos-chip.tsx`: an opt-in single-line label prop; existing callers retain their sizing and behavior. Asset chip labels use intrinsic widths without text shrinking.
- `src/components/inventory/inventory-screen.tsx`: explicit readable placeholder and primary input colors, exact Products/Assets placeholder copy, growing input height, new cards/chips, and the shared destructive confirmation modal. Delete still uses the existing guarded `deleteAsset` action and success feedback. There is no write when opening a menu or cancelling confirmation.
- `src/components/inventory/inventory-ui.tsx`: the filter's anchored category selector uses the overlay rather than inserting choices into the form. Other selector presentations remain compatible.
- `src/components/inventory/inventory-popover.tsx`: the existing `MotionModal` presents options above the sheet's clipped content. The anchored surface stays within safe-area bounds, scrolls when needed, opens above the trigger when space below is insufficient, and closes through selection, outside press or platform close requests. Measurement is refreshed after the native entrance transition and viewport/text-size changes.
- `src/components/inventory/asset-card.tsx`: white, thin blue outlined cards with token-based padding/corners, bold title/amount, muted classification/date, and a 48 px menu target. Names wrap beside the menu. Peso values and formatted dates use the actual record. Edit retains its route; Delete opens confirmation after the menu window dismisses. Useful-life data remains available in the edit form.
- `tests/asset-card.test.cjs`: regression coverage for harmless menu opening/dismissal, deferred edit/confirmation actions, one-time action consumption, and record-specific rendering.
- This document.

Fixtures, services, types, filtering calculations, money calculations, validation, routing guards and stored record fields were preserved. Source requirements and unrelated working-tree edits were preserved. No dependencies or configuration were changed.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `npm test`: 233 passed, including the three new card tests and the existing inventory, asset-form, sheet, POS and overlay-transition tests.
- Scoped `git diff --check`: passed.
- Chrome browser preview of the actual Expo app at 320 × 568, 390 × 844 and 430 × 844: single-row chips with readable labels, category selection, explicit placeholder/input colors, consistent cards, actual formatted data, and accessible menu targets.
- Browser measurements before opening, while open, and after closing the category options: identical sheet dimensions and underlying field positions at all three widths. The narrow list is bounded and scrollable. Selection, outside dismissal and Apply preserve category filtering.
- Browser action checks: opening/dismissing menus preserves records, Edit opens the existing asset with its data, Delete displays the selected name/value, Cancel/Escape preserves the asset, and confirmed deletion removes only the selected temporary demo record.
- An added long-name demo asset wraps clear of the menu at 320 px. The temporary record was removed through confirmation; the three seed records remain.
- The final browser run used motion enabled. Browser touch emulation scrolled to the final category, selected Personal Care, and dismissed the reopened options through an outside touch at 320 px.

Local ignored scripts, screenshots, results and before-change snapshots are in `.expo/inventory-assets-refinements/`. The preview used only process-level mock-auth settings and fictional demo credentials. Browser viewport/touch emulation does not validate a native device.

Android runtime: **not tested**. The installed ADB could not initialize in this restricted environment (`Cannot mkdir '\.android': Permission denied`), so a device/emulator session could not be established. iOS runtime: **not tested**; this Windows environment has no iOS simulator. Native keyboard behavior, font scaling, safe-area coordinates, screen readers and system back/gesture behavior require separate platform checks. No native builds or Android/iOS bundle compilation were performed. No commit, push, deployment or publication was performed.
