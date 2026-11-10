> Authentication update (November 9, 2026): use [authentication-handoff.md](authentication-handoff.md) for the current routes, adapter contracts, mock configuration and server rules. It supersedes older authentication/registration/recovery and three-part Cashier-ID notes below. The Operator workspace remains unimplemented.

# Backend handoff

Accounts Payable MA-AP-001–004 now has shared in-memory creditor/debt/payment state, debt creation, payment preview/confirmation and paid history. See [accounts-payable.md](accounts-payable.md) for routes, verified behavior, requirements gaps and the replaceable repository boundary. This supersedes the historical AP placeholder status in the inventory table below. [Accounts Receivable MA-AR-001–004](accounts-receivable.md) now also has the complete frontend debt/payment/history flow, sharing customer debts and stock operations with Quick Add and POS.

Owner Settings now has proposed frontend service contracts and in-memory cashier/PIN/sync/cache behavior. See [owner-settings.md](owner-settings.md) for the confirmed three-part Cashier identification scheme, integration boundaries, requirements conflicts, and required authorization, Owner PIN verification, failed-attempt limits, secure PIN hashing, credential-free audit events and affected-Cashier session invalidation. No backend protections or durable sync/cache behavior are implemented by this mock.

Code audit: **October 30, 2026**. This is a frontend handoff, with no network integration. Backend framework is undecided; MySQL is planned later. Read [README](../README.md) to run the demo and [API notes](api-contract.md) before choosing contracts. `TODO(BACKEND)` marks integration work in code.

## Requirements and authority

Baseline: the **MAY-ARI MODULE** and **KAHERA MODULE** sheets of [the original workbook](<requirements/USER-STORY-v.02.10.2026 (1)(1).xlsx>), plus [System Request](<requirements/SYSTEM-REQUEST-v1.24.09.2026(1).md>), [Requirements Engineering](requirements/REQUIREMENTS_ENGINEERING-v1.25.09.2026.md) and [Project Charter](requirements/PROJECT_CHARTER-v2.02.21.10.2026.md). Originals are unchanged. The copy owner sheet is comparison material, not a merged baseline. The [frontend plan](frontend-plan.md) is proposed structure, not implemented scope.

`AGENTS.md`'s October 17 scope decision requires both Android and iOS, superseding the originals' Android-only scope. Acceptance criteria/testing documents still need formal platform revision. Frame exports demonstrate appearance, not implementation completeness. [Updated POS notes](pos-updated-flow.md) supersede earlier preview-only POS descriptions in `pos-payment.md` and `inventory-and-assets.md`.

## Actual module/frame inventory

“Implemented” below describes the supplied frontend scope; it does not claim all story criteria are satisfied. Backend integration is **none for every row**. Routes are relative to `src/app/`; components are under `src/components/`.

