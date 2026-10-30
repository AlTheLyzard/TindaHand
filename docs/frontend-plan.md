# TindaHand frontend plan — proposed

## Current objective

Render the supplied high-fidelity Figma screens one frame at a time for both Android and iOS using one shared Expo/React Native codebase, Expo Router, TypeScript, NativeWind, static mock data in src/data/, and shared types in src/types/. Backend and MySQL integration are deferred. This plan was mapped from the uploaded User Stories and System Request; the Charter and Requirements Engineering documents are supporting sources to inspect, not assumed to have been reconciled here.

## Android and iOS scope decision

On October 17, 2026, the project scope expanded from the original Android-focused coursework requirements to support both Android and iOS. This is a new project decision, not a claim that the original requirements already specify iOS. Preserve the original workbook and coursework documents in docs/requirements/ unchanged; their platform scope, acceptance criteria, testing plans, and delivery assumptions may need formal revision later.

Keep the current frontend-first approach and existing compatible dependencies. This guidance update does not authorize dependency changes, native/build configuration changes, backend integration, or additional screens.

### Shared implementation guidance

- Use one shared codebase and route structure for both platforms. Share components, types, static fixtures, selectors, and mock state. Introduce platform-specific files or branches only when necessary for an actual platform difference.
- Adapt supplied frames to safe areas, notches, status bars, and bottom gesture/navigation areas on Android and iOS without copying device chrome from design exports.
- Make forms work with each platform's keyboard behavior: input types, focus progression, avoidance, dismissal, scrolling, and reachable submit/cancel actions.
- Keep Expo Router navigation consistent while supporting Android system back behavior and iOS back gestures, stack transitions, and modal dismissal.
- When permission-dependent features are implemented, account for each platform's permission requests, explanations, denied/restricted states, and recovery. Backend and service integration remain deferred.
- Use the supplied typography while checking font loading, weight mapping, dynamic text size, wrapping, and clipping on both platforms.
- Provide accessible touch targets, pressed feedback, screen-reader semantics, and touch interactions on both platforms. Do not depend on hover. Preserve layouts on small screens and with larger accessibility text.

### Validation and reporting

For each implementation task, report the following separately:

| Validation area | Report |
| --- | --- |
| Shared checks | Lint, typecheck, and dependency diagnostics actually run, with results. |
| Android | Bundle/build checks separately from runtime checks; identify the emulator or device and behaviors tested. |
| iOS | Bundle/build checks separately from runtime checks; identify the simulator or device and behaviors tested. |

Mark a platform as **not tested** when no runtime validation was performed. State missing tooling or access as a blocker. Android testing does not establish iOS support, and iOS testing does not establish Android support. A browser preview, successful bundle, or successful native build does not count as native runtime validation. Check safe areas, keyboard behavior, navigation, permissions where applicable, typography, and touch/accessibility interactions on each platform before claiming they were verified.

## Source documents

Keep originals unchanged in docs/requirements/:

- USER-STORY-v.02.10.2026 (1)(1).xlsx
- SYSTEM-REQUEST-v1.24.09.2026(1).md
- REQUIREMENTS_ENGINEERING-v1.25.09.2026.md
- PROJECT_CHARTER-v2.02.21.10.2026.md

## Screen inventory

Both = owner and authorized cashier. Separate routes below are design recommendations unless explicitly named in the criteria.

| Area           | Screens                                                                                       | Access / source                                                 |
| -------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Authentication | Welcome; role-aware Login; owner Registration; Account Created; Forgot PIN entry              | MA-LOG-001–006, KH-LOG-001–003; recovery unresolved             |
| Owner setup    | Create initial Kahera; Kahera Created confirmation                                            | MA-LOG-004                                                      |
| Home           | Dashboard with money tracker, sales periods, stock health, best sellers, recent activity      | Owner, MA-DASH-001–007                                          |
| Sales          | POS; Cart; Checkout; Payment; sale confirmation/receipt                                       | Both, MA/KH-POS-001–004; receipt split recommended              |
| Inventory      | Inventory summary/list; Product Details; Add Product; Edit Product; Restock                   | Both except Add/Delete owner-only; MA/KH-INV-001–006            |
| Assets         | Assets list/summary; Add Asset                                                                | Owner manages; cashier read-only, MA-AST-001–002 and KH-INV-007 |
| Receivables    | Sisingilin overview; Record Debt; Debt Details; Record Payment; Paid History; Payment Details | Both, MA/KH-AR-001–004                                          |
| Payables       | Utang Ko overview; Record Debt; Debt Details; Record Payment; Paid History; Payment Details   | Owner, MA-AP-001–004                                            |
| Tools          | More Tools; Transaction History; Transaction Details; Barcode Scanner                         | Both, MA/KH-MT                                                  |
| Statements     | Statement selector; General Journal; General Ledger; Income Statement; Balance Sheet          | Owner, MA-MT-001; PDF/JPG/JPEG export later                     |
| Expenses       | Gastusin list; Record Expense                                                                 | Owner, MA-MT-003 and MA-QA-005                                  |
| Profile        | Profile; Edit Profile                                                                         | Both, MA/KH-PRO                                                 |
| Access control | Kahera accounts; Create Kahera; Kahera access details/permissions                             | Owner, MA-PRO-002                                               |
| Settings       | Preferences, notification and available account/security settings                             | Both with role restrictions, MA/KH-SET                          |

Keep dashboard cards, inventory filters/expiration lists, confirmations, validation, and scanner failure states inside their owning screens. Quick Add is an overlay that reuses existing routes:

- Owner: New Sale, Add Paninda, Record Sisingilin, Record Gastusin.
- Cashier: New Sale, Record Sisingilin.

## Proposed routes

