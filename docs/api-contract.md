# API contract notes

Audited October 30, 2026. **No agreed HTTP endpoints, OpenAPI schemas or backend API contracts were found.** Everything below describes existing frontend interfaces or a **PROPOSED** transport model for discussion. No URL, HTTP method, auth mechanism, pagination format, backend framework or MySQL table schema is finalized. See [handoff](backend-handoff.md) for story references, implementation status and open decisions.

## Existing local interfaces

| Interface | Actual current behavior | Frontend types |
| --- | --- | --- |
| `authenticateMockOwner(role, id, pin)` | Sync `MockOwnerSession \| null`; public fixture, dev flag required | `src/types/auth.ts` |
| `registerOwner(values)` | Async `RegistrationResult`; always error/unavailable | `RegistrationService`, `RegistrationFormValues`, `RegistrationErrors` in `auth.ts` |
| `loadMockInventory()`, `getInventorySales(sales)` | Sync cloned seed store; fixture + session sale ranking lines | `InventoryStore` in `src/utils/inventory.ts`, domain types in `src/types/inventory.ts` |
| `applyInventoryAction(store, owner, action)` | Sync immutable next store; unchanged store means denied/invalid/no-op | `InventoryAction` in `src/utils/inventory.ts` |
| `usePos().completeOrder()` | Sync boolean; atomic local checkout through inventory service | `CheckoutCommand`, `MockSale`, `SalePayment`, `PosLedger` in `src/types/pos.ts` |
| `createQuickAddService().save(owner, token, draft)` | `Promise<QuickAddRecord>` or thrown validation/session error; local Map | `src/types/quick-add.ts`, `src/types/expenses.ts` |
| `getDashboardData(sales)` | Historical fixtures + completed session sales | `src/types/dashboard.ts`; derived summary in `src/utils/dashboard.ts` |
| `createCashRegisterService().begin/add` | Form token; sync cumulative added centavos or null | Local adapter and `src/utils/cash-register.ts` |

These signatures are **not wire contracts**. Sync inventory/login/cash callers must be changed to await the real service and handle pending/failure before confirming success. Do not send `InventoryStore`, React state or whole reducer actions as API payloads by default.

## Shared conventions — PROPOSED for transport

- IDs are opaque stable strings. Current `Date.now()`/sequence demo IDs and derived `sale-`, `payment-`, `customer-`, `debt-` strings are not a server ID policy. Use one idempotency key per logical write; preserve it across safe retries and scope it to the authenticated store.
- Money is a nonnegative safe integer in **centavos**, never floating peso decimals; validate bounds and sum/product overflow. ₱32.00 is `3200`. UI text inputs such as `"12.50"` are drafts; parse before transport. Values in code are JS numbers, not a SQL numeric-type prescription.
- Due/expiration/stock/expense/recorded dates use real `YYYY-MM-DD` calendar dates; events use ISO timestamps. Reporting uses **Asia/Manila**. Server event timestamps should be authoritative. Optional values must have an agreed absent/null convention; examples below use null where explicit absence matters.
- Preserve historical item **name and unit-price snapshots** on sales/debts even if the catalog changes. Checkout must validate price policy server-side; never trust a client snapshot to set a price.
- Distinguish payment status (`unpaid|partial|paid`) from independently derived overdue state. Existing `QuickAddRecord` supports only unpaid/partial/null; add a mapped settled model when payment management is implemented rather than pretending it exists now.
- Derive store/user/role from authenticated context. Never authorize a client `ownerId`, selected role or route parameter. Return confirmed canonical records and IDs after durable commit; only then may UI show success.

## Authentication

Frontend needs owner registration `{name, password, pin}` and login `{role, ownerId, pin}`. Name, password and PIN are required; password minimum eight characters with lowercase, uppercase, digit and special character; PIN is exactly four ASCII digits, retained as a string. `confirmPassword` and `confirmPin` are **UI-only** validation fields, not suggested persisted values. Current local `RegistrationService` accepts all five draft fields; a transport adapter should omit confirmations.

**PROPOSED response needs:** canonical owner identity `{id, name}` plus server-controlled role/store/session information once its protocol is agreed. Preserve the UI's `RegistrationResult` mapping: `{status:'confirmed', account:{id,name}}` only on confirmed creation, or `{status:'error', message, fields?}`. The `mode:'preview'|'mock'|'confirmed'` discriminator is frontend presentation/access state; it is not an authentication token.