| Module / story or frame | Routes and main screens | UI status | Mock interaction status | Service / data boundary |
| --- | --- | --- | --- | --- |
| Welcome, MA-LOG-001 | `index.tsx` | Implemented | Navigation works | No data write |
| Role selection/login, MA-LOG-005, KH-LOG-001-002 | `choose-account.tsx`, `login.tsx`; `auth/role-login-screen.tsx` | Implemented selection/forms; recovery absent | Opt-in Owner login and three-part Cashier demo credential checks; Cashier workspace unavailable | `authenticateMockOwner`, `settingsService.verifyCashier`, `state/auth-flow.tsx` |
| Registration/confirmation/ID, MA-LOG-002-004 | `register.tsx`, `account-created.tsx`, `owner-id.tsx`; `auth/registration-screen.tsx` | Owner forms implemented; initial Cashier setup reuses Settings form | Validation/preview; normal Owner registration unavailable; in-memory Cashier creation | `registerOwner`, `utils/registration-request.ts`, `SettingsService.createCashier` |
| Dashboard, MA-DASH-001–007 | `owner-dashboard.tsx`; `dashboard/owner-dashboard-screen.tsx` | Implemented cards/navigation | Periods, stock links, activity, cash modal, Quick Add | `getDashboardData`, `createCashRegisterService().begin/add` |
| Inventory MA-INV-001–006, assets MA-AST-001–002 | `owner-inventory/index.tsx`, `product.tsx`, `asset.tsx`; `inventory/*-screen.tsx` | Implemented owner list/detail/forms | Search/filter/rank, product/asset add/edit/delete, restock, photo selection | `loadMockInventory`, `getInventorySales`, `applyInventoryAction` through `useInventory` |
| POS MA-POS-001–004; POS catalog/cart/payment exports | `owner-pos/index.tsx`, `cart.tsx`, `payment.tsx`; `pos/*-screen.tsx` | Implemented four payment modes | Cart, validation, confirmation, stock deduction, sale/payment/debt/customer commit | `usePos().completeOrder` → `applyInventoryAction` → `commitMockSale` |
| Quick Add MA-QA-001,004–005; Quick Add 1–5 | Dashboard/modal, no independent route; `dashboard/quick-add-modal.tsx` | Customer debt, store debt, expense implemented; new-sale/product/asset shortcuts absent | Cash/product debt, dates, totals, clear/discard, save and feedback | `createQuickAddService().save` via `useQuickAdd` |
| Expenses MA-MT-003, MA-QA-005; Store Expense 1–3 | `owner-menu/store-expenses/index.tsx`, `new.tsx`; `expenses/*-screen.tsx` | Implemented list/add form | Search/category, derived monthly total, validation, date picker, discard and shared save | Same Quick Add service; `utils/expenses.ts` selectors |
| More Tools and navigation MA-DASH-007 | `owner-menu.tsx` redirects Home; `owner-menu/_layout.tsx`, `[tool].tsx`; `menu/owner-menu-drawer.tsx` | Drawer implemented | Authorized destinations and modal handoff | `data/menu.ts` metadata |
| Transactions MA-MT-002 | `owner-menu/transaction-history.tsx`; `components/transactions/*` | Read-only history; no general detail/edit/delete flow | Shared sale/collection/expense projection, search/category/date/method filtering, staged sheet, loading/empty/retry states | `services/transactions.ts`; see [Transaction History](transaction-history.md) for source gaps and validation |
| Receivables MA-AR-001–004; payables MA-AP-001–004 | Same dynamic route, `tool=receivables-payables`; `pos/session-records.tsx` | Partial customer-debt list; full management absent | Customer balances from POS/Quick Add; debt-entry buttons. Store debt has dashboard total/activity, no payable list | `store.pos.debts` + `useQuickAdd().records` |
| Financial statements MA-MT-001, Profile MA-PRO-001-003 | Dynamic tools `financial-statements`, `profile` | Placeholders; Profile shows identity | No reports/exports, profile editing or permissions management | No backend service yet |
| Settings MA-SET-001; Settings 1-6 | `owner-menu/settings/*`; `components/settings/*` | Landing, Language, Security, Cashiers, Data, Help-unavailable | Shared cashier creation, Owner PIN change, selected cashier reset, sync/cache simulation | Replaceable `SettingsService`, typed fixtures and immutable snapshots; see [Owner Settings](owner-settings.md) |
| Barcode MA-MT-004, KH-MT scanner story; cashier application | No scanner or cashier workspace routes | Not implemented | Cashier demo credentials can be verified; no Cashier session/workspace or scanner | Do not infer completion from shared Owner components |
| Expo starter | `explore.tsx` and starter UI/theme helpers | Retained starter route | Outside product scope | Retained because route/import/asset references exist |

Inventory route parameters: product `mode=add|edit|restock|details|delete` with existing `id` as applicable; asset `mode=add|edit|delete`, `id`; list `tab=assets` and stock `status=out|low`. Product mode handling is in `inventory/product-screen.tsx`; do not put credentials in route parameters.

## Authentication

