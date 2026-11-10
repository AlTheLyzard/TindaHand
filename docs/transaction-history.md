# Transaction History

The read-only owner screen lives at `/owner-menu/transaction-history`. More Tools and Dashboard View All use that destination; the legacy dynamic tool URL redirects to it. The existing owner-menu layout guards direct entry. Cashier access is unchanged: the project does not yet have an authenticated cashier workspace.

## References and scope

Inspected `AGENTS.md`, the relevant original workbook cells in **MAY-ARI MODULE**, **KAHERA MODULE**, and **Copy of MAY-ARI MODULE**, the relevant System Request, Requirements Engineering and Project Charter sections, and the existing frontend plan, API/handoff, More Tools, expenses, AR/AP and navigation documentation. The source requirements are unchanged.

- MA-MT-002 criteria 1–2 and 4–6 establish history, information, search and date/type filtering. Its criteria 3 and 7–11 include details and record management; the copy omits the detail/edit/update/delete criteria. The current user request explicitly limits this feature to read-only history, with no invented detail flow. No general transaction detail route exists; rows have no tap action.
- KH-MT-001 permits viewing/search/filter/details and forbids editing/deletion. This task does not authorize opening owner routes to cashiers, including expenses.
- MA-DASH-006 criterion 6 connects View All to history. POS and AR payment stories establish confirmed sales and separate repayments; their existing local ledgers remain authoritative for this frontend.
- The current request supersedes the older More Tools note requiring every row to stay neutral: reopening the drawer now marks the current destination. Drawer width, modal lifecycle, backdrop, animations and navigation visibility are preserved.

The actual composition reference is `docs/designs/TransactionHistory.png`; there is no root `designs/` directory. Also inspected `More tools (FS).png`, `Navigation Bar.png`, `Buttons.png`, `Typography (1).png`, `Color Pallette (1).png`, `Icons.png`, and `Form Input Fields and Such.png`. These individual design-system sheets and `src/constants/design-tokens.json` supply the available sticker-sheet material; no separate combined “Design System / Sticker Sheet” file exists. No required composition reference was missing. The expanded filter design was not supplied; it uses the existing sheet/calendar/field/button components.

## Data and behavior

`src/types/transactions.ts` is a read projection, not a replacement persistence/API schema. `src/data/transactions.ts` reuses Dashboard historical activity IDs, amounts and timestamps. It does not reinterpret Dashboard aggregate product sale lines as extra transactions. These historical events belong only to the demo owner.

`readTransactions` projects the current shared POS/customer ledger, Quick Add expense records and receivable payments. Owner IDs filter every input. Namespaced stable event keys deduplicate repeated source records. Recording a debt adds no incoming-money event; supplier payments are not relabeled as expenses or added as a new category.

Sales retain original total, net received amount and outstanding-at-sale balance separately. The visible amount is `payment.appliedCentavos`, excluding cash change and unpaid principal. A partial sale's actual tender determines Cash/GCash; Split is derived from both tender sources. Amounts remain integer centavos. The original outstanding balance is a sale snapshot; later payments remain separate debt-linked events.

POS mirrors an initial partial receipt into AR as `initial-payment-${saleId}` for debt accounting. That exact linked mirror is excluded when the corresponding sale is present. Dashboard Recent Activity uses the same identification helper, avoiding a second receipt there too. Later collections are retained independently.

Expense, collection and historical Dashboard records do not have reliable payment-method fields. History displays **Method not recorded** and leaves their method null; Cash/GCash/Split filters exclude those unknown methods. Expense records have no structured payee field: existing category/name and details are searchable without inventing a merchant. No backend schema, payment-source collection, cash posting or persistence behavior was added.

Search matches number/source ID, party and description without case sensitivity. Category, search, inclusive Manila date range and payment method intersect. Sorting uses descending event timestamp and stable ID for ties. All categories are functional. Filter draft Reset clears only the draft; Apply commits it; close, backdrop or drag dismissal discard uncommitted changes. Reopening starts from applied values. No-match recovery clears all applied filters, category and search.

## Presentation

The screen reuses Poppins, brand and feedback colors, `PosIcon`, the category version of `PosChip`, `DashboardNavigation`, `MotionModal`, `ResizableSheet`, `QuickAddField`, `CalendarPicker`, shared Buttons and Skeleton primitives. The geometric SVG recreates the bottom polygons visible in the reference; no standalone matching background asset was supplied. The reference's gray canvas, device chrome, sample duplicated records and placeholder financial amounts are not copied.