Do not return plaintext password/PIN in identity/session objects. ID generation, session/token storage, expiry, logout revocation, login throttling, multi-Kahera identity, PIN recovery/email/offline recovery and offline registration remain open. Cashier login UI uses owner ID + cashier PIN, but no working cashier session exists.

## Inventory and POS

**Frontend read model:** `InventoryProduct` has required `id`, `name`, `category`, `unitPriceCentavos`, `costCentavos`, whole `stock`, `expirationDate`, optional `photoUri`. Category values are `drinks|canned|snacks|coldCuts|groceries|household|personalCare`. `photoUri` is a local display URI, not an upload contract. Agree uploaded asset identifiers/URLs separately. The current form requires expiration; optionality is open against MA-INV-006.

**PROPOSED write needs:** product creation/edit supplies name/category/selling price/cost and, where authorized, quantity/expiration and optional uploaded-photo reference. Distinguish create/update/delete intent rather than copying the mock's `saveProduct` upsert. Current UI permits nonnegative cost, positive selling price, whole quantity 0–1,000,000, name up to 120 characters. Revalidate on server; final domain limits must be agreed. Product deletion must preserve sale/restock snapshots and follow a decided audit/reference policy.

Restock needs existing product ID, incoming whole quantity 1–1,000,000, stock date, expiration and idempotency key. Server must atomically increment stock and append restock history, assigning its own event timestamp/ID. Current UI rejects future stock dates, permits past expiration, and keeps only the latest expiration on the product. Batch/lot depletion and FIFO are undefined.

Asset read/write model: `BusinessAsset` contains required `id`, `name`, positive `valueCentavos`, `classification:'current'|'equipment'|'furniture'`, `usefulLifeYears`, `recordedDate`. Current assets use life `0`; equipment/furniture require whole years 1–100. No depreciation or cash/accounting entries occur. Asset mutations are owner-only; authorized cashier access is read-only when built.

**PROPOSED checkout intent** (illustrative data; endpoint undecided):

```ts
type CheckoutIntent = {
  idempotencyKey: string;
  items: { productId: string; quantity: number }[];
  payment: {
    method: 'cash' | 'gcash' | 'split' | 'partial';
    tenders: { method: 'cash' | 'gcash'; receivedCentavos: number; reference: string | null }[];
  };
  customer?: { id: string } | { name: string }; // required for partial; linking policy OPEN
};
```

This differs deliberately from `CheckoutCommand`, which embeds owner/event IDs, `ProductSelection` snapshots and string `PaymentDraft` amounts. Server resolves authenticated store, authoritative prices and stock. Agree stale-price/conflict handling rather than silently accepting client prices. ProductSelection is currently a product-ID-keyed object for rendering; the proposed item array is a transport choice awaiting approval.

**Required confirmed response needs:** sale ID/event timestamp; item IDs, quantities, name/price snapshots; total; canonical payment ID, method/tenders/references, received/applied/change; customer ID if linked; remaining debt and its ID/status; updated inventory quantities or a defined refresh strategy. A display example for a ₱32 sale paid partly with ₱12 Cash is total `3200`, applied `1200`, remaining `2000`, change `0`, status `partial`, linked customer/debt, `dueDate:null`. Exact envelope and DTO field names remain **PROPOSED**.

Validation/transaction expectations:

- Partial Payment / **May kulang** requires **0 < received < total**, an existing selected customer or entered name, and one explicit **Cash or GCash** tender. Save remaining balance against that customer. No installment schedule. Production customer creation/linking rules are unresolved.
- Cash full payment covers total and can yield Cash change. GCash must cover total without exceeding it, with a nonblank reference. Split combined tenders cover total, GCash cannot exceed total, and change can only come from Cash. A zero GCash split portion requires no reference in the current UI. Trim references and preserve leading zeroes; no format/length policy has been agreed.
- Invalid/empty/stale-stock orders and unknown selected customer IDs must fail without any partial writes. GCash entry is **manual**, not transfer verification; a reference string is not proof of settlement. Payment verification/integration is undecided.
- Atomically commit sale + payment + stock deduction + customer creation/link if approved + remaining debt. Enforce store/role authorization, validate aggregate amounts and concurrency, and implement durable idempotency. A timeout may follow a committed write; agree a replay/reconciliation response so retries cannot charge/deduct twice. Mock duplicate commands return false/no-op; that is not the desired network retry protocol.

## Customers and debts

Current `Customer` is only `{id,name}` from fictional seed/session data. POS and Quick Add match normalized case/whitespace names and may create `customer-${recordId}` locally. This is a demo convention. Agree same-name persons, create/link authorization, merge policy and canonical IDs before adopting any proposed customer payload.