- `services/mock-auth.ts` checks public fictional fixture `data/mock-auth.ts`, gated by development and `EXPO_PUBLIC_ENABLE_MOCK_AUTH=true`. `services/registration.ts` always returns unavailable. Preview confirmation uses `data/registration-preview.ts`, not a generated server account.
- `state/auth-flow.tsx` owns in-memory identity, registration draft and access flags. `utils/dashboard-access.ts` and owner route layouts gate direct access as well as navigation. They simulate capabilities; they provide no server security.
- Integration checklist: agree ID issuance/login/recovery/session protocol; validate password/PIN rules server-side; return assigned identity; replace mock session resolution; handle expiry/logout and securely manage credentials/tokens after choosing the protocol. Registration UI must wait for confirmed service success. Update sync login and its caller for async pending/retry/field errors.
- Cashier stories require POS, authorized inventory edits/restocks, read-only assets, receivables, transaction viewing, profile/settings. Deny product creation/deletion, asset mutation, other-user management, owner financial tools, expenses and payables on the server. Cashier access remains future work; do not simply open `/owner-*` routes to it.

## Inventory and POS

- `services/inventory.ts` is the typed seed/read and command boundary used by `state/inventory.tsx`; pure mutations remain in `utils/inventory.ts` and `utils/pos-checkout.ts`. Screens keep using the shared providers. Search/filter selectors operate locally over full collections; there is no pagination, remote search, polling or upload.
- Inventory checklist (MA-INV-001–006, MA-AST-001–002): authenticated store-scoped reads; agree filters/sorts/pagination; persistent CRUD and restock history; photo upload/URI mapping; concurrency checks for edits/deletes/stock; approved stock/expiry policies. The local photo URI is temporary device data. Stock-lot/FIFO behavior, depreciation and historical deletion policy are not implemented.
- POS checklist (MA-POS-001–004 and KH-POS-001–004): fetch authoritative catalog/customers; send checkout intent; validate current stock, quantity, pricing, customer, references and tender math server-side; commit sale, payment, customer when needed, remaining debt and inventory deduction in **one atomic database transaction**. Enforce persistent idempotency per store/request and return authoritative records. Restock increment + history also requires one transaction.
- Confirmed Partial Payment / “May kulang”: **0 < amount < sale total**, existing customer selection or entered name, explicit **Cash or GCash**, remaining balance recorded against that customer, and **no installment schedules**. POS debt has no invented due date. Mock name normalization/reuse/creation is demo behavior; production identity/linking rules remain open.
- Current full-payment rules, recorded in [POS decisions](pos-updated-flow.md): GCash cannot exceed total; Split combines Cash + GCash and only Cash funds change; GCash requires a trimmed nonblank reference (no numeric-only or fixed-length rule). GCash is manual recording, with no transfer verification.
- `state/pos.tsx` clears drafts and reports success only when the synchronous local command succeeds. The backend adapter and **all write callers** must become async, retain drafts on failure, disable duplicate submits while pending, and report success **only after the server confirms the write**. Never keep the synchronous boolean interface while launching a background request. Refetch/reconcile stock and server IDs after success.

## Quick Add and expenses

- `services/quick-add.ts` returns `Promise<QuickAddRecord>`, validating drafts and using an owner/token Map for idempotency. `state/quick-add.tsx` appends successful results, merges POS debts and links customer names via inventory. Both expense entry points use this save path.
- Checklist (MA-QA-004–005, MA-MT-003, MA-AR-002, MA-AP-002): persistent authorized writes/reads; server validation; durable idempotency; agreed customer/supplier identity; consistent linked-debt model and dates; confirmed save results before feedback. Quick Add customer linking is a second local update, **not** an atomic service transaction. Integrate debt + customer linking together once policy is agreed.
- Quick Add debt/expense writes are record-only: no sale, stock deduction, cash movement, revenue recognition or accounting posting. Do not silently introduce those effects. POS partial debt does reduce stock as part of the sale. Debt payment/settlement UI and payment-history flows are absent.
- Expense categories are exactly `Electricity Expense`, `Water Expense`, `Others Expense`. Amount and real calendar `expenseDate` are required; details optional. Monthly total uses Asia/Manila calendar month/year independently of search/filter and event timestamp. No payment source or past/future expense-date prohibition is assumed.

## Dashboard and cash

