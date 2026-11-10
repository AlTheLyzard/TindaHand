> Current behavior (November 9, 2026): [authentication-handoff.md](authentication-handoff.md) supersedes historical notes below. Registration now includes required Email; the explicit development mock can create an ephemeral account. Skip for Now goes directly to the Owner Dashboard. Operator setup uses Owner ID + assigned unique PIN, with no Cashier ID login field. Production registration remains unavailable until integrated.

## Owner Settings follow-up — October 31, 2026

Initial Cashier setup now reuses the Add Cashier form and shared store-scoped service documented in [owner-settings.md](owner-settings.md). Development registration preview clears credentials on completion and initializes its mock Owner PIN in the service closure. Normal Owner registration is still unavailable. These changes supersede historical setup-unavailable/draft-retention notes below.

## Owner frontend refinements ? October 26, 2026

This follow-up supersedes earlier notes about submission-only errors, placeholder toast copy, and Skip for Now opening the dashboard. The main workbook role sheets remain the baseline; its copy sheet's dashboard shortcut and differing success/ID sequence are not merged. The user's current instructions explicitly choose the account chooser and the new toast wording.

Registration uses the existing validator on every edit. Feedback is visible for edited or blurred fields, or all fields after submission. Editing the original password/PIN revalidates an already-interacted confirmation. Untouched fields stay quiet. No validation rules were added.

The welcome mark is 190 points (previously 170), constrained to available width with its square aspect ratio. The success card is 16 points higher. Its checkmark draws once in 400 ms within fixed bounds using React Native Animated, and becomes static when Reduce Motion is enabled or cannot be queried. The toast reads ?Account Created.? / ?You can now start using TindaHand?; dismissal retains its measured slot height, including wrapped text. Existing completion deadlines and the dismiss control remain in use.

Skip for Now clears dashboard access and replaces ID details with /choose-account. Owner Login and Cashier Login always open their existing role login routes. Shared ephemeral accounts state starts empty; confirmed registration and the explicitly labelled development preview set an owner record, without credentials. With no owner the chooser offers the existing owner creation form. With an owner and no cashier it shows Owner Login and Add Cashier. A cashier record switches the latter to Cashier Login reactively. Cancelling a registration draft does not delete existing mock account records; reload clears all ephemeral state.

Cashier creation has no implemented destination. Add Cashier reports that limitation in an accessible inline notice. No cashier is automatically created and no new registration screen or backend integration was added. A future cashier flow must update AuthFlowProvider's accounts through setAccounts. Preview records remain fictional, and the default registration/login services remain unavailable.

Storefront strokes and plus strokes increase from 2 to 2.5 points, keeping their outer sizes and centers. Shared safe-area, scrolling and keyboard behavior is retained.

Changed files for this refinement: src/app/index.tsx, src/app/owner-id.tsx, src/app/choose-account.tsx; src/components/auth/registration-screen.tsx, account-created-screen.tsx, registration-toast.tsx, success-mark.tsx, account-choice-screen.tsx, account-role-card.tsx; src/state/auth-flow.tsx; src/types/auth.ts; src/i18n/en.ts; docs/registration-screen.md and docs/account-choice-screen.md.

Verification for this follow-up: npm run typecheck and npm run lint passed; node --test tests/auth-validation.test.cjs passed all 19 tests. Headless Chrome at phone widths checked untouched-field silence, errors while typing, correction, password/PIN confirmation dependencies, masked PINs, exact toast copy, visibility after six seconds and expiry after fifteen, stable card position after expiry, Skip for Now to the chooser, Add Cashier's honest limitation, and both role login routes. Inserting a fictional cashier record through the context setter updated the already-mounted chooser immediately. Widths 320, 360, 390 and 430 had no horizontal overflow; success and owner-only/both-account screenshots were inspected. A separate final browser check passed reduced-motion success entry and manual toast dismissal. A draft reset during a browser history traversal required refilling the fictional form in the check harness; no credentials were persisted. These are development-preview/browser checks, not real account creation or native testing.

Android runtime: not tested; no connected device/emulator or ADB available. iOS runtime: not tested; this Windows environment has no iOS simulator. Safe areas, native keyboard avoidance, system back/iOS gestures, accessibility text scaling and screen-reader behavior still need device checks. No native build or platform bundle export was run for this refinement. Browser artifacts and check scripts are under .expo/ and are not committed.


