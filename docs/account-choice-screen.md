## Account visual polish follow-up

This supersedes earlier sizing notes: the welcome mark is now 180 x 180 points with its existing centered layout and aspect ratio. The success toast uses a 300-point maximum width (280 available at a 320-point viewport), 8-point vertical/left padding, a 52-point minimum height, an 11/16 title and the existing 10/15 message. Its 48 x 48 dismiss target, completion deadline and measured dismissal slot are retained. Text remains scalable and unrestricted in line count.

The chooser heading uses Poppins Bold at 24/34 below 360 points and 28/40 otherwise. The reminder reads: Use your store's Owner ID and your role's four-digit PIN to log in. The app catalog uses typographic apostrophes. Cashier corner strokes now match the existing 2.5-point storefront and plus strokes in both Add Cashier and Cashier Login. Navigation, account state and validation are unchanged.

Changed files: src/app/index.tsx, src/components/auth/registration-toast.tsx, src/components/auth/account-choice-screen.tsx, src/components/auth/account-role-card.tsx, src/i18n/en.ts, and this document.

Verification: npm run lint and npm run typecheck passed. Headless Chrome at 320 x 568, 360 x 640, 375 x 667 and 390 x 844 confirmed single-line toast message and chooser heading, 52-point toast height, 48 x 48 dismiss target, exact reminder copy, no horizontal page overflow, both cashier states, and manual dismissal. Browser-only doubled-text checks confirmed wrapping without horizontal overflow. The centered logo measured 180 x 180 at 320 points. Screenshots were inspected; artifacts remain under .expo/account-visual-polish-* and .expo/*polished*. Native text scaling was not tested. Android runtime: not tested, no device/emulator or ADB available. iOS runtime: not tested, no simulator on Windows. No native builds or platform bundle exports were run.

## Owner frontend refinements ? October 26, 2026

The latest behavior and verification in [registration-screen.md](registration-screen.md) supersede the historical navigation notes below. Skip for Now opens the state-driven chooser. An existing owner opens Owner Login; an absent cashier shows Add Cashier with an explicit unavailable notice because cashier creation is not implemented. Updating the shared mock accounts state to include a cashier immediately restores Cashier Login. Both Login cards always open their role login forms. With no owner record, the existing registration form is offered. No cashier is created automatically.

# Choose your account

Reference: middle panel in `designs/MA-LOG-001.png`. The supplied dark May-Ari and pale-blue Kahera cards are role-specific colors, not evidence of a default selected role. Both start unselected; pressing a card selects it and immediately opens its login form. On returning, the chosen card has a blue outline, a Selected label and accessibility selected state. Each entire card is a button with pressed feedback and keyboard focus styling.

The screen follows the supplied heading, instructions, card descriptions/actions, footer, logo, Poppins fonts, palette and spacing. It scrolls on smaller screens and with larger text. Native safe areas replace exported device chrome. A visible back button is added for returning to registration without relying on system gestures. The existing logo asset is reused; the simple storefront and corner/plus icons are drawn with native views without new dependencies.

Baseline criteria: main `MAY-ARI MODULE` MA-LOG-001/005 and `KAHERA MODULE` KH-LOG-001/002 in the original requirements workbook. The copy sheet differs in welcome wording and owner invalid-credential wording; it is not merged into the baseline. Recovery remains an unresolved requirement, and the reference omits Forgot PIN although both main role sheets require it; the shared login exposes that action with an explicit unavailable message.

Navigation:

- Welcome Get Started (the existing registration CTA) remains linked to `/register`.
- Registration now follows the approved MA-LOG-002 success/ID flow; see `registration-screen.md`. The chooser remains the existing-account entry, and invalid registration stays on the form.
- Welcome I have an account also opens `/choose-account`.
- May-Ari Login opens `/login?role=owner`; Kahera Login opens `/login?role=cashier`.
- The shared login displays May-Ari ID and the chosen role's PIN. Its header back arrow dismisses to the chooser, replacing login with the chooser on direct entry. Invalid/missing/ambiguous role parameters redirect to the chooser. The extra Change Role row and repeated login label have been removed per the follow-up design request; the cashier heading reads Kahera Login following the latest text request.
- Back from the chooser returns to its prior screen. Direct entry has a Welcome fallback.

Only the non-sensitive login role appears in parameters. The registration draft and last selected role remain in ephemeral React context across forward/back navigation. Cancel clears the draft; reload discards it. No registration credentials are reused for login or sent to any service. Form values are not logged or persisted.

There is no registration API, request/response schema or authentication service. Registration is specifically for May-Ari; choosing Kahera selects an existing cashier login, not a different type of self-registration. The earlier registration-to-chooser preview has been superseded by the user-approved MA-LOG-002/003 flow, documented in `registration-screen.md`. Chooser/login behavior and authentication limitations remain unchanged.

The login destination uses the right-hand owner panel's shared layout and the documented role fields; Kahera shares that layout with role-specific wording. It only validates required ID and four-digit PIN format. Valid submission reports that authentication is not connected. Server credential validation and its documented incorrect-credential messages must wait for real responses.

Backend integration must define the owner registration contract and success/error responses, reconcile the confirmation/onboarding sequence, and gate post-registration navigation on real success. If an eventual registration API needs account type, gather it before submission; do not send the chooser's login role as a registration type. Connect login/role authorization and resolve PIN recovery separately.

Native runtime checks still needed separately on Android and iOS: safe areas, font scaling, card feedback and screen-reader selection, both role destinations, keyboard scrolling/focus, draft retention on system/gesture back, Cancel clearing and direct-route recovery. No platform runtime validation is implied by lint, typecheck or bundle export.

## Visibility and login spacing follow-up

The original card root combined a Pressable style callback with a NativeWind className. Inspection of the installed react-native-css-interop implementation identified a merge path that treats the callback as style data rather than evaluating it. This can discard the callback's card backgrounds, padding and borders. There was no overflow clipping, absolute overlay or z-index on the chooser's card container. Cards now use plain style arrays with explicit full width, a 148 dp minimum height and no shrinking. Press-in/out state supplies feedback without a callback style prop; card content can still grow with text scaling. The container explicitly stretches its children and does not shrink.

The shared login uses available window height minus safe-area insets to set bounded internal spacing. The main login block shares the chooser's 48 dp gap below the header and 20 dp top inset. Heading, supporting text, fields, preview notice and actions are grouped together. The One ID reminder follows this block with a consistent 24 dp gap instead of a flexible bottom spacer. ScrollView and keyboard avoidance remain available when the keyboard, inline notices, validation errors, small windows or larger text need more space. Forgot PIN still reports the unresolved recovery limitation and never claims recovery succeeded.

Follow-up verification: TypeScript, Expo lint and the five existing auth validation tests passed. Headless Chrome phone viewports verified visible/tappable 350 × 148 px cards at 390 × 844, both role destinations, selection feedback after Back, registration draft retention after Back and re-entry, and the Forgot PIN limitation message. The complete reminder fit without scrolling on both roles at 360 × 800, 375 × 812, 390 × 844 and 430 × 932; the owner registration-preview notice also fit at 360 × 800. A 320 × 568 viewport retained scrollable content. Browser screenshots were inspected for chooser and both roles. Temporary browser screenshots/results are under `.expo/auth-layout-check/` and are not committed. These are web checks with browser safe-area values, not Android/iOS device or keyboard checks. Native runtime, increased accessibility text, notches and keyboard-open behavior remain untested; no Android device/emulator or iOS simulator was available in this Windows environment.

Latest spacing/text verification: TypeScript and lint passed again. Headless Chrome verified that both login blocks start at the same vertical position as Welcome Back (116 px with browser safe-area values), both headings fit on one line, and the complete reminder follows Forgot PIN with a 24 px gap at 360 × 800, 375 × 812, 390 × 844 and 430 × 932. Both login screenshots were visually inspected. Narrow-window scrolling, role navigation, Forgot PIN feedback and registration draft retention passed the existing browser flow checks again. Native runtime and keyboard-open checks remain untested.

## MA-DASH-001 continuation

The chooser remains a login-role selector, not a post-registration step. Registration confirmation ? ID details ? Skip for Now opens /owner-dashboard directly. Selecting May-Ari from the chooser resumes that dashboard only when the current ephemeral owner completion and completed onboarding capability already permit access; otherwise it opens the existing owner login. Kahera still opens cashier login and never unlocks the owner dashboard. See dashboard-screen.md.