- `services/dashboard.ts` combines `data/dashboard.ts` historical fixtures with current mock POS sales. `utils/dashboard.ts` derives daily/weekly/monthly totals, rankings and cash; `data/growth-preview.ts` is display-only chart history. Inventory alerts use the live shared catalog. Live session sales advance the dashboard reference clock; fixture growth comparisons are disabled in that case.
- `services/cash-register.ts` wraps the existing token-protected cash adjustment store. Additions affect displayed cash, not sales or a stored transaction-history record. The overflow check still uses the original fixture opening balance, not a ledger refreshed from POS; reconcile this when integrating cash.
- Checklist (MA-DASH-001–007): agree reporting clock/window/timezone and cash ledger, query summaries/rankings/activity from confirmed records, avoid counting linked debt as another sale, exclude GCash from physical cash, authorize cash movements and confirm writes. Growth percentage and chart points must use the same period/comparison; unavailable comparisons remain null.

## Persistence

| State / fixture | Current lifetime and limitation |
| --- | --- |
| Inventory products/assets/restocks, POS customers/sales/debts/cart, cash adjustments | Keyed to owner ID, role and dashboard access; reset on session change/logout. Seeds cloned from `data/inventory.ts`, `data/customers.ts`; restocks/sales/debts start empty |
| Quick Add records and idempotency Map | Root provider survives logout; owner-filtered records reappear for the same owner until full reload. POS-linked debts disappear with the inventory session. Choose one explicit cache/logout policy before integration |
| Expense seeds | `data/expenses.ts` → `data/quick-add.ts`: three fictional October 2026 expenses totalling ₱2,450.00, only for `TH-DEMO-OWNER`; monthly total changes with actual Manila date |
| Dashboard/ranking/chart history | `data/dashboard.ts`, `data/inventory.ts` historical lines, `data/growth-preview.ts`; separate historical datasets, not a reconciled persistent accounting ledger |
| Forms/session/accounts | React memory only, no AsyncStorage, secure storage, localStorage, database or remote API. No offline synchronization or queued writes |

Full reload/restart resets all edited demo state. Provider-local duplicate protection is not durable and does not handle multi-device races.

## Open decisions and conflicts

1. No agreed API schema, server framework, authentication/session mechanism or database design was found. Frontend models are not MySQL tables.
2. Original Android-only requirements versus approved dual-platform scope need formal document revision; originals remain preserved.
3. Baseline owner MA-POS-004 lists Cash/GCash; later confirmed owner flow adds Split and Partial (cashier KH-POS-004 already includes Split). Preserve the current confirmed POS decisions above.
4. Customer create/link rules, duplicate or same-name customers, ownership, merging and supplier identity remain undefined. The demo's case/whitespace normalization does not settle these rules.
5. PIN recovery email/verification versus offline recovery code; offline account creation/session behavior; password/PIN security; and multiple Kahera onboarding versus removal remarks remain unresolved (MA-LOG-003–005).
6. Named owner Quick Add criteria include sale/product/asset/debt/expense shortcuts. Actual UI currently exposes only customer debt/store debt/expense. The copy removes asset/store-debt actions and changes debt entry to products; do not treat that copy as approval to remove current behavior. Quick Add also defaults customer debt to 30 days and provisionally store debt to 30 days (`config/quick-add.ts`), whereas POS debt has no default; agree final rules.
7. Copy-sheet custom Others expense category, payment date/source notes and cash/GCash in expense frames are not baseline requirements. Expense date is explicit; source/posting remains open. Frames show an inconsistent total; code derives the actual sum.
8. Customer debt item-by-item allocation, receipt scope, debt payment rules and supplier-payment posting need decisions; no installments are introduced. Payment status must stay independent from overdue state.
9. Baseline MA-MT-002 includes transaction edit/delete; the copy omits those criteria. Current list is read-only and partial. Agree audit/reversal and related accounting/inventory behavior before implementing destructive transaction changes.
10. Demo stock policy is low 1–5, critical 1–2, expiry warning ≤30 days; value is cost × stock. It is not production store policy. Product expiration is required by the current form, although MA-INV-006 says it can be displayed; confirm optionality. Older supporting inventory permissions conflict with named cashier criteria; follow `AGENTS.md` restrictions.
11. Scanner, financial statements/exports, full profile/settings, Kahera management and complete AR/AP flows need approved designs and implementation separately. An existing frame/document does not authorize scaffolding them in this handoff.

