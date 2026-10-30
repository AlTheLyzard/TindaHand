# Store Expenses

Store Expenses is available under More Tools. The owner-only list and dedicated Add Store Expense screen use the existing Quick Add provider and record-only service. Quick Add retains its modal, category chips, draft confirmation, and success experience, with a required expense date and working calendar added. Records remain in memory for the current application session and reset on reload.

## Sources and decisions

Reviewed root `AGENTS.md`, package/lockfile/configuration, routing, the named MAY-ARI and KAHERA sheets in `docs/requirements/USER-STORY-v.02.10.2026 (1)(1).xlsx`, and the corresponding copy-sheet differences. Relevant baseline stories are **MA-MT-003**, **MA-QA-005**, owner More Tools access, and **KH-QA-001 / Kahera Module Restrictions**. The system request's Organized Expense Recording and Monitoring section explicitly includes description, amount, category, and date. Supporting requirements engineering and charter sections reserve expenses for owners. The frontend plan remains a proposal.

Visually inspected all three `docs/designs/Store Expense *.png` exports, the supplied palette, typography, input/dropdown/chip/button and toast sheets, and the existing implementations. Reviewed More Tools, Quick Add implementation/visual/layout notes, localization, content states, and motion notes. `docs/designs/README.md` incorrectly says there are no exports; the actual PNG files were available and used. No original requirements or design exports were modified.

- The references omit the amount field; the baseline workbook and this task require it. Both entry points use the same existing exact-centavo parser and validation. No extra title field is added.
- The stored category values remain `Electricity Expense`, `Water Expense`, and `Others Expense`. List chips/cards shorten these to Electricity, Water, and Others. The copy sheet's custom-category note remains unresolved and is not merged into the named-sheet baseline.
- The copy sheet's MA-MT-003 adds payment-date/source notes, and the pictured cards show cash/GCash. The named baseline and existing Quick Add model/control do not establish a payment source. No source is assumed, requested, displayed, or deducted. Future payment-source/posting requirements need a separate decision.
- A date-only `expenseDate` is now explicit and separate from the event's `occurredAt` ISO timestamp and a debt's `dueDate`. Both expense entry points start with a blank date. No past/future-date prohibition is added. Formatting uses an explicit UTC calendar-date interpretation, avoiding device-timezone day shifts.
- Three fictional October 2026 expense fixtures belong only to `TH-DEMO-OWNER`. Their corrected categories/dates and actual amounts total **PHP 2,450.00**, rather than the references' inconsistent PHP 3,450.00. Other owners begin with no expense records. The displayed total always derives from records in the current **Asia/Manila calendar month and year**, independently of search/category selection.
- The current shared brand header, Poppins, canvas/card tokens, controls, success toast, dialogs, reduced-motion handling, and expanding-label navbar are reused. More Tools remains active. Device chrome from the exports is excluded.

## Behavior

Search intersects the category filter and matches category/name, optional details, raw/formatted dates, and raw/formatted amounts. Category chips stay in one horizontally scrollable row. Cards consistently show category, actual amount/date, and details only when present. Empty history and result misses have different messages and recovery actions.

Errors appear after the first Save Expense attempt and update as inputs change. The first invalid category/amount/date is revealed; failed validation/save preserves the draft. A synchronous submission lock and the existing per-owner idempotency token protect against duplicate records. Successful saving disables removal prevention and dismisses to the expense list. The list clears retained search/filter state and scrolls to the top for a saved expense, so the new record is visible, and uses the existing success toast.

Modified forms confirm Clear and navigation away. Cancel/close preserve inputs; confirmed Clear resets the draft and validation. Screen back, Expo Router screen removal (including native system back/swipe removal), header actions, navbar destinations, and destinations selected after the More Tools drawer dismisses are guarded. Opening and closing More Tools alone preserves the draft. Confirmed discard waits for the confirmation window to close before navigating. Native modals block the underlying screen. Quick Add's calendar uses an inline overlay in its existing modal window, avoiding an additional native modal.

The shared frame accounts for safe areas, scroll clearance, keyboard avoidance, and hiding the expense navbar while the native keyboard is shown. Inputs and controls use existing accessible semantics and touch targets. Platform behavior still requires the native checks below.

## Changed files

New:

- `src/app/owner-menu/store-expenses/{index,new}.tsx`: routes behind the existing owner layout gate.
- `src/components/expenses/{expense-list-screen,expense-form-screen,expense-category-field}.tsx`: list, form, and shared category selector.
- `src/data/expenses.ts`, `src/types/expenses.ts`, `src/utils/expenses.ts`: typed demo records, filters, search, and monthly calculations.
- `src/utils/date.ts`: shared calendar-date validation/display used by expense validation, list, picker, and Quick Add presentation.
- `tests/expenses.test.cjs`: five domain tests covering validation, shared/idempotent saves, month/year boundaries, combined search/filtering, timezone independence, and dirty dates/details.
- This document.

Updated:

- `src/components/menu/owner-menu-drawer.tsx`, `src/app/owner-menu/[tool].tsx`, `src/data/menu.ts`: replace the expense placeholder and preserve drawer-dismiss-before-navigation behavior.
- `src/components/dashboard/dashboard-navigation.tsx`: optional navigation guard; existing destinations, colors, and animation geometry are retained.
- `src/components/inventory/inventory-ui.tsx`: reuse the existing header/frame with optional back/navigation/scroll/overlay hooks; reuse the existing calendar content within either a screen modal or Quick Add. Existing inventory defaults are preserved.
- `src/components/dashboard/{quick-add-modal,quick-add-ui}.tsx`: shared category control, required expense date/calendar, shared date formatting, and calendar overlay protection while preserving the modal experience.
- `src/types/quick-add.ts`, `src/utils/quick-add.ts`, `src/services/quick-add.ts`, `src/state/quick-add.tsx`, `src/data/quick-add.ts`: expense date, shared validation/save, demo seed, and owner-scoped success feedback. No backend or accounting effects.
- `tests/quick-add.test.cjs`: expense-date requirement and relative-import support in its existing local TypeScript loader.
- `docs/owner-menu.md`, `docs/quick-add-implementation.md`: link the current expense behavior and mark their earlier placeholder/empty-seed notes as historical.

No dependencies were added/upgraded, and no native project, build configuration, backend, database, commit, or deployment was created. Pre-existing unrelated workspace changes were preserved.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed with no warnings.
- `node --test tests/*.test.cjs`: **60 passed, 0 failed**.
- `npx expo export --platform android --platform ios --max-workers 2 --output-dir .expo/expense-native-export`: both platform Hermes bundles compiled successfully. These are JavaScript bundle exports, not signed native builds or native runtime validation. No dependency diagnostic was run.
- Chrome 156 browser interaction checks: More Tools handoff; combined search/category filtering and result misses; unchanged monthly total while filtering; untouched back; initial validation timing and correction; actual calendar selection; clear/cancel/close/reset; screen back, browser-history removal, header and navbar guards; drawer destination guard; duplicate save taps; list reset/visibility after save; a prior-month save excluded from the current-month total; and Quick Add saving into the same list. The final run ended with six records and the calculated current-month total PHP 2,593.70 after its test saves.
- Browser screenshots at **412x917, 320x568, 390x844, and 430x844** were captured; list, form, validation, clear/discard, saved-list, and Quick Add success screenshots were visually inspected against the three references. No horizontal page overflow was observed in the checked states. Reduced-motion discard/navigation was exercised. Ignored local harness/screenshots/report: `.expo/expense-review.cjs`, `.expo/expense-review/`.
- The existing NativeWind web startup error (`Cannot manually set color scheme, as dark mode is type 'media'`) occurs on login before visiting expenses. The final harness suppresses only that error's browser overlay, locally, to permit UI inspection. The feature did not change NativeWind/theme configuration. The final feature interaction run recorded no additional console errors or runtime exceptions. Browser verification is qualified by that test-only suppression.
- The natural empty-owner history branch is implemented; browser interaction coverage used the seeded demo owner. Empty input collections are covered in domain tests. Maximum native accessibility text scaling, native keyboard/focus behavior, screen readers, safe areas, and gestures remain device checks.
- **Android native runtime: not tested.** ADB reported no connected device or emulator. Browser checks do not validate Android hardware back, keyboard, TalkBack, or rendering.
- **iOS native runtime: not tested.** No iOS device/simulator is available on this Windows host. iOS swipe-back, keyboard, VoiceOver, and native modal handoff remain unverified.

SDK references checked before API changes: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Expo documentation index](https://docs.expo.dev/llms.txt), [SDK 58 Router API](https://docs.expo.dev/versions/v58.0.0/sdk/router/), [screen removal prevention](https://docs.expo.dev/router/advanced/prevent-screen-removal/), and [React Native KeyboardAvoidingView](https://reactnative.dev/docs/keyboardavoidingview).
