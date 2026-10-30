# Quick Add implementation

Current expense follow-up: [Store Expenses](store-expenses.md) now provides history and a dedicated form using this same provider/service. Both expense entry points require a date and have a working calendar; the fictional demo owner now has typed expense seed records. The earlier empty-seed, date-input-only, and unimplemented-expense-history notes below describe the original implementation.

Visual follow-up: see [Quick Add visual refinement](quick-add-visual-refinement.md) for the current presentation, screenshot comparisons and validation limits.

Implemented the requested three actions using `docs/designs/Quick Add 1–5.png`, existing Dashboard FAB, shared form/button/confirmation controls, POS chips/icons/search/selection helpers, and live demo inventory. Reviewed AGENTS.md, package/configuration/routing, Dashboard documentation, frontend plan, requirements README and source documents, and workbook Quick Add rows in the named MAY-ARI and KAHERA sheets and the copy sheet. SDK 57 documentation was consulted before implementation.

## Files and behavior

- `src/components/dashboard/quick-add-modal.tsx`: shared forms, submission-time validation, corrections, date editing, discard/clear/type-switch/removal confirmations, dynamic success and Done. One native form modal hosts its confirmations. Safe-area content scrolls inside keyboard avoidance; dates use an explicitly labelled YYYY-MM-DD input without a new native dependency.
- `src/components/pos/credit-product-selector.tsx`: independent draft selection using existing POS search, selling-price snapshots, quantity helpers and stock ceilings. Does not navigate away, alter the POS cart, reserve products, or write inventory.
- `src/types/quick-add.ts`, `src/data/quick-add.ts`, `src/config/quick-add.ts`, `src/utils/quick-add.ts`: typed record/draft contracts, empty seed records, pictured categories, configurable Store Debt due-date policy, exact centavos, validation, calendar arithmetic and derived totals.
- `src/services/quick-add.ts`, `src/state/quick-add.tsx`, root provider: session-scoped in-memory record saves, per-owner records, immutable item snapshots and idempotency tokens. Failed saves keep the same draft and token for retry. The provider uses the existing owner capability resolver; there are no new routes bypassing session checks.
- Dashboard screen/cards and activity type: saved records appear in Recent Activity, with a derived Quick Add summary once records exist. Cash-register, revenue, sales and inventory totals are unchanged. The existing FAB retains its measured positioning, dim backdrop and centered SVG plus/close. iOS menu-to-form presentation waits for native menu dismissal.
- Shared `FormField` adds an optional `required` flag, defaulting to its previous behavior. POS icon geometry adds a minus control.
- `tests/quick-add.test.cjs`: date boundaries, configurable policy, validation, centavo precision, dirty state, immutable snapshots, authorization failure/retry, idempotency and summaries.

Records survive navigation within the current application provider, but do not persist through app reload. This is a frontend mock, not production authentication or financial posting.

## Provisional requirements and conflicts

1. MAY-ARI MA-QA-001 lists six shortcuts; its copy lists four and remarks remove Store Debt/assets. This task explicitly requests Customer Debt, Store Debt and Expense, which defines this implementation's scope. Other shortcuts were not added.
2. MA-QA-004 allows debt amounts/details, while the copy emphasizes product debt. The requested Cash/Product forms and pictures define the implemented interaction. KAHERA KH-QA-001 excludes payables and expenses; these forms remain in the existing owner-only flow. No cashier screens are introduced.
3. Customer Debt defaults to **30 calendar days**, rather than the literal date printed in the design. Store Debt uses a provisional 30-day default in `src/config/quick-add.ts`; set `storeDebtDueDays` to another interval or `null`. Its date is optional in this implementation because required identification and amount are the specified mandatory fields. Final default/required-date/past-date policies remain open; no past-date prohibition was invented.
4. Quick Add 5 supplies Electricity Expense, Water Expense and Others Expense. A copy-sheet remark proposes entering a custom category for Others; that remains unresolved. Custom categories were not inferred. Optional transaction details support the baseline workbook without making them mandatory.
5. References contain mismatched success names/amounts and inconsistent CTA wording. Success always uses the actual saved record and a Done button. Account Balances and expense-history screens are **not implemented in the repository**; their designs were inspected, but no disconnected destination or View Record button was added. The shared record provider is ready for those future lists.
6. Recording cash debt, product debt, payables and expenses may eventually affect cash, stock, sales, accounting or revenue. These posting rules are not settled. The typed service currently saves records only. Product quantities use existing POS availability ceilings as a selection constraint; saves never deduct stock. Confirm reservation/overselling and save-time availability policy before enabling inventory effects.
7. Debt records store `paymentStatus: unpaid` and a date-only due date separately; overdue is not a payment status. Payments, customer identity merging, settlements and editing saved records remain outside this task.

## Validation

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test tests/*.test.cjs`: 47 passed, 0 failed.
- `npx expo export --platform android --platform ios --output-dir .expo/quick-add-export`: both JavaScript/Hermes bundles passed. This is not a native build or runtime test.
- Headless Chrome at 320×568, 390×844 and 430×932: passed cash/product/store/expense saves, actual success names/amounts, shared activity and totals, initial validation timing and corrections, product increments/decrements and confirmed removal, clear/cancel, discard/cancel, chip/type switching and Escape confirmation. Confirmed the Save Debt action is reachable by scrolling at 320×568 and no horizontal page overflow at the three widths. Screenshots were visually reviewed. Browser-only artifacts and the interaction script are in `.expo/quick-add-*.png` and `.expo/quick-add-browser-check.cjs`; these do not validate native behavior.
- Android runtime: not tested; no ADB/device/emulator is available in this environment.
- iOS runtime: not tested; this Windows environment has no iOS simulator/device connection.

Native safe areas, keyboards, OS text scaling, TalkBack/VoiceOver, Android Back, and iOS native modal handoff remain device validation items.