## Ownership and suggested integration order

Frontend owns layout, motion, navigation, accessible forms, local drafts, display formatting and mapping confirmed service responses into shared state. Backend owns authentication, store/role authorization, validation, canonical IDs/time/prices, balances, accounting rules, persistence, concurrency, idempotency and atomic transactions. Frontend validation must also run on the server. A client-provided `ownerId` is never authorization.

1. Resolve identity/session/store authorization and contract errors; integrate registration/login and safe expiry/logout.
2. Integrate catalog, assets, customer reads and restocks, including photo storage and concurrency policy.
3. Integrate atomic POS checkout and reconcile stock/sale/payment/debt/customer results.
4. Integrate Quick Add debt/expenses and their shared reads, after agreeing posting/customer rules.
5. Integrate dashboard/cash and partial record views from the confirmed ledger. Complete absent modules only as separately selected work.

## Verification

Baseline shared checks passed: lint, TypeScript and **66/66** Node tests. Prepared-version results:

| Check | Result |
| --- | --- |
| `npm run lint`, `npm run typecheck` | Passed; lint has no warnings |
| `npm test` | **69 passed, 0 failed**, including three service regressions for owner denial, checkout rollback/retry/idempotency, stock/debt/dashboard propagation, inventory session isolation and cash token handling |
| `npm ls --depth=0` | Passed; no dependency changes. Package/lock dependency maps match |
| `npx expo install --check` | Online check blocked by network `EACCES`. Offline retry reported dependencies up to date, with Expo's warning that offline validation is unreliable; not equivalent to full online diagnostics |
| `npx expo export --platform android --platform ios --output-dir .expo/backend-handoff/native-export --no-bytecode --max-workers 2` | Both JavaScript bundles and referenced assets exported successfully; no Hermes bytecode or native binary built |
| Web development export + Chrome regression | Passed direct POS guard/login, empty cart, stock ceilings, cart/remove/cancel behavior, Cash/GCash/Split/Partial validation and confirmation, draft retention, five completed sales, duplicate confirmations, two linked debts, transaction/debt views and 320/360/390/430 px overflow/footer checks; no application console errors/exceptions |
| Cash service browser check | Passed disabled empty submission, exact ₱10.25 addition despite 20 rapid taps, success feedback, Keep Editing preserving the formatted draft and confirmed discard leaving the balance unchanged; no application console errors/exceptions |
| Documentation links, ignore rules and diff | Local doc links exist; local env/cache/build artifacts ignored; no tracked ignored files; final diff has no whitespace errors |

Browser checks used an isolated headless Chrome profile on Windows and an exported development bundle served only on localhost. Temporary `EXPO_PUBLIC_ENABLE_MOCK_AUTH=true`, `EXPO_NO_BUNDLE_SPLITTING=1`, `EXPO_NO_METRO_LAZY=1` and offline flags were limited to that export command. No env/config default changed. Metro recovered from a stale cache with a full crawl. Local harness, screenshots, baseline and audit records are ignored under `.expo/backend-handoff/`.

**Android runtime: not tested.** Android JavaScript export passed, but ADB device discovery is blocked in this environment (`Cannot mkdir '\\.android': Permission denied`), so no emulator/device runtime was validated. **iOS runtime: not tested.** iOS JavaScript export passed; this Windows host has no iOS simulator or connected iPhone testing session. Native builds/EAS jobs were not run. Safe areas, fonts/text scaling, native keyboards/focus/dismissal, TalkBack/VoiceOver, Android back, iOS swipe-back, modal handoff and image selection still need separate device checks. Browser checks do not establish any of these native behaviors.

`npm ci` was documented for the teammate but not rerun over the user's installed dependencies. `expo-doctor` was not run. No unrelated pre-existing lint/type/test failures were observed.

