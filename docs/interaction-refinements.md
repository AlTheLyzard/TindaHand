# Explicit progression and shared back buttons

November 11, 2026. Read `AGENTS.md`, the original workbook's named MAY-ARI MODULE
and KAHERA MODULE stories/acceptance criteria, the registration/authentication
handoff notes, button-system guidance, registration artwork and color palette.
The copy sheet's different completion/ID sequence remains unchanged. The user's
explicit button-tap requirement clarifies older wording that valid information
displays the next page; validation alone does not authorize submission.

## Changes

- `src/components/auth/registration-screen.tsx`: final keyboard action dismisses
  the keyboard. Live validation, intermediate field focus, draft retention,
  first-invalid focus and the existing service/request locks remain in place.
- `src/components/settings/credential-form.tsx`,
  `src/components/auth/pin-recovery-screen.tsx`,
  `src/components/auth/role-login-screen.tsx` and
  `src/components/profile/edit-profile-screen.tsx`: final keyboard actions cannot
  create an Operator, save/reset/verify a PIN, request recovery, log in or confirm
  profile changes. Their visible action buttons still complete the same requests.
  Login/reset retain their successful navigation locks through the transition.
- `src/hooks/use-leave-once.ts`: shared focus-scoped lock used by Account Created,
  Owner ID, Operator Setup and Settings' Operator Created actions. Repeated taps
  cannot dispatch another completion navigation before returning to the screen.
- `src/components/dashboard/quick-add-modal.tsx`: completion no longer closes
  from a backdrop tap. Done remains explicit; system back and accessibility
  dismissal retain their existing behavior.
- `src/components/ui/back-button.tsx`: reuses IconButton, the existing arrow SVG
  (24-point canvas, 1.6-unit stroke), primary icon ink, accent-container blue
  (`#D1E1F5`), pill radius and 48-point touch-target token. Fixed width/height,
  no flex growth/shrink and contained overflow prevent stretched feedback.
- AuthHeader, POS BackButton, CreditProductBrowser, InventoryFrame, SettingsFrame,
  ProfileFrame, FinancialFrame, MenuFrame and TransactionHistoryScreen delegate
  to this control. Existing callbacks and safe-area containers are retained;
  negative margins around several headers were removed to contain the whole
  target within their content gutter. Change Role retains its text-button variant
  with its separate text arrow removed. Labeled primary/secondary/destructive
  actions and calendar month selectors keep their existing Design System styles.

No service contracts, validation rules, authentication guards, session-expiry
redirects, seed fixtures or business operations were changed.

## Verification

Shared checks: `npm run lint` and `npm run typecheck` passed. `npm test` passed
all 155 existing tests, including registration request concurrency, validation,
authentication/recovery and draft/state tests.

Chrome browser checks used the explicit opt-in development mock and fictional
accounts. These are web interaction checks, not native runtime validation:

- Registration stayed on its form after the last PIN digit, all inputs becoming
  valid and Enter. Repeated Create Account taps completed once. Account Created
  remained after its success-mark display and 15-second toast deadline; Continue explicitly
  opened Owner ID. Operator Setup likewise waited for Continue and retained its
  completion after toast expiry until Go to Dashboard.
- Profile email Enter did not open Save Changes confirmation; PIN Enter did not
  verify/save. Explicit confirmation and Verify worked. The shared back control
  still opened Discard Changes; Keep Editing retained the edited name.
- Valid Login and PIN-reset fields plus Enter stayed in place; tapping Log In or
  Save New PIN completed the request and navigated. Recovery email Enter did not
  send; Send Recovery Link opened Check Your Email.
- Product details and keyboard completion stayed on Details until Stock & Expiry
  was tapped. Back returned from the next step with the product draft intact.
- Source audit covered POS checkout/payment, Quick Add, product stock/review,
  receivables/payables, report filters, account selection and notification/animation
  callbacks. Selection changes with a separate progression action do not submit
  these flows. Existing picker actions and authentication guards are preserved.
- Back controls sampled in Registration, Settings, Profile, Reports, Inventory,
  Transaction History, POS Cart/Payment and the Quick Add debt-product browser
  had matching 48 × 48 resting and pressed bounds, a 24 × 24 icon and
  `rgb(209, 225, 245)` pressed fill. Settings measurements also passed at browser
  widths 320, 390 and 430 with no horizontal page overflow.
- Quick Add waited for Save Expense; its success card remained after an outside
  tap and closed only after Done in the exercised interaction. The sheet's back
  control returned from the debt-product browser to its form, and existing
  unsaved-change confirmation still applied when closing the edited form.

Local browser scripts, measurements and screenshots are under
`.expo/interaction-refinement/` and `.expo/interaction-*.cjs` (ignored artifacts).
The browser inherited the host's reduced-motion preference. Normal-motion
animation callbacks were audited in source; their visual timing was not separately
tested at runtime.

Android runtime: **not tested**; no connected Android device/emulator or ADB.
iOS runtime: **not tested**; Windows host has no iOS simulator or connected iOS
runtime. Native keyboard behavior, safe areas, Android back/iOS gestures, system
text sizes and TalkBack/VoiceOver still require separate device checks. No native
build or platform bundle export was run for this refinement. Not every screen,
modal or sheet was individually exercised in the browser.
