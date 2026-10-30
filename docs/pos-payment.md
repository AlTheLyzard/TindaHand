# MA-POS-004 — Payment processing demo

Historical implementation note: [the updated POS flow](pos-updated-flow.md) replaces the preview-only behavior below with recorded mock sales, four payment modes, stock updates and linked customer debts.

Checkout now opens `/owner-pos/payment` inside the existing guarded POS stack. Payment uses the live selection and unit-price snapshots, not the reference's illustrative totals. The screen supports Cash/GCash, separate amount drafts, a GCash reference, quick cash amounts, total paid, remaining balance and change/excess. A valid completion returns to products with a green **Demo order preview completed** notice. It explicitly says no payment was verified or sale saved. The cart is retained and inventory remains unchanged.

## Sources and decisions

Read root `AGENTS.md`, the MAY-ARI MODULE MA-POS-004 acceptance criteria and relevant supporting requirements. Inspected every panel in `docs/designs/MA-POS-001.png`, `MA-POS-003.png` (also includes MA-POS-002, as confirmed by the user), and `MA-POS-004.png`. The payment composite is the primary reference: blue total card, white entry card, denomination chips, blue change card, green completion action, red cancellation action and green success feedback on returning to products. Exported status bars and gesture indicators are not reproduced.

The baseline owner story specifies Cash or GCash. The Kahera sheet and some supporting documents also mention split payments; those do not expand this owner task. The copy owner sheet has the same payment criteria and a “COFIRMED PAYMENT” remark. Required production sale recording and store-record updates are explicitly deferred by the user's frontend-only scope.

Requirements Engineering requires a GCash reference when applicable, but neither the baseline story nor supplied docs define its length/format. GCash validation therefore requires a nonblank trimmed reference, without a speculative numeric-length rule or any claim of verification. No GCash-specific visual frame is supplied; the requested method selector and reference field reuse existing POS pills and FormField styling within the supplied payment layout.

The reference has placeholder/stale totals and intermediate change values. Calculations here always derive from the actual current cart. Cash surplus is shown as Change; GCash surplus is shown as Excess Amount, without implying an electronic refund or cash disbursement. Short payments display Remaining Balance and block completion of the demo order until covered. Debt creation and partial-payment recording are not implemented.

## State and behavior

- `src/types/pos.ts`: typed payment method, draft and explicitly tagged demo-preview snapshot.
- `src/utils/pos-payment.ts`: strict decimal-peso parsing into safe integer centavos, validation, balance/change calculations, stable order comparison and a synchronous duplicate-confirmation gate. Invalid attempts do not lock the order. An identical order cannot be previewed again merely by changing payment details or remounting the payment screen. Clearing the order resets the gate; editing the cart enables a preview for the changed snapshot.
- `src/state/pos.tsx`: shared draft, local preview and notice state within the existing POS provider. Cash and GCash amounts stay separate when switching methods. Back navigation preserves the order, amount entries and reference; changing the cart recalculates payment from the latest total. Refreshing/leaving the POS flow discards this ephemeral state.
- `src/components/pos/payment-screen.tsx` and `src/app/owner-pos/payment.tsx`: accessible payment form, validations/focus, quick amounts, keyboard dismissal, back-to-review, confirmation and empty-order handling. Completion is disabled once the current order has a demo preview. Duplicate rapid taps are also blocked synchronously in state logic.
- `src/components/pos/payment-preview-toast.tsx` and `product-browsing-screen.tsx`: green demo notice using the existing SuccessMark. It can be dismissed and never claims a saved transaction. Selection remains available for review or explicit cancellation.
- `cart-review-screen.tsx`, `pos-frame.tsx` and `src/i18n/en.ts`: real payment navigation replaces the unavailable notice, payment progress state and English catalog text. Existing dialogs, form fields, animated navigation, font setup and tokens are reused.
- `tests/payment.test.cjs`: targeted parsing, validation, calculation, snapshot and duplicate-confirmation tests.

Cancel Order opens the existing destructive dialog pattern. Dismissing it preserves the order and draft; confirming clears both and returns to products. The separate back control and stack back navigation preserve them. No storage, network payment call, sale/receipt record, debt, accounting movement, cash balance change, inventory deduction or database update occurs. No dependencies or native configuration were changed.

## Checks and limits

Shared: `npm run typecheck`, `npm run lint` and `node --test tests/*.test.cjs` pass, with 28 tests. Payment tests include malformed/negative/fractional/nonfinite/unsafe amounts; exact centavo parsing without rounding; cash and GCash independent amounts; empty, zero and insufficient payments; required GCash reference; actual totals and immutable snapshots; 100 duplicate attempts; and reset/changed-order behavior.

Browser: Chrome against the Expo web development server. Checked direct unauthorized payment redirect, existing registration preview/Dashboard navigation, checkout → payment, blank/invalid/short payment errors and focus, quick amounts, ₱100 paid against ₱83 producing ₱17 change, GCash reference errors, browser back retaining the draft, cart edits recalculating the total, method-switch preservation, cancel-dialog dismissal/confirmation, demo completion for Cash and GCash, retained selection, duplicate-disabled state and toast dismissal. Screenshots at 320×568, 360×800, 390×844 and 430×932 have no horizontal overflow; scrolled screenshots verify both actions remain reachable above navigation. Artifacts and the browser harness are ignored under `.expo/payment-check/`.

Android runtime: **not tested** — no device/emulator or ADB available. iOS runtime: **not tested** — no iOS simulator on this Windows host. Native keyboard, focus/dismissal, safe areas, accessibility text scaling, screen readers, Android back and iOS gestures require device validation. The web development bundle compiled successfully; no native builds or Android/iOS bundle exports were run for this task.

Backend work remains: agree the payment/reference contracts and rules, verify payments, implement server-side idempotency and authoritative stock checks, persist sales/payments atomically, update inventory/accounting records, and handle service errors. This local gate and owner guard are demo behavior, not production security or payment verification.