## Files changed by this preparation

- Setup/docs: `README.md`, `.gitignore`, `.env.example`, `package.json` (test script only), `docs/backend-handoff.md`, `docs/api-contract.md`, `docs/designs/README.md` (corrected stale claim that exports were absent).
- New adapters: `src/services/inventory.ts`, `dashboard.ts`, `cash-register.ts`; existing `src/services/mock-auth.ts`, `registration.ts`, `quick-add.ts` gain integration notes.
- Wiring/notes: `src/state/inventory.tsx`, `cash-register.tsx`, `auth-flow.tsx`, `pos.tsx`, `quick-add.tsx`; `src/components/dashboard/owner-dashboard-screen.tsx`, `src/components/inventory/inventory-screen.tsx`; `src/utils/inventory.ts` boundary comment.
- Verification: `tests/handoff-services.test.cjs`. Existing domain behavior, validation, layout, motion, assets and routes are preserved. No files deleted; no confirmed obsolete app logs/imports needed removal.

## Repository hygiene

The handoff preserves pre-existing modified/untracked work. It adds typed service boundaries, `TODO(BACKEND)` notes, an `npm test` script, `.env.example`, these docs and ignore rules. No dependencies/upgrades, native configuration, assets or original requirements were changed. No unused app imports/logs were found by lint/search; existing route/asset references justify retaining starter files. Console output in asset-generation/maintenance CLI scripts is intentional.

Credential pattern review found no matches in tracked/current candidate text or reachable local Git history (all **3 reachable commits**; private-key headers, recognizable provider tokens, credential-bearing connection URLs and sensitive assignments checked without printing values). No environment/key files are tracked; `.env.example` is the only candidate env file. The workbook's decoded story cells were reviewed for sample credentials. This is a pattern review, not proof that every binary/export is free of private data. **Source documents contain real participant/client names and embedded signature images** in both `docs/PROJECT_CHARTER-v2.02.21.10.2026.md` and its `docs/requirements/` copy. Confirm the team repository's intended audience/permission to share those documents before pushing; preserve the originals locally and use an approved redacted distribution if needed. Workbook sample credentials and fictional app fixtures are examples, not production secrets. If any example was reused in reality, rotate it.

`.gitignore` excludes dependencies, Expo/Metro output, native builds, logs, local env and the local PowerShell module cache. It does not untrack files already in Git; inspect `git ls-files -ci --exclude-standard`. Keep `package-lock.json` and required assets tracked. If a real credential is found, revoke/rotate it and remove it from the intended commit; coordinate any historical cleanup separately. Do not automatically rewrite history.

## Pre-push checklist

- Review changed/untracked files deliberately: most implemented frontend modules were already untracked at handoff start. Include source, `assets/images/{brand,dashboard,menu,pos}`, docs, tests, configuration and `package-lock.json` together; the original Git tree alone cannot run the current app.
- Keep `.env.local`, caches, generated exports, dependencies and local audit artifacts out of the commit. `.env.example` contains only the used public switch with a safe default.
- Resolve source-document privacy/sharing above; review staged files for credentials without printing their values. Do not use real customer data in fixtures.
- Run `npm ci`, lint, typecheck and tests in the team's clean checkout. Revalidate both native platforms before claiming device readiness.
- Agree the open API/business decisions; record contract approval before replacing a mock adapter. Every integrated success state must follow server confirmation.

Suggested commit message: `chore: prepare frontend services and backend handoff documentation`.

## Accounts Receivable integration update

The MA-AR-001–004 frontend now uses the shared inventory session ledger for AR, Quick Add customer debts and POS partial debts. [Accounts Receivable](accounts-receivable.md) documents the commands, confirmed stock/date/identity rules, payment history, service replacement boundary and validation. This supersedes earlier record-only customer-debt, unresolved stock effect and no repayment assumptions. A backend must atomically create debt/customer/stock changes and record selected-debt payments with store/role authorization, current-balance validation, canonical identities, persistence and durable idempotency. Collection payment-method/reference and cash/accounting posting contracts remain undefined; no such behavior was inferred.