**PROPOSED Quick Add data needs** (independent variants, not one finalized endpoint):

| Kind | Required inputs | Optional inputs / output needs |
| --- | --- | --- |
| Customer cash debt | Customer name/approved identity, positive amountCentavos, dueDate (current UI requires it), idempotency key | details; canonical debt/customer IDs, amount/status/event timestamp |
| Customer product debt | Customer identity, nonempty product ID/quantity list, dueDate, key | details; validated name/price snapshots and total; stock/accounting effect OPEN |
| Store debt | Supplier/creditor name, positive amountCentavos, key | dueDate, details; canonical debt ID, unpaid status, timestamp; supplier registry OPEN |
| Expense | category, positive amountCentavos, expenseDate, key | details; confirmed expense ID/timestamp; see below |

`QuickAddRecord` is a combined frontend display model: required `id,ownerId,kind,name,amountCentavos,details,items,occurredAt`; nullable `category,expenseDate,dueDate,borrowing,paymentStatus`; optional `customerId,saleId,originalAmountCentavos,paidCentavos`. For expenses `name` duplicates the category and `paymentStatus` is null. Do not turn this union into a finalized SQL table.

For POS partial debt, `amountCentavos` is **remaining** balance; `originalAmountCentavos` is the sale total and `paidCentavos` the initial payment. Quick Add debts initially store the full unpaid amount and do not have those optional sale-linked fields. Both preserve item snapshots when applicable. POS due date is null; Quick Add defaults/required-date differences need agreement.

Debt + customer linking should be atomic when integrated. Quick Add is record-only today; whether it posts sales/cash/stock is unresolved. There is no implemented debt repayment/history flow: do not invent payment allocation, interest, deadlines, installment schedules or supplier settlement contracts from these data needs. Item-based versus balance-based repayment remains a requirements question.

## Expenses

Current categories: `Electricity Expense|Water Expense|Others Expense`. Required date is `expenseDate` (calendar date) independent from `occurredAt` (event timestamp); optional trimmed details. Expense request should carry canonical amount/category/date plus idempotency key, not display-formatted strings. Suggested response contains confirmed ID and the same validated data with server timestamp.

List read needs: authenticated owner records, combined search/category filters, monthly total for the Manila calendar month/year independent of visible search results. Current selectors search category/details/raw or formatted amounts/dates locally with no pagination. Agree remote filtering, sorting and page/aggregate behavior if collections grow; no cursor/page-size contract is finalized. Payment source, custom Others category and cash/ledger posting are open; do not add an assumed payment method.

## Dashboard

Frontend needs reporting as-of timestamp, daily/weekly/monthly sale totals and distinct sale counts, ranked products with quantity sold, current stock alerts, physical cash/movements, recent activity and optional growth history/comparison. Weeks start Monday in the current demo and periods use Manila calendar boundaries. Cash excludes GCash and is independent of sales period selection. Linked debts cannot be counted as additional sale/payment events.

`GrowthMetrics` in `src/types/dashboard.ts` is a display model requiring source, reportingPeriod, metric=`sales`, unit=`centavos`, ordered `{timestamp,metricValue}` points and `percentageChange:number|null`. A **PROPOSED** summary response must let the adapter validate that points and percentage refer to the same reporting/comparison window. Null means unavailable comparison; never combine live percentages with fixture history.

Cash addition needs positive integer centavos, persistent idempotency and a confirmed movement/balance response. It is a local cumulative adjustment today. Movement classification, opening balance, audit policy and accounting posting need agreement.

## Errors, loading and confirmation — PROPOSED

Agree a structured result with a stable machine code, safe display message, optional field errors and correlation ID. Suggested codes include `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, `STOCK_CONFLICT`, `PRICE_CONFLICT`, `IDEMPOTENCY_CONFLICT` and retryable transport/server failures; exact status/envelope is open. Never expose PINs, passwords, tokens, SQL details or raw transport exceptions in UI/logs.

Registration already maps safe service errors, preserves drafts and blocks concurrent requests (`utils/registration-request.ts`). Quick Add/expense save has async catch/retry feedback. POS exposes rejection feedback while retaining drafts. Inventory/cash currently have synchronous local validation/rejection and no real network loading/retry lifecycle; shared development skeleton/empty previews do not prove transport handling. Add pending/empty/error/retry states at integration and test timeout-after-commit, duplicate retries, auth expiry, stale/deleted records and rollback. **Every integrated write must be confirmed by the backend before clearing drafts, changing navigation or showing success.**