Header/search/category controls remain above a keyed FlatList; a single existing fixed navbar stays active on More. Safe areas and navbar clearance are reserved once. Titles wrap without font reduction. Metadata stays on one line at normal scale (ellipsized where necessary); amounts have independent space and switch below the title for enlarged text or large amounts. Exceptionally wide amounts can scroll horizontally within their own row. The filter sheet retains a scrollable body, reachable actions, responsive drag handle and existing reduced-motion behavior.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 126 passed, 0 failed, including six new transaction integration/domain tests. Coverage includes real POS partial/cash-change handling, a later linked repayment, initial-receipt deduplication, unpaid principal, split tender classification, shared expenses, owner isolation, unknown methods, combined filters, timestamp ties, inclusive Manila boundaries, invalid dates and exact large amounts.
- `npx expo export --platform android --platform ios --max-workers 2 --output-dir .expo/transaction-native-export`: both Hermes bundles compiled. These are JavaScript export checks, not native builds or device tests.
- Chrome browser checks passed direct-entry guarding, More Tools dismissal/active destination, categories, combined search, no-match clearing, date validation, Apply, Reset/cancel draft preservation, calendar selection, back navigation and reduced-motion presentation. Visually compared screenshots at 320×568, 390×844, 412×917 and 430×844 against the composition reference; no horizontal page overflow was observed.
- Completed a partial Cash sale through the real POS UI: History showed +₱10.00, search by its customer worked, Cash filtering retained it, and Customer Payments excluded the initial AR mirror. Domain tests separately cover later repayment and Split classification.
- Browser-only service overrides exercised no transactions, a pending read/skeleton, a rejected read and successful Try Again, then restored the original reader. A synthetic long customer name and +₱1,234,567,890.12 remained readable and unbroken at 320×568. These overrides changed no seed or production code. Native accessibility font scaling was not simulated by these screenshots.
- The pre-existing NativeWind web login error (`Cannot manually set color scheme, as dark mode is type 'media'`) was suppressed only in the local browser harness so the UI could be inspected. No app/theme configuration was changed. The completed browser interaction pass recorded no additional application console errors. Local harness, screenshots and exports are ignored under `.expo/transaction-*`.
- **Android runtime: not tested.** ADB could not initialize because it cannot create `\\.android` in this sandbox, including with a workspace-local Android user directory. No native build was run.
- **iOS runtime: not tested.** No iOS test session or simulator is available on this Windows host. No native build was run.

Native safe areas/notches, hardware back/swipe dismissal, native keyboards, text scaling and screen readers still require platform runtime validation. Browser screenshots and bundle compilation do not establish those results. No dependency or build configuration changes were made.

## Changed files

New files:

- `src/app/owner-menu/transaction-history.tsx`
- `src/components/transactions/transaction-history-screen.tsx`
- `src/components/transactions/transaction-filter-sheet.tsx`
- `src/types/transactions.ts`, `src/data/transactions.ts`, `src/utils/transactions.ts`
- `src/services/transactions.ts`, `src/hooks/use-transactions.ts`
- `assets/images/financial/transaction-background.svg`
- `tests/transactions.test.cjs` and this document

Updated existing files:

- `src/app/owner-menu/[tool].tsx`: legacy redirect
- `src/components/menu/owner-menu-drawer.tsx`, `menu-row.tsx`: destination, selected styling/semantics and accurate accessibility hints
- `src/data/menu.ts`: implemented read-only destination copy
- `src/components/pos/pos-chip.tsx`: category appearance, preserving other existing appearances
- `src/components/dashboard/owner-dashboard-screen.tsx`: initial POS/AR receipt deduplication
- `docs/owner-menu.md`, `docs/backend-handoff.md`, `assets/images/financial/README.md`: feature status, superseded behavior and asset provenance

SDK 58 and relevant current API documentation were checked before implementation: [SDK reference](https://docs.expo.dev/versions/v58.0.0/), [Expo docs index](https://docs.expo.dev/llms.txt), [Router navigation](https://docs.expo.dev/router/basics/navigation/), [safe areas](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/), [FlatList](https://reactnative.dev/docs/flatlist) and [Text](https://reactnative.dev/docs/text).
