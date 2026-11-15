# Cash in Register and Dashboard period chips

The Cash in Register card's + opens AddCashModal, now a bottom sheet using the same
ResizableSheet, MotionModal, gesture root and backdrop as Customer Debt, Store
Debt and Record Expense. It retains the existing white sheet surface, Poppins,
shared input/buttons and close icon. Its full-width option removes the width cap
and reserves horizontal safe insets inside the surface. The cash form selects a
shorter compact height; other sheets retain their defaults. The handle supports
dragging, snapping, accessibility adjustment and guarded dismissal.

The user confirmed the updated docs/designs/MA-DASH-002.png as the intended
reference (requested as MA-DASH-002(3).png). No Figma file/node URL is supplied in
the workspace or task, so a newer live frame could not be checked. Explicit
English wording, the shared sheet surface and the drag-handle requirement take
precedence over Filipino wording and the omitted handle in the export. The named
MAY-ARI MODULE stories MA-DASH-002 and MA-DASH-003 remain the baseline: cash
movements update cash while sales analytics derive from recorded sales. Copy of
MAY-ARI MODULE's additional-capital placement and growth-formula remarks remain
unresolved; no accounting category or formula was introduced.

The amount field keeps its raw text during typing, pasting, selection edits and
blur. The existing parser validates positive integer-centavo amounts with up to
two decimals without rounding. Decimal drafts such as 1500. and .01 are accepted;
signs, exponents, separators, malformed input, zero and unsafe precision are
rejected. Add is disabled while invalid or pending. Validation starts on editing,
not opening. Clear resets amount and feedback. The keyboard's final action only
dismisses it. Submission requires tapping Add.

Clear and discard use shared confirmation content and an overlay in the same
native modal window, with stacked destructive and outlined actions. Cancel/Keep
Editing preserve the draft. Close, backdrop, handle dismissal, accessibility
escape and Android Modal back requests share the discard guard. Back on a
confirmation returns to editing. The covered form is disabled, hidden from
assistive technology and inert on web. Untouched forms close directly; Clear is
disabled when empty. Keyboard avoidance, a scroll body and actions that join the
scroll body in constrained space keep the form reachable. Bottom padding reserves
the system gesture inset below the actions.

CashRegisterProvider remains session-scoped and separate from seed fixtures. The
typed mock service now exposes a promise boundary for pending/error handling. Its
synchronous single-use token and immediate form lock prevent duplicate increments.
Failures preserve the amount and unlock retry. Success resets/closes before
showing the shared green RegistrationToast with "Cash added successfully."
Confirmed adjustment totals update the existing Dashboard projection. Sales,
growth, expenses and transaction snapshots remain unaffected. Backend comments
identify submission, durable idempotency, authoritative cash refresh and safe
error mapping; no endpoints or persistence schema are invented.

Only Dashboard Daily/Weekly/Monthly chips change size. Visible surfaces use
12-point horizontal and 4-point vertical padding around one-line labels, retaining
the existing selected/unselected colors. Separate 48-point touch wrappers preserve
accessible targets and shared pressed feedback. Selection does not alter geometry
or filtering.

Changed files: src/components/dashboard/add-cash-modal.tsx,
src/components/dashboard/dashboard-cards.tsx,
src/components/dashboard/owner-dashboard-screen.tsx,
src/components/ui/resizable-sheet.tsx, src/utils/sheet.ts,
src/services/cash-register.ts, src/state/cash-register.tsx,
tests/handoff-services.test.cjs, tests/sheet.test.cjs, and this document.
Review screenshots and their scope are in docs/validation/dashboard-cash/.

## Verification

- Shared: npm run typecheck, npm run lint, and all 33 targeted tests in
  auth-validation.test.cjs, sheet.test.cjs and handoff-services.test.cjs pass.
  Coverage includes valid/invalid amounts, exact centavos, overflow retry,
  concurrent duplicates, session isolation, unchanged sales/fixtures, compact
  height and dismissal calculations.
- Browser: the actual CashCard, SalesCard, AddCashModal, shared controls and mock
  cash service pass component-fixture checks for empty/invalid/valid input,
  middle-of-value insertion/deletion, decimal drafts, no Enter submission,
  clear/cancel, discard/keep editing, confirmation focus isolation, touch dragging,
  service rejection, thrown failure, pending duplicate taps and successful reset.
  Adding 1500.25 produces 13950.25 register cash while sales stay at 12450.00.
  Widths 320/360/390/430/768 have full-width sheets and stable one-line chips:
  visible height 28 points, touch height 48 points. A 300-point-height viewport
  verifies scroll access to actions as a keyboard-space proxy. Separate fixtures
  inject iOS 47/34, Android 24/24 and landscape 44-point side insets and verify
  actions remain above bottom insets. These do not simulate native system UI.
  SDK 58 web routing/export module-resolution failures prevented a clean final
  full-app browser run; the fixture uses a local provider scaffold and service
  hook adapter, with the source components and cash service unchanged.
  Local scripts/results are in .tmp/dashboard-cash-{review,layout}.cjs and
  .tmp/dashboard-cash-evidence/. No app configuration or dependencies were changed.
- Android bundle: npx expo export --platform android --platform ios --output-dir
  .tmp/dashboard-cash-native-export successfully exports the Android bundle.
- iOS bundle: the same command successfully exports the iOS bundle.
- Android runtime: not tested. ADB enumeration is blocked by local permissions
  (Cannot mkdir '\.android': Permission denied). No native runtime is validated.
- iOS runtime: not tested. This Windows environment has no iOS simulator.

Bundle export is not a native build or runtime check. Native keyboard appearance,
system Back, TalkBack/VoiceOver, home/gesture bars, text scaling and touch physics
still require independent Android and iOS device validation.
