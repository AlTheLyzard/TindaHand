# Inventory filter and asset menu refinements

## Latest control and alignment follow-up

Both tabs now use `InventoryFilterControl`, extracted directly from Products' existing compact text Button with its trailing filter artwork. Assets displays the same Filter label, 20 px icon, typography, spacing, colors and pressed feedback at the right of the Business assets heading. Existing sheet handlers and filtering behavior are unchanged.

The asset menu's only Edit action is now right-aligned inside the existing surface, using the same 16 px action padding. Menu size, placement, dismissal and selected-record navigation are unchanged. This supersedes the earlier left-alignment requirement and the historical notes below.

Files changed in this follow-up: `src/components/inventory/inventory-filter-control.tsx` (shared control), `src/components/inventory/inventory-screen.tsx` (both usages), `src/components/inventory/asset-card.tsx` (internal alignment), and this document. No dependencies, configuration, fixtures or business logic changed.

Validation: `npm run typecheck` and `npm run lint` passed without warnings; the three existing `tests/asset-card.test.cjs` tests passed. Chrome checks at 320 × 568, 390 × 844 and 430 × 844 confirmed identical normal and settled pressed control styles, matching icon artwork/geometry, right-edge/vertical heading alignment, both sheet-opening handlers, and right-aligned Edit-only menus across all three asset records. Menus retained their 144 px width, balanced right padding, screen bounds and outside dismissal; each asset's Edit opened its own populated form. Completed browser checks reported no uncaught application exceptions. Ignored evidence is in `.expo/inventory-control-refinements/`.

Android runtime was not tested: ADB again failed to initialize with `Cannot mkdir '\.android': Permission denied`. iOS runtime was not tested: this Windows environment has no iOS simulator. Browser checks do not establish visual consistency on native devices; native text scaling, safe areas and platform interactions still need device checks. No native builds or bundle exports were performed.

## Previous implementation and verification

November 14, 2026. Read `AGENTS.md`, the named MAY-ARI and KAHERA workbook sheets in `docs/requirements/`, and the existing inventory notes. Relevant criteria: MA-INV-001/003/005, MA-AST-001/002 and KH-INV-007. The named role sheets remain the baseline; the copy owner sheet's additional overview remarks do not change scope. Expo SDK 58 documentation and React Native's modal/measurement documentation were checked before implementation.

## Changed files

- `src/components/inventory/inventory-screen.tsx`: restores the filter icon beside Business assets, using the existing `IconButton`, filter artwork and a 48 px touch target. Heading and button share a vertically centered row with the button aligned to the content's right edge. The icon and Products' Filter button use the same existing draft/open handler and Sort & Filter sheet. Removes the now-unused card-menu deletion modal/state. The existing separate asset delete-confirmation route is unchanged.
- `src/components/inventory/inventory-ui.tsx`: explicitly names the selector's anchored presentation and renders its modal host separately from the field's measured View. Category choices do not become expanding form content. Other selector presentations retain their modal behavior.
- `src/components/inventory/inventory-popover.tsx`: preserves the shared anchored `MotionModal` approach; clamps vertical anchors and widths to safe screen bounds, retains the measurable native host, and explicitly bounds the scrolling surface. Options stay above the clipped sheet content, with selection/outside/platform dismissal handling intact.
- `src/components/inventory/asset-card.tsx`: removes Delete and its callback; the menu contains one Edit action using the existing `ButtonSurface`. The label is left-aligned, the menu is three touch-target widths wide, and balanced padding preserves a 48 px action. Edit runs after the menu's native window dismisses. Card presentation and record data are unchanged.
- `tests/asset-card.test.cjs`: updates the action regression to assert one Edit action, correct record targeting, deferred navigation and prevention of repeated action dispatch.
- `docs/inventory-assets-refinements.md`: links the earlier implementation report to this follow-up; the older report's Delete-menu checks describe the preceding version.
- This document.

Both filter entry points open the existing product Sort & Filter sheet and preserve its category/sort/status draft and Apply behavior. Asset classification chips retain their existing filtering behavior. This refinement does not introduce new asset sorting rules or change fixtures, services, business calculations, role guards, routes, dependencies or configuration. Unrelated working-tree edits were preserved.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed without warnings.
- `node --test tests/asset-card.test.cjs tests/inventory.test.cjs tests/asset-form.test.cjs tests/sheet.test.cjs tests/overlay-transition.test.cjs`: 32 passed.
- Scoped `git diff --check`: passed.
- Chrome preview at 320 × 568, 390 × 844 and 430 × 844, with motion enabled: the restored icon is centered in the heading row, its touch target measures at least 48 × 48 px, and it opens the existing sheet.
- At every width, measured sheet bounds and all underlying radio-field positions were identical before opening the category list, while open, after selection, and after outside dismissal. The 320 px option list is scrollable and stays within the viewport. Applying Canned Goods and reopening retains the selected category and existing product filtering.
- Each of the three asset menus, at each width, contained exactly one left-aligned Edit action, measured 144 px wide with no unused Delete row, stayed within the viewport and dismissed through its outside backdrop. At 320 px, all three Edit actions opened their matching asset's existing populated form; Cancel returned to the records without a write.
- Completed browser checks reported no uncaught application exceptions. Scripts, screenshots and measurements are in the ignored `.expo/inventory-menu-refinements/` directory. Only process-level mock-auth flags and fictional credentials were used.

Android runtime: **not tested**. The installed ADB again failed to initialize with `Cannot mkdir '\.android': Permission denied`, preventing a device/emulator session. iOS runtime: **not tested**; this Windows environment has no iOS simulator. Native screen readers, font scaling, safe-area measurement, keyboards and back/gesture behavior still require platform testing. Shared checks and browser rendering are not native runtime validation. No native build, native bundle export, dependency installation, commit, push or publication was performed.