﻿# MA-LOG-002 registration and MA-LOG-003 ID details

References: all seven panels in designs/MA-LOG-002.png, the success and ID panels in designs/MA-LOG-003.png, and designs/Toast Messages and Status.png. Baseline requirements are MA-LOG-002/003 in the original workbook's main MAY-ARI MODULE. Original requirement files remain unchanged.

## Confirmed source decisions

The main sheet calls the form action Create an Account and the success message Congratulations! You have successfully created an account. The selected photos use Create My Account and Account Created Successfully!, and retain generic sticker-sheet toast wording. The copy sheet also differs in when ID generation occurs and where Continue leads. The user approved the supplied design, including its success wording and toast; Continue opens the MA-LOG-003 ID-details screen. The user removed Cancel from success, required masked PINs despite visible sample digits in some panels, and chose a 15-second toast timeout plus an X for dismissal. The success page remains after dismissal. No requirement explicitly requires toast persistence.

This replaces the earlier registration-to-chooser development preview. Welcome, chooser and role-login visuals/navigation are preserved. Welcome Get Started still opens registration and I have an account still opens the chooser. Registration Back retains the draft; registration Cancel clears it. Only the success screen loses Cancel.

## Form behavior

All five fields are required. Whitespace-only names fail. Passwords need at least eight characters, uppercase, lowercase, an ASCII digit and a non-whitespace special character. PINs contain exactly four ASCII digits, preserve leading zeroes, filter other characters and remain masked. Password toggles are independent. Confirmations must match; mismatch messages follow the main workbook. No undocumented name regex, extra identity fields or credential maximums are imposed.

The default CTA is enabled so the first attempt can reveal every required error, as in the first/third panels. Before that attempt, errors are hidden. Afterwards, current field values and dependent confirmations revalidate during edits; invalid fields stay highlighted with the supplied pale error fill, red borders and inline text. The submit CTA stays disabled while client-invalid after that attempt. These fields already show their errors when blurred; users are never left with an unexplained disabled CTA. Correction removes errors and enables submission. Loading disables submit, inputs and Cancel; a synchronous ref lock prevents same-turn duplicate events. A separate request lock prevents simultaneous calls and additional calls after confirmation. Request errors retain every entered value and allow retry; field errors from an eventual adapter can be shown inline and clear on relevant edits.

The shared Button gains optional loading/disabled states while leaving its existing enabled styles unchanged. Registration-only error styling does not change approved login fields. The form keeps safe areas, keyboard avoidance, scrolling, focus progression and accessible error announcements. Secrets never enter route parameters, persistent storage or logs.

## Backend boundary and development preview

There is no backend endpoint or wire schema in the repository. src/services/registration.ts is explicitly unavailable and sends no request. Normal Create My Account therefore shows a clear unavailable error and cannot open success. RegistrationService and RegistrationResult are an internal adapter seam, not a claimed backend schema. Future integration must map the real request, human-readable field errors and confirmed owner name/ID into this seam. Raw thrown exceptions are never displayed because transport errors might contain credential data.

Only a confirmed service result with a nonblank owner name and server ID unlocks real completion; malformed results stay errors. Confirmation copies just these explicit fields and clears registration credentials. The client never generates an ID. No authentication or session is simulated.

In development builds only, Preview Success Flow validates the same form and opens an explicitly labelled visual preview. The sample ID comes from src/data/registration-preview.ts; it is not assigned or generated. The success and ID pages each disclose that no account has been created/assigned. The draft remains in ephemeral React context for returning through the stack; refresh/process restart discards it. Production does not expose the preview action and rejects preview completions.

Routes: /register -> /account-created -> /owner-id. Success and ID routes redirect to registration when no completion exists. Completion details remain in context, never URL parameters. Toast expiry belongs to that completion, so Back cannot restart its 15 seconds. Manual dismissal clears its deadline; timer cleanup prevents effects after unmount. The toast slot remains stable to avoid moving the success card.

