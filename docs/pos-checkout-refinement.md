# POS cart, payment and checkout refinement

Sources read: root `AGENTS.md`; MA-POS-002/003/004 and KH-POS-002/003/004 in the original workbook in `docs/requirements/`; the corresponding copy-owner rows for comparison; the POS sections of Requirements Engineering; and `docs/designs/MA-POS-004.png`. Shared Login FormField, back controls, navigation, Button and PosDialog were inspected before implementation. Source requirements and designs remain unchanged.

The named owner payment story lists Cash and GCash; the cashier story also includes Split Payment. The copy owner sheet adds cart removal/clear notes and payment-navigation wording. This task explicitly preserves all four existing methods, including Partial Payment, rather than treating the copy sheet as a new baseline. Payment uses current cart totals rather than the reference's illustrative values. The reference's “May kulang” chip retains the current application's “Partial Payment” wording.

## Changes

- `src/components/pos/cart-review-screen.tsx`: moved the existing back-to-products control to the top-left of the cart header, retaining its destination and the labeled Checkout action. Displays five distinct product rows initially, with View all N products / Show less. Confirmed removal down to five resets expansion. Quantities, row count and totals continue to derive from the complete live selection.
- `src/components/pos/pos-chip.tsx`: added payment-specific pill appearances, preserving other POS chips. Method pills use 44-unit surfaces, quick amounts use 36-unit surfaces, and touch slots remain at least 48 units high. Longer English labels can wrap on narrow layouts and with larger text.
- `src/components/pos/payment-amount-field.tsx`: five equal-width quick amounts inside the entry card, using the existing ₱50/₱100/₱200/₱500/₱1,000 fixtures, selected styling, and Login's red required asterisk.
- `src/components/pos/payment-customer-field.tsx`: required asterisk and blur validation callback using the shared FormField pattern.
- `src/components/pos/payment-screen.tsx`: method chips below the total card, no on-screen Done action, numeric reference keyboard and filtering for GCash, Split and Partial GCash paths. Blur/submit validation follows Login. The scrollable form and checkout actions use keyboard avoidance on both platforms, measuring their position below the POS header. Confirmation renders the total first, method next, then relevant details in left-label/right-value rows. Back to Payment preserves the draft; Confirm Checkout retains the synchronous commit guard.
- `src/components/pos/pos-dialog.tsx`: optional structured content while retaining the shared modal buttons and existing message-based dialogs.
- `src/utils/pos-payment.ts`: string-preserving ASCII reference filtering, payment labels and method-specific confirmation rows. Existing payment validation/calculation rules are unchanged.
- `tests/payment.test.cjs`: regression coverage for leading-zero/pasted reference filtering and Cash, GCash, Split, Partial Cash and Partial GCash summaries, including zero-GCash split references.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 107 tests passed, including the 20 focused POS/payment/checkout tests. These cover validation, immutable records, atomic stock/debt updates, and duplicate checkout prevention.
- Scoped `git diff --check`: passed.
- Local headless Chrome against Metro, at 320 × 568 and 390 × 844: five distinct products with quantity three on one product still render five rows and no toggle; six products initially render five rows; expand/collapse retains the entire cart total. Quantity edits update totals. Removing the sixth product while expanded leaves five rows, hides the toggle, and updates totals. Tested totals: ₱154 with five rows, ₱171 with six, and ₱186 after increasing the first product and removing the sixth.
- Payment compared visually with MA-POS-004 using the narrow 320 px layout. The method row, rounded surfaces, selected states, quick amount placement/values and five-column spacing were inspected. All five shortcuts update the amount field. Longer English method labels wrap at this width; native accessibility text scaling is pending.
- Browser multi-character input insertion of `00A12-3` yields `00123` in GCash, Split Payment and Partial GCash, retaining string leading zeroes. The reference input exposes numeric input mode. This exercises the same change handler used by typing and paste; native clipboard/keyboard behavior is pending.
- Inspected confirmation screenshots for Cash, GCash, Split Payment, Partial Cash and Partial GCash. Back to Payment retained entered values. Partial Payment rejects missing customer, missing tender and zero paid amount. Unit checks also cover existing-customer selection and rejection of full payment through the partial flow.
- Thirty rapid confirmation clicks completed one mock Partial GCash checkout. The cart reset to zero, stock decreased once for each purchased quantity, and the removed sixth product's stock remained unchanged. No application console errors or exceptions occurred during the successful browser run.
- A shortened 320 × 360 browser viewport verified scrolling to Complete Order. This is a browser layout check, not a native software-keyboard test.
- Browser scripts, screenshots and results are ignored artifacts under `.expo/pos-checkout-refinement/`.

The development web export compiled successfully, but its static preview failed before app interaction with an Expo unknown-module/hydration error. Interactive verification used the local Metro server instead. No dependency/configuration changes were made to address that unrelated export issue.

Android runtime: **not tested**. The installed ADB failed with `Cannot mkdir '\.android': Permission denied`; no Android device/emulator session was available through it.

iOS runtime: **not tested**. This Windows host has no iOS simulator.

Native keyboard avoidance, paste, input focus progression/dismissal, safe areas, system back/gestures, font scaling, TalkBack/VoiceOver and native shadows remain pending separately on Android and iOS. No Android/iOS bundle compilation or native build was performed. All transactions remain frontend mock records; no backend, commit, push or deployment was performed.
