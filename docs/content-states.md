# Empty and loading states for completed frames

Scope: existing guarded owner Dashboard, Inventory Products/Assets, Product Details and existing-record edit/restock/delete views, Asset edit/delete, POS selection, Cart Review, and Payment. Welcome, authentication, add forms, unfinished cashier routes, Transaction History, financial tools and other unimplemented frames are unchanged.

Reviewed root AGENTS.md, the named MAY-ARI MODULE MA-DASH-001–007, MA-INV-001–006, MA-AST-001–002 and MA-POS-001–004 criteria, corresponding KAHERA stories, and differences in Copy of MAY-ARI MODULE. Also reviewed supporting source requirements, frontend plan, Dashboard/Inventory/POS implementation notes, existing routing/configuration/lockfile, frame exports and sticker-sheet palette, typography, buttons, icons and navigation. `docs/designs/README.md` still says no exports are included; actual PNG exports are present and were used as references. Expo SDK 57 documentation and React Native accessibility/animation documentation were consulted before API changes.

## Behavior and preview

Run `npm start` and use the existing development registration success preview → Continue → Skip for Now to enter the guarded owner flow. On each affected screen, tap **Development state preview** to expand the selector, then choose a state. It collapses after selection. **Live demo** restores the current session data; it does not reseed or reset edited inventory, selected items or payment drafts. Selectors are development-only, local to each mounted screen and never bypass the existing route guards. No preview route, credentials in URLs, backend, new dependencies, native configuration or timers simulating network requests were added.

| Screen | Natural empty trigger | Preview choices and recovery |
| --- | --- | --- |
| Dashboard | No sales in the selected period; no ranked sales; no activity; no inventory | Live demo / Loading / No data. No data uses a typed zero-value fixture, with no fabricated growth or trend. Period controls remain; Stock Health opens Inventory, Best-Selling Items opens POS. View All retains its existing unavailable notice. |
| Inventory → Products | Empty product collection; search with no matches; active category/letter/status filters with no matches | Live demo / Loading / No data / No search results / No filter results. Add Product uses the existing form; result misses reset search and filters. Summary cards, search, tabs, filters, Add Product and navigation stay in place. Restock is disabled during loading and without products. |
| Inventory → Assets | Empty asset collection; no matching search; no matching classification | Same five choices. Add Asset uses the existing form; reset clears search and classification. Headers, summary surfaces, tabs, classification controls, Add Asset and navigation remain. |
| Product Details | Missing selected record; no restocks for that product in this session | Live demo / Loading / No data (missing-record recovery). Return to Inventory chooses another record. Natural empty restock history uses Restock. Seed products start with empty session history; recording a restock replaces it with history rows. |
| Product edit / restock / delete | Missing or deleted record | Live demo / Loading / No data. Loading takes precedence over missing-record feedback; return to Inventory remains the recovery action. Add Product has no record to fetch and keeps its normal blank form. |
| Asset edit / delete | Missing or deleted record, or invalid mode | Live demo / Loading / No data. Return to Assets opens the existing Assets tab. Add Asset keeps its normal blank form. |
| POS selection | Empty catalog; no search matches; no category matches | Same five list choices. No data opens Inventory; result misses reset search and category. Search/categories, order summary, View Cart and navigation remain. Existing order selections are independent of catalog preview overrides. |
| Cart Review | No selected lines, including after confirmed Empty Cart/removal of the last line | Live demo / Loading / No data. Browse Products returns to selection; zero totals and disabled checkout remain for an empty order. Loading replaces record rows, totals and mutation actions. |
| Payment | No selected quantities | Live demo / Loading / No data. Browse Products returns to selection. Loading replaces the payment content; the form and confirmation action cannot be used while it loads. Returning to Live demo preserves Cash/GCash drafts. |

Search/filter preview choices force a result miss without modifying the actual search field or filter selection. Their inline reset action exits the override as well as clearing the controls. No data overrides only that view's collection and never deletes records. To exercise a natural first-use inventory state, records can also be deleted through the existing guarded demo controls. Those session edits are real demo mutations, unlike display previews.

## Shared implementation

- `src/components/ui/content-state.tsx`: shared EmptyState, busy/loading wrapper, geometry-preserving metric slots, placeholder bars, reduced-motion-aware pulse and local development selector. Skeleton animation starts only after the OS preference resolves, reacts to preference changes and stops on unmount. Hidden geometry and decorative bars are excluded from the accessibility tree using native and ARIA properties.
- `src/components/ui/content-skeletons.tsx`: templates derived from existing card/list/grid/form/payment structures, image aspect ratios, responsive field columns, action counts and text scaling. Cart slots follow the current selected-line count when available; payment follows the selected Cash/GCash layout. Unknown record counts and text lengths cannot reserve an exact final document height. Existing safe-area shells and scroll clearance are reused on both platforms.
- `src/data/content-preview.ts`: typed empty Dashboard fixture, separate from the populated seed and editable demo state.
- `src/utils/dashboard.ts`: accepts a view-data fixture without changing the default dataset. Missing/zero prior sales produce no growth comparison. Expense aggregation avoids negative zero for a first-use store.
- Updated screen files: `src/components/dashboard/{owner-dashboard-screen,dashboard-cards}.tsx`, `src/components/inventory/{inventory-screen,product-screen,asset-screen}.tsx`, and `src/components/pos/{product-browsing-screen,cart-review-screen,payment-screen}.tsx`.
- `tests/auth-validation.test.cjs`: first-use Dashboard checks for all periods, zero totals, absent rankings/comparison and unchanged populated fixtures.

Every data region renders loading first, then empty/missing feedback or populated content. No empty message is displayed while loading. Synchronous fixture reads normally render immediately; skeletons are currently reached through the explicit development preview. There is no agreed asynchronous repository/service contract to wire them to yet, and no production loading delay was introduced.

## Documentation limits

There are no separate state designs or specified loading timings/copy. New English copy and placeholders derive from the implemented layouts and supplied design system. Existing design/requirements differences remain: Financial Overview/Store Health naming versus Sales Report/Stock Health, copy-sheet additions to rankings/inventory and unresolved capital placement, broader permissions in older supporting documents, and cashier split-payment criteria versus owner Cash/GCash. None expands this task. Current owner guards remain; no unfinished cashier frame is implemented.

Requirements call for persisted sales and transaction history, while the approved frontend demo has neither. Empty-state copy describes what belongs in each section; it does not claim demo payment saves a sale. Recent Activity retains its existing View All unavailable notice and has no new transaction-history action. Payment remains a local preview with retained cart and no stock deduction. Source requirements are unchanged.

## Validation

Shared checks: `npm run lint`, `npm run typecheck`, and `node --test tests/*.test.cjs` (37 tests). Browser harness and screenshots are ignored under `.expo/content-state-check/`; it checks all preview modes, natural search recovery, existing-record recovery, retained order selection, actual Empty Cart, loading/empty exclusivity, busy semantics, and live changes to reduced motion. Screenshots cover 320×568, 390×844 and 430×932 without horizontal document overflow. This validates browser rendering, not native keyboard, font scaling or safe-area behavior.

Android: Hermes bundle export via `npx expo export --platform android --platform ios --output-dir .expo/content-state-export`. Native build and runtime **not tested**; no connected Android device/emulator or ADB is available.

iOS: Hermes bundle export using the same command. Native build and runtime **not tested**; this Windows environment has no iOS simulator/device session. Both platforms still need device checks for safe areas, screen readers, dynamic text, keyboard, back/gesture behavior and pulse performance. Bundle export is compilation, not a native build or runtime validation.
