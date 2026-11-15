# Inventory and asset presentation refinement

Updated November 12, 2026. References: local `docs/designs/MA-INV-001.png` through `MA-INV-006.png` and `MA-AST-001.png`/`MA-AST-002.png`, the named MAY-ARI and KAHERA requirements, existing shared controls, and the explicit presentation refinements. Source requirements and design exports remain unchanged.

Changed files:

- `src/components/inventory/inventory-ui.tsx`: continuous viewport background, illustrated form headings, aligned fields/date controls and category dropdown. New field presentation is scoped to Inventory so debt/expense consumers retain their controls.
- `src/components/inventory/inventory-screen.tsx`: responsive summary/product cards, “Add Product” label, category dropdown inside the existing filter sheet, asset summaries/cards and outlined Delete buttons. Asset category chips remain.
- `src/components/inventory/product-screen.tsx`: illustrated add/edit/expiry/restock forms, removed form-only Product Information heading, centered photo/edit affordance, details/review hierarchy, matching Cancel/Save heights, dismissible confirmation backdrop.
- `src/components/inventory/batch-card.tsx`: consistent card/header geometry, quantity units, matching date/quantity input heights, and full-width inputs at larger native font scales.
- `src/components/inventory/asset-screen.tsx`: background, illustrated inline heading and styled existing form; keyboard hides bottom navigation.
- `assets/images/inventory/`: five unchanged supplied illustrations, a scoped calendar SVG variant with stroke 2.6 instead of 1.6, and provenance README.

Data fixtures, types, services, calculations, validation, stock/expiry handling, classifications, persistence, capability guards, integration comments, routes and save/review flows are unchanged. Product deletion already used the shared destructive modal and existing handler; it remains over the current form, with Cancel, close, Escape/back request and backdrop dismissal. Only confirmed deletion invokes the existing handler.

Reference differences retained intentionally: the app uses Products/Assets rather than the asset frames’ Receivable/Payable; filter stock labels retain their actual meanings. Existing stock-date/first-letter controls and no-expiry handling remain. Asset classification remains the existing dropdown and useful life remains years. There is no existing Review Asset Details surface: the existing direct save flow is preserved, without adding a new review step. The named role sheets remain the baseline; copy-sheet remarks do not change behavior. No example success banners or placeholder data were introduced. All requested illustrations were available; RestockProduct was also supplied and used.

Verification performed:

- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings.
- `node --test tests/inventory.test.cjs tests/sheet.test.cjs`: 22 passed. These cover existing stock/expiry boundaries, money, filters/sorting, drafts, batch deletion, atomic restocks, historical snapshots and sheet geometry.
- `git diff --check -- src/components/inventory`: passed.
- Chrome browser preview of the real Expo app at 320 × 568, 390 × 844 and 430 × 844. Checked responsive overview/cards, form illustrations, scrolling, category choices, details/review, batch inputs and actions. Quantity/date field edges and heights matched at 320/390. Wrapped edit actions both measured 68 px high at 320.
- Browser interactions: required validation, add with dated/undated batches, review/edit-details round trip/final save, batch update/save, direct and searchable-sheet restocking, restock cancellation/confirmation, product deletion cancellation/close/Escape/backdrop/final confirmation, filter category/status/sort combinations, Reset/dismiss/Apply, and asset add/edit/validation. No uncaught application exceptions were reported during successful flow checks.
- Filter options scroll within the sheet and its actions remain reachable. Touch dragging resized it from 560 to 280 px at 320 × 568. A 320 × 360 browser viewport with a focused batch input retained reachable Save Changes actions; this checks constrained browser layout, not a native keyboard.

Local ignored screenshots, scripts and results are in `.expo/inventory-presentation/`. Browser verification used the existing fictional owner and process-only `EXPO_PUBLIC_ENABLE_MOCK_AUTH=true`/`EXPO_NO_METRO_LAZY=1`. No project configuration or credentials were changed.

Android runtime: **not tested**; no ADB/device/emulator is available. iOS runtime: **not tested**; this Windows environment has no iOS simulator. Native keyboards, safe-area/system gesture insets, back gestures, text scaling, screen readers and photo picking still require device testing. No Android/iOS bundle compilation, native build, dependency installation or EAS job was performed for this presentation task. Browser and shared static checks do not validate native runtime behavior.

Pre-existing unrelated changes, including earlier edits to inventory-ui, were preserved. No commit, push or publication was performed.