Inspect the existing project before adopting this structure. Root index redirects by mock session: Welcome when signed out, Home for owner, POS for cashier. A newly registered owner can continue through authenticated setup.

```text
src/app/
  _layout.tsx
  index.tsx
  +not-found.tsx
  (auth)/
    _layout.tsx
    welcome.tsx
    login.tsx
    register.tsx
    account-created.tsx
    forgot-pin.tsx
  (app)/
    _layout.tsx
    (tabs)/
      _layout.tsx
      home.tsx
      pos.tsx
      inventory.tsx
      more.tsx
    setup/
      kahera.tsx
      kahera-created.tsx
    sale/
      cart.tsx
      checkout.tsx
      payment.tsx
      [saleId].tsx
    products/
      new.tsx
      [productId]/
        index.tsx
        edit.tsx
        restock.tsx
    assets/
      index.tsx
      new.tsx
    receivables/
      index.tsx
      new.tsx
      paid.tsx
      payments/[paymentId].tsx
      [debtId]/
        index.tsx
        pay.tsx
    payables/
      index.tsx
      new.tsx
      paid.tsx
      payments/[paymentId].tsx
      [debtId]/
        index.tsx
        pay.tsx
    statements/
      index.tsx
      general-journal.tsx
      general-ledger.tsx
      income-statement.tsx
      balance-sheet.tsx
    transactions/
      index.tsx
      [transactionId].tsx
    expenses/
      index.tsx
      new.tsx
    scanner.tsx
    profile/
      index.tsx
      edit.tsx
      kahera/
        index.tsx
        new.tsx
        [kaheraId].tsx
    settings/index.tsx
```

Configure Home, POS, Inventory, More as owner tabs; hide owner Home for cashier and start at POS. Stack pages outside tabs do not display the tab bar. Route groups are organization, not authorization. Share the Kahera creation component across setup and profile routes.

## Proposed type modules

Create modules incrementally when needed, not empty placeholders for the entire roadmap.

| src/types/ file | Types                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| common.ts       | ID, ISODate, ISODateTime, Money (integer centavos)                           |
| auth.ts         | UserRole, Session, LoginInput, RegisterInput, KaheraSetupInput               |
| user.ts         | Owner, Kahera, Store, Permission, ProfileUpdateInput                         |
| product.ts      | Product, ProductCategory, StockStatus, ExpirationStatus, ProductFormValues   |
| inventory.ts    | RestockRecord, RestockInput, InventoryFilters, InventorySummary              |
| asset.ts        | Asset, AssetClassification, NonCurrentAssetCategory, AssetFormValues         |
| sale.ts         | CartItem, SaleItem, Sale, CheckoutDraft                                      |
| payment.ts      | PaymentMethod, PaymentAllocation, SalePayment, DebtPayment                   |
| party.ts        | Customer, Supplier                                                           |
| debt.ts         | CustomerDebt, CustomerDebtItem, StoreDebt, DebtPaymentStatus, DebtFormValues |
| expense.ts      | Expense, ExpenseCategory, ExpenseFormValues                                  |
| transaction.ts  | TransactionSummary, TransactionType, TransactionFilters, ActivityEntry       |
| dashboard.ts    | DashboardSummary, SalesSummary, BestSellingItem, CashMovement                |
| statement.ts    | JournalEntry, JournalLine, LedgerAccount, IncomeStatement, BalanceSheet      |
| settings.ts     | AppSettings, NotificationPreferences                                         |
| index.ts        | Optional re-exports                                                          |

## Proposed mock data modules

- users.ts: owner, cashier accounts, store, permissions.
- session.ts: selectable owner/cashier demo session.
- categories.ts: product and expense categories.
- products.ts: quantities, category IDs, barcodes, prices, expiration dates.
- restocks.ts: product-linked incoming stock and dates.
- assets.ts: current/non-current assets and equipment/furniture categories.
- customers.ts and suppliers.ts: parties referenced by debts.
- sales.ts: completed sales with historical item snapshots.
- cart.ts: sample cart seed.
- receivables.ts and payables.ts: unpaid, partial, paid, overdue debts.
- payments.ts: linked cash/GCash payments and references; split allocations.
- expenses.ts: category, amount, details, date, source.
- cash-movements.ts: opening cash and cash-only movements.
- statements.ts: consistent sample statement fixtures.
- settings.ts: preferences for both roles.
- demo.ts: fixed demo date and scenario selection for stable visual previews.

Use src/selectors/{dashboard,inventory,debts,transactions}.ts for derived views. Load seeds into shared in-memory state when interactive mock flows are implemented. Avoid double-counting events referenced in both transaction lists and source records. GCash receipts do not increase physical cash on hand.

## Open decisions — do not silently resolve

1. PIN recovery: email verification versus offline recovery code remains unresolved. No OTP or email provider integration is approved.
2. Split payment: explicit for Kahera and in System Request, omitted from owner payment criteria. Shared UI can support it, owner availability needs reconciliation.
3. Cashier asset access: role sheet explicitly permits read-only access; System Request is narrower.
4. Owner transaction edit/delete flows are not clearly specified; no routes proposed.
5. Item-by-item customer debt payment allocation appears only in unresolved remarks. Baseline is payment against a debt balance.
6. Add Another Kahera during onboarding conflicts with a removal remark.
7. Quick Add follows detailed role criteria (four owner actions, two cashier actions), not broader component descriptions.
8. Stock thresholds, expiration warning window, editable profile fields and detailed settings choices need source/design confirmation; demo values must be labeled assumptions.

## First implementation milestone

Inspect current setup, establish project guidance, then implement only the first selected Figma frame. Do not scaffold the entire roadmap before the user chooses the next task.
