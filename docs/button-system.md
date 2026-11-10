# Button system

Visual authority: [Buttons.png](designs/Buttons.png). The uploaded reference is in
`docs/designs/`; there is no root `designs/Buttons.png`.

The reference's 360 × 100 artwork is interpreted as approximately 180 × 50 logical
units. CTAs use a minimum height of 50, radius 5, Poppins Bold 14/21, horizontal
padding 16, and an inset highlight. Width follows the surrounding screen rather
than the exported image. Larger text and longer labels can increase the height.
The image contains no icon specifications, so existing glyphs and specialized icon
sizes are retained; new labeled icons default to 20 with an 8-unit gap.

Implementation:

- `src/constants/design-tokens.json`: sampled primary, secondary, destructive,
  outlined destructive and positive colors, including hover/pressed/disabled states.
- `src/components/ui/button.tsx`: Button, IconButton and ButtonSurface share the
  palette, focus outline and smooth press feedback. Loading retains the resting
  label's layout, replaces its ink with a centered spinner, and disables interaction.
  Promise-returning handlers also lock immediately until they settle. Existing
  submission/service locks remain responsible for their business operations.
- `src/components/ui/choice-chip.tsx`: compact pills retain selection/radio
  semantics, a 48-unit touch slot and enlarged hit area.

## Application audit

| Area | Actions covered |
| --- | --- |
| Welcome, account selection, login, registration and onboarding | All CTAs inherit Button; back, dismiss and visibility actions use IconButton; Forgot PIN uses the text variant. |
| Dashboard and cash form | Daily/weekly/monthly use shared chips; View All uses a text button; cash form and confirmations use shared CTAs; Quick Add retains its round FAB and positioned menu. |
| Quick Add | Shared CTAs in every form, success state, discard/clear dialog and sticky footer; shared category chips, close/back icons and credit quantity surfaces. |
| POS | View Cart, checkout, payment completion, cancellation and dialogs use shared variants; steppers retain round shapes, stock limits and remove confirmations; payment methods/amounts use chips. |
| Inventory and assets | Add/edit/save/restock/filter/date actions use Button; InvDanger delegates to the destructive variant; chips, back and search controls share styles. |
| Receivables and payables | Forms, card actions, product selection, payment shortcuts and sticky footers use shared CTAs; existing shortcut meanings and limits are retained. |
| Store Expense | Both entry points, cancel/save actions, category list and form controls audited. |
| Settings and cashier management | Form, sync, cache and success actions inherit Button; security, language, data, help and user rows retain their specialized list layouts. |
| More Tools, Reports, Profile and other placeholders | Existing placeholder actions inherit Button; drawer close uses IconButton; logout retains its list-row shape with destructive feedback and the existing confirmation. No missing feature screens were added. |
| Explore/starter | Documentation CTA uses Button; disclosure controls share the text surface. Unmounted starter tab components retain their navigation layout. |

Custom Pressables intentionally retained after the second search:

- Bottom navigation and section/status tabs: fixed navigation slots, active
  indicators, selection semantics and transitions.
- Product tiles, account role cards, record expanders, customer/creditor/cashier
  rows, menu/profile rows and stock alerts: compound selection or navigation
  surfaces. Their content, status colors and card layouts remain distinct.
- Form pickers, category lists, radio choices, date cells and alphabet index:
  established form/calendar/index interactions. Status colors continue to convey
  stock and expiration information.
- Cash-card plus affordance and Quick Add's compound label/circle menu rows:
  specialized layouts; the FAB and menu action circles use the button palette.
- Toast dismiss surfaces, development preview controls, decorative activity rows
  and modal backdrops: notification/development/dismissal surfaces, not CTAs.

The original named role sheets and acceptance criteria remain unchanged. Existing
conflicts such as registration/setup remarks and role-specific payment options
were not resolved by this visual task; the copy of the owner sheet was not merged.

## Validation

Browser preview uses fictional development credentials only. It is separate from
Android/iOS runtime validation. Native keyboard behavior, safe-area behavior,
system text scaling, TalkBack/VoiceOver, gestures and platform shadow rendering
still require Android and iOS devices or simulators.

Headless Chrome browser checks (Windows, November 2, 2026):

- Inspected welcome/login, Dashboard, POS browsing/cart/payment and cancellation.
- Compared [shared variants](validation/buttons/variants-390.png),
  [welcome](validation/buttons/welcome.png), [cart](validation/buttons/cart.png),
  [payment actions](validation/buttons/payment-footer.png) and a
  [320 × 568 dialog](validation/buttons/cancel-dialog-small.png) against the PNG.
- Measured the default controls at 50 logical units tall; confirmed primary hover
  `rgb(26, 62, 120)` and pressed `rgb(17, 47, 111)`.
- At 320 × 568, the preview had no horizontal page overflow; paired long footer
  labels wrapped into 68-unit controls. At 390 × 844, checked icon centering,
  label spacing, loading geometry and POS footer placement.
- `npm run lint`, `npm run typecheck`, and `npm test` passed (90 tests).
  The existing static-render test loader now accepts the JSON design-token import.
- `npx expo export --platform all --output-dir .tmp/button-bundles --max-workers 2`
  successfully exported Android and iOS Hermes bundles and the web static routes.
  This is bundle compilation, not native build or runtime validation.

The temporary preview route was removed after inspection. Screenshots demonstrate
browser rendering only; not every screen or native accessibility state was
visually exercised.

Environment note: after screenshots were complete, the development server hit
Windows `EMFILE` while the separate all-platform export was generating files.
The export succeeded; its temporary output and browser profiles were cleaned up.
Android runtime: not tested (no connected device/emulator). iOS runtime: not
tested (no connected device or iOS simulator; host is Windows).