The ID screen follows the supplied dark ID card, owner name, server/sample ID, permanence text, reminder and action labels. MA-DASH-001 now implements Skip for Now: it establishes the ephemeral owner dashboard capability and replaces ID details with /owner-dashboard, without repeating the login-role chooser. The user explicitly approved this direct flow. The dashboard labels its reference data as demo data; this is not a production authenticated session. Continue to Kahera Account Setup still reports that setup is unavailable. See dashboard-screen.md for scope and current verification.

## Verification scope

Tests cover required fields, password rules, numeric/matching PINs, leading zeroes, malformed role parameters, invalid requests never reaching a service, duplicate attempts, retry after failure, draft immutability, safe exception feedback, adapter field errors, malformed confirmations, one confirmed completion and the unavailable default adapter. Confirmed results are tested through an injected test service; no actual backend account has been created or verified.

Browser checks use explicit development previews and fictional input, not real registration. Native runtime validation remains required separately on Android and iOS for safe areas, font scaling, keyboard focus/avoidance, scrolling, back gestures, announcements and toast timing. Browser previews, typecheck, lint and bundle exports are not native runtime tests.

Completed shared checks: TypeScript, Expo lint and 12 tests passed. Headless Chrome passed first-submit errors, invalid/disabled states, correction, masked PINs, unavailable requests retaining data, repeated taps, completion-route guards, the labelled success preview, absence of success Cancel, 15-second and X toast dismissal, persistent success content, ID preview navigation, honest downstream limitations, draft retention and 320 x 568 scrolling. Success/error/ID screenshots were inspected. ID pages were checked for horizontal overflow at 360 x 800, 390 x 844 and 430 x 932. Browser interactions reported no JavaScript/render errors. A separate MA-LOG-001 regression checked the chooser and both approved login layouts, their heading/spacing/reminder positions, selection, Back and Forgot PIN feedback. Temporary browser artifacts are in .expo/auth-layout-check/.

Android and iOS JavaScript/Hermes bundle exports passed. Android runtime: not tested; no device/emulator or ADB available. iOS runtime: not tested; no iOS simulator on this Windows environment. Native builds were not run. Real registration and real server failure responses remain blocked by the missing backend contract/endpoint; confirmed results and transport failures were exercised through injected test services only.

## Changed files

Latest account-details follow-up: toast deadlines are 15 seconds for both confirmed and preview completions; X still dismisses immediately. The existing effect clears its timeout on dismissal/deadline changes and unmount. The details card keeps its prominent owner name and ID, with smaller padding/gaps so actions fit typical content heights. The reminder is now Poppins 14/21 with justified alignment. Content remains in normal flow inside the safe-area ScrollView, so large text, long names, inline notices and short windows can grow and scroll instead of overlapping controls. Native word spacing still needs iOS/Android device checks. React Native documents that Android versions below 8 fall back to left alignment for justified text: https://reactnative.dev/docs/text-style-props#textalign.

Latest verification: typecheck, lint and 12 tests passed. Headless Chrome confirmed the toast survives six seconds and disappears by 15.4 seconds, with X still dismissing immediately and success content retained. Both details actions fit without scrolling at 360 x 800, 375 x 724, 390 x 760, 390 x 844 and 430 x 932; the reduced-height viewports approximate available content space, not native safe-area validation. The 14 px / 21 px justified paragraph was inspected in phone screenshots. At 320 x 568, the details screen scrolls and the lower action can be reached. Native runtime/font scaling/word spacing on iOS and Android remain untested because no device/emulator/simulator was available. No native build or bundle export was run for this follow-up.

- Routes: src/app/register.tsx, src/app/account-created.tsx, src/app/owner-id.tsx.
- Auth UI: registration-screen.tsx, registration-progress.tsx, success-mark.tsx, registration-toast.tsx, account-created-screen.tsx and owner-id-screen.tsx under src/components/auth/.
- Shared controls: src/components/ui/button.tsx and form-field.tsx (enabled login styles preserved).
- Local state/contracts: src/state/auth-flow.tsx and src/types/auth.ts.
- Registration boundary: src/services/registration.ts, src/utils/registration-request.ts, src/utils/registration.ts and src/data/registration-preview.ts.
- Verification/documentation: tests/auth-validation.test.cjs, docs/registration-screen.md and docs/account-choice-screen.md.
