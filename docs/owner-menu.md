# Owner More Tools / Menu

Current expense follow-up: [Store Expenses](store-expenses.md) replaces its temporary destination with the owner-only history and add form. Drawer selection still waits for dismissal before navigation. The expense-history exclusion and placeholder notes below describe the original sidebar task.

Implemented More Tools as a shared sidebar over the current Owner screen. Opening or closing it does not navigate or reset the underlying screen. Full financial statements, transaction history, expense history, debt management, profile editing, and settings workflows remain outside this task.

## Sources and traceability

Read `AGENTS.md`, the original workbook `docs/requirements/USER-STORY-v.02.10.2026 (1)(1).xlsx` (MAY-ARI MODULE, KAHERA MODULE, and Copy of MAY-ARI MODULE), Requirements Engineering, System Request, Project Charter, the proposed frontend plan, and the existing Dashboard, mock authentication, and Quick Add implementation/refinement notes. Original requirements remain unchanged.

The actual visual reference is `docs/designs/More tools (FS).png` (824 × 1834). There is no root `designs/` directory. Visually inspected this frame, `docs/designs/Icons (1).png`, and `docs/designs/Typography (1).png`; reused the configured Poppins fonts, shared colors/radii, existing outline icon renderer, and DashboardNavigation. The design README's claim that exports are absent is stale; the actual PNG files take precedence. No separate destination frames for these modules were found.

| Requirement | Acceptance criteria relevant to this task | Implementation |
| --- | --- | --- |
| MA-DASH-007 | 1–7: bottom navigation, selected option, Home/POS/Inventory/More Tools routing | Existing navigation toggles the sidebar and indicates Menu while open. It restores the underlying tab indicator when closed. |
| MA-MT-001 | 1: access to Financial Statements; 2 identifies General Journal, General Ledger, Income Statement, Balance Sheet | Financial Statements entry with the frame's subtitle; explicitly temporary destination. Generation and export are deferred. |
| MA-MT-002 | 1–11 describe transaction viewing, search/filter, details, editing/deletion | Entry opens an explicitly temporary destination; these workflows are deferred. |
| MA-MT-003 | 1: access to expenses; 3–6: expense recording, category, amount, details | Store Expenses entry and temporary history destination with the existing Record Expense modal. No expense list is fabricated. |
| MA-AR-001/002; MA-AP-001/002 | Debt overview and recording | Combined Receivables & Payables entry from the frame; temporary overview with existing Customer Debt and Store Debt modals. Payment/history workflows are deferred. |
| MA-PRO-001 | 1–4: identity, role, profile information | Identity card uses the active owner, links to a temporary Profile destination, and shows the available identity there. Editing is deferred. |
| MA-PRO-003 | 2–11: logout confirmation, Cancel/Log out, clear session, login/welcome redirect, protected access, success message | Shared ConfirmationContent and existing auth-flow `clear()`, owner login redirect and “Logged out successfully.” message. |
| MA-SET-001 | Settings access; 1–8 describe preferences and saving | Settings entry opens a labeled temporary destination. Preferences are deferred. |
| MA-QA-001/004/005 | Existing shortcuts and debt/expense forms | Dashboard expanding FAB and selection chips remain intact. Destination shortcuts reuse QuickAddModal. |

The named KAHERA sheet's KH-MT-001 permits transaction viewing/search/filter/details but prohibits editing/deletion. KH-PRO and KH-SET restrict access to the cashier's authorized information. This implementation creates no cashier routes or new permissions. All Menu routes, including direct destination URLs, reuse the existing resolved owner capability gate. The frontend gate is not production security.

## Presentation and routing

The sidebar follows the reference's 80% viewport width, capped at 360 points on larger displays. A transparent native Modal keeps the current screen visible under a dimmed backdrop. The identity card, Financial Statements, Transaction History, Store Expenses, Receivables & Payables and subtitle, divider, Settings, and red Log Out retain their order. The signed-in identity replaces the sample Juan Dela Cruz/TH-MA-0001. Device chrome is not duplicated.

The user's follow-up explicitly supersedes the highlighted Financial Statements row in the reference: **every tool is neutral on every opening**. There is no default selected tool or automatic navigation. Only a tool tap closes the drawer and navigates to its existing route. The obsolete `highlighted` flag was removed from the menu data, type, and row styling.

The shared DashboardNavigation owns the local open/closed state. Its bar remains mounted in the originating screen, beneath the entire modal overlay. The sidebar and backdrop cover the navbar, and it cannot receive taps while the drawer is presented. This follows the latest overlay-layering instruction, superseding the earlier request to keep Menu tappable during an opening. Native Modal `onRequestClose` closes the drawer for Android Back; browser Escape uses the same handler. The backdrop and close control also dismiss it. Logout confirmation uses the same modal window, rather than nesting another native Modal. Tool navigation and confirmed logout wait for the closing animation, and on iOS for native modal dismissal as well.

The existing Reanimated/Worklets solution drives a 280 ms slide from the left and a matching backdrop fade. A desired-versus-presented lifecycle keeps the native overlay mounted through closing. Transitions retarget their current progress, cancel interrupted work, and ignore obsolete completion callbacks. Selecting a tool locks further selections until dismissal so navigation occurs once.

Financial Statements, Transaction History, Store Expenses, and Receivables & Payables type simultaneously from empty visible text at 55 ms per character after entrance completes. Their shared 15-second window includes typing. At 15 seconds all four start backspacing from the end at 35 ms per character, without fading. Only after the longest description is empty do titles move downward over 280 ms, settling at the vertical center of their existing text blocks. Outer rows, icons, full-description layout space, individual glyph positions, wrapping, and touch targets do not move. Settings has no description and its title stays unchanged.

One linear Reanimated elapsed-time clock drives the complete sequence without per-letter React state or JavaScript timers. Closing/unmounting cancels that clock; a new opening restores title positions, empty visible descriptions, and a fresh deadline. Reduced motion shows complete descriptions immediately, then hides and repositions titles instantly at 15 seconds. Enabling reduced motion during an opening remains latched for that opening, so disabling it cannot resurrect erased descriptions. Static complete descriptions remain in native accessibility hints and web `aria-describedby`; the visual letter spans are excluded from the accessibility tree.

Sidebar icons now use exact crops of the neutral `docs/designs/Icons.png` sticker sheet through the existing expo-image loading approach. All required glyphs are present. The crop script and asset README record source coordinates and alpha extraction. Individual SVGs and higher-density exports are absent; the supplied 24-pixel raster resolution limits sharpness on higher-density screens. No icon was silently replaced or redrawn.

The navbar Menu glyph uses transparent crops of the supplied neutral/blue sheets in both states, through the same asset loader. The old Dashboard crop contained 1,147 opaque white pixels and no transparency; it is preserved but superseded. The intended pale-blue active circle is retained. The nine sidebar option/control icons are unchanged.

Rows have at least 72-point touch targets, wrapping text, fixed-size decorative icons, and pressed feedback. Drawer scrolling leaves clearance above the bottom safe area. The logout confirmation scrolls on small screens. Platform safe areas come from the existing safe-area package.

| Entry | Destination |
| --- | --- |
| Identity card | `/owner-menu/profile` — temporary |
| Financial Statements | `/owner-menu/financial-statements` — temporary |
| Transaction History | `/owner-menu/transaction-history` — temporary |
| Store Expenses | `/owner-menu/store-expenses` — temporary history; existing expense modal works |
| Receivables & Payables | `/owner-menu/receivables-payables` — temporary overview; existing debt modals work |
| Settings | `/owner-menu/settings` — temporary |
| Home, POS, Inventory | Existing `/owner-dashboard`, `/owner-pos`, `/owner-inventory` screens |

Menu opens from the existing Dashboard, POS, Inventory, and tool destination navigation shells. Their existing Settings/Profile controls also use the same temporary destinations; Dashboard View All activity opens the Transaction History placeholder. A drawer toggle changes no route or screen key, preserving local selections, searches, and scroll position. Leaving a route clears its drawer state so it cannot reopen unexpectedly on return.

Destination back controls use Expo Router history, with Dashboard as the fallback for direct entry. The former `/owner-menu` landing URL is retained as an owner-guarded redirect to Dashboard; no full-page Menu remains. Unknown tool identifiers pass through that fallback. Logout uses the existing session clearing function and shared confirmation UI, without a second auth mechanism. The Welcome page and Quick Add forms/FAB are unchanged by the sidebar update.

## Conflicts and limits

- **MA-MT-004 versus the frame:** the named workbook requires a Barcode Scanner in More Tools, but this frame has no scanner entry; its workbook remark also asks the programmer to confirm scanner behavior. No scanner row or camera permissions were invented. Reconcile this with the design team in a scanner task.
- **Named versus copy sheet:** the copy of MA-MT-002 omits detail/edit/update/delete criteria 3 and 7–10; the named sheet remains the baseline. The copy of MA-MT-003 substitutes unresolved payment-date/source/save/cancel notes for part of the expense-history criteria and requests ordering changes. This task keeps the supplied frame's ordering and does not implement either conflicting detailed workflow.
- **Quick Add:** MA-QA-001 lists six shortcuts, while the copy proposes removing Store Debt/assets and revises MA-QA-004. The user's explicit instruction preserves the existing Customer Debt, Store Debt, and Expense FAB/modals; no shortcut was removed or expanded.
- **Platform scope:** original documents describe Android. The explicit October 17, 2026 decision in AGENTS.md requires both Android and iOS and takes precedence. The implementation is shared; original documents were preserved.
- **Logout placement:** MA-PRO-003 criterion 1 locates logout in Profile; the supplied Menu frame places it directly in More Tools. The user's explicit frame instruction governs this landing screen. Profile is a temporary destination, not a complete implementation of that module.
- Requirements Engineering's functional/nonfunctional tables are empty. Its role descriptions and system-feature summaries support the entries, while numbered acceptance criteria come from the workbook; no new story IDs were assigned.
- All module destinations are temporary because no existing full module screens or matching destination frames were present. This implementation does not claim their detailed acceptance criteria are fulfilled. Existing Quick Add records remain in session memory with the already documented posting/default-date limitations.
- SDK 57 and the current Router/safe-area references were checked before implementation: [SDK reference](https://docs.expo.dev/versions/v57.0.0/), [Router navigation](https://docs.expo.dev/router/basics/navigation/), [safe areas](https://docs.expo.dev/versions/v57.0.0/sdk/safe-area-context/).

## Files

Current Menu files: `src/app/owner-menu/{_layout,index,[tool]}.tsx`, `src/components/menu/{menu-frame,menu-row,menu-icon,owner-menu-drawer,tool-placeholder-screen}.tsx`, `src/data/menu.ts`, `src/types/menu.ts`, the description/transition hooks, and this document. The former `owner-menu-screen.tsx` became `owner-menu-drawer.tsx`.

Updated the shared DashboardNavigation, Dashboard screen, InventoryFrame, PosFrame, PosIcon geometry, Login route, and RoleLoginScreen success-message display. No dependencies, configuration, native folders, source requirements, backend, or database were changed by this task. Existing unrelated workspace changes were preserved.

## Initial implementation validation (before sidebar update)

- `npm run typecheck`: passed after Expo regenerated the new route types. The first attempt used stale generated routes and failed; no type assertions or manual changes to generated types were used.
- `npm run lint`: passed.
- `node --test tests/*.test.cjs`: 47 passed, 0 failed. Includes the existing owner capability rejection of cashier/signed-out sessions and Quick Add validation, authorization, snapshots, and idempotency.
- `npx expo export --platform android --platform ios --output-dir .expo/menu-export`: final Android and iOS JavaScript/Hermes bundles passed. These are bundle compilation checks, not native builds or runtime tests.
- Headless Chrome: 23 screenshots at 412 × 917, 320 × 568, 390 × 844, and 430 × 932, plus a 1.5× CSS text-size review at 320 × 568. Reviewed the Menu, each temporary destination, the three reused modals, logout confirmations, and success feedback against the uploaded frame.
- Browser interactions passed: signed-out direct access to Menu/financial statements/expenses/debts redirects to account selection; Menu tab opens from Dashboard/POS/Inventory; the selected Menu indicator and exactly four visible navigation targets remain; all six destinations and their back controls work; shared expense validation and selected chips work; the debt product browser returns to the form and dirty drafts require discard confirmation; the final menu item scrolls above the navigation at every tested width; logout Cancel retains the session, confirmation clears it, success appears on Login, and browser Back cannot reopen protected content. The original expanding FAB still exposes all three actions. No runtime exceptions or console errors were reported in the final interaction run.
- Initial screenshot review found raster navigation icons disappearing on retained screens. Menu now passes the existing outline renderer through DashboardNavigation's existing `renderIcon` prop, as POS and Inventory already do. Reviewed the corrected small-screen and placeholder screenshots; icons remain visible without changing the navigation shell or active indicator.
- Local artifacts, ignored by Git: `.expo/menu-visual-review.cjs`, `.expo/menu-visual-review/*.png`, `.expo/menu-visual-review/measurements.json`, `.expo/menu-export/`.
- **Android native runtime: not tested.** No ADB, connected device, or emulator was available. System Back, native font scaling/TalkBack, real safe areas, and modal/keyboard behavior require Expo Go or a development build on Android.
- **iOS native runtime: not tested.** This Windows environment has no iOS simulator or connected iOS device. Back gestures, VoiceOver/text scaling, native safe areas, and modal/keyboard behavior require an iOS device or simulator.

No native builds or dependency diagnostics were run. Browser dimensions and CSS text scaling do not establish native accessibility or keyboard behavior. Both platforms share the same implementation, but neither has been validated at runtime in this task.

## Previous sidebar update validation (before motion and description refinement)

The sidebar update supersedes the initial full-page presentation and default Financial Statements highlight. Files changed in this update: `src/components/dashboard/dashboard-navigation.tsx`, `src/components/menu/owner-menu-screen.tsx` (renamed and converted to `owner-menu-drawer.tsx`), `src/components/menu/menu-row.tsx`, `src/components/menu/menu-frame.tsx`, `src/app/owner-menu/index.tsx`, `src/data/menu.ts`, `src/types/menu.ts`, and this document. No dependencies or authentication/Quick Add/domain logic were changed.

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test tests/*.test.cjs`: 47 passed, 0 failed.
- Headless Chrome interaction checks passed with no console errors or runtime exceptions. Opening More Tools leaves the pathname unchanged and all five tool rows neutral; closing by a real click on the exposed backdrop, Menu again, or Escape leaves the original Dashboard heading node mounted and its scroll offset unchanged. Returning from all six destinations also preserves that scroll offset.
- POS and Inventory each retain the original search input node and the search value after opening and closing the sidebar. All six tool/profile entries close the drawer and reach their existing destination; destination Back returns to the originating screen. Existing Store Debt and Expense modals still open/close, and the original Dashboard Quick Add FAB and Customer Debt modal work. Logout Cancel keeps the drawer/session, and confirmation uses one modal window and returns to Login with the existing success message.
- Captured and visually reviewed 14 screenshots covering Dashboard/POS/Inventory overlays, 320 × 568, 390 × 844, 412 × 917, 430 × 932, and 768 × 1024 viewports, plus 1.5× CSS text at 320 × 568. Confirmed the 80%/360-point drawer width, visible dimmed underlying screen, neutral rows, wrapping labels, visible icons, and final-item clearance above the single shared navigation bar. The footer bar remains interactive above the drawer so Menu can toggle it closed.
- Artifacts are local and ignored by Git: `.expo/menu-drawer-review.cjs`, `.expo/menu-drawer-review/*.png`, and `.expo/menu-drawer-review/measurements.json`.
- **Android runtime: not tested.** No device/emulator or ADB was available. Android Back is wired through native Modal `onRequestClose`; browser Escape exercised the close handler, but does not validate the Android hardware button. Native safe areas, screen readers, text scaling, and keyboard behavior remain device checks.
- **iOS runtime: not tested.** No simulator or connected iOS device was available in this Windows environment. Native modal dismissal/navigation handoff, safe areas, VoiceOver/text scaling, and keyboard behavior remain device checks.

No new native builds, platform bundle exports, or dependency diagnostics were run for the sidebar update. The exports listed above belong to the earlier implementation.

## Previous overlay, original icons, and typewriter refinement

This update follows the final requested description sequence: slide open, type all four descriptions together, hold ten seconds after the longest finishes, then fade together. It supersedes the earlier instruction to start the hold immediately after entrance. The navbar stays behind the entire overlay and cannot toggle it while open; use the close control, backdrop, or Android Back.

Changed files:

- `src/components/dashboard/dashboard-navigation.tsx`: keeps the originating bar mounted behind the modal and stops passing it into the drawer.
- `src/components/menu/owner-menu-drawer.tsx`: shared slide/backdrop styles, transition lifecycle, dismissal/navigation lock, original supplied icons, and description sequence.
- `src/components/menu/menu-row.tsx`: stable full-character layout with a shared reveal index/opacity, static native/web accessibility descriptions, and supplied neutral glyphs.
- `src/components/menu/menu-icon.tsx`: loads the extracted PNGs through existing expo-image without tinting or aspect-ratio changes.
- `src/hooks/use-menu-drawer-transition.ts`: 280 ms Reanimated transition, native presentation/dismissal synchronization, reduced-motion subscription, and cancellation/stale-completion protection.
- `src/hooks/use-menu-descriptions.ts`: resets the shared sequence on opening and cancels timers/fades on close/unmount.
- `src/utils/menu-description-sequence.ts`: one injectable character/hold clock, 30 ms per character, 10-second hold after longest completion, and a 250 ms fade duration.
- `src/data/menu.ts`: concise Transaction History and Store Expenses descriptions. Existing financial/debt meaning and neutral defaults are preserved.
- `scripts/prepare-menu-assets.cjs`, nine PNGs and `assets/images/menu/README.md`: exact neutral-sheet extraction, source coordinates, and raster-resolution limits.
- `tests/menu-description-sequence.test.cjs`: deterministic timing, hold-start, cancellation, queued stale callback, reopening, and reduced-motion checks.
- This document. No dependencies, authentication, backend, Welcome, or Quick Add workflows changed.

Validation:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test tests/*.test.cjs`: **51 passed**, including four new sequence tests.
- Headless Chrome, normal motion: verified the left slide and backdrop fade; the original navbar remained connected outside the modal, and a real click at its POS control coordinates could not navigate or dismiss the drawer. All four descriptions typed concurrently at the same character count. Full, partial, and hidden description rectangles were identical. Titles/icons stayed visible and the default Financial Statements row stayed neutral.
- Normal-mode timing samples: all four descriptions had seven revealed characters in the same sample. Longest text was 56 characters. Fade began approximately **9,981 ms** after the first sampled full-text frame and finished approximately **10,231 ms** after it, consistent with a ten-second hold and 250 ms fade. All four opacity values matched throughout.
- Browser accessibility-tree checks verified full static descriptions for all four buttons. Animated letter spans are hidden from that tree, preventing individual-letter announcements. Native hints remain static too, but native screen readers were not tested.
- Verified close/reopen reset across an old hold deadline; closing during typing; interrupted entrance/exit; and reopening at **0, 240, 270, 280, 290, and 310 ms** around exit completion. No stale hide, flicker state, invisible blocking modal, unwanted route, console error, or runtime exception was reported. A tool remained tappable during typing; a double tap navigated once, after exit completed.
- Reduced-motion browser emulation: full text appeared immediately with no slide/typewriter/fade, stayed for ten seconds, then hid instantly with identical geometry. At 320 × 568, the final logout entry remained reachable by scrolling. Screenshots at 412 × 917 and 320 × 568 were inspected, along with a contact sheet of all nine original glyphs.
- Local artifacts, ignored by Git: `.expo/menu-motion-review.cjs`, `.expo/menu-motion-edge-review.cjs`, `.expo/menu-motion-review/*.png`, `.expo/menu-motion-review/animation-measurements.json`, and `.expo/menu-icon-review.png`.
- **Missing assets:** no required neutral glyph is missing. Individual vectors and higher-density exports are unavailable; the supplied sheet is 24-pixel raster artwork. No substitute icons were generated.
- **Android native runtime: not tested.** No ADB/device/emulator was available. Verify hardware Back, actual safe areas/navigation bars, TalkBack, native text scaling, animation performance, and device reduced motion.
- **iOS native runtime: not tested.** No connected device or simulator was available in this Windows environment. Verify native modal handoff, safe areas, VoiceOver/text scaling, animation performance, and device reduced motion.

No new native build, platform bundle export, or dependency diagnostic was run for this refinement. Browser motion/accessibility emulation does not establish native runtime behavior.

## Previous persistent descriptions and transparent navbar Menu icon update — October 29, 2026

This follow-up supersedes the earlier ten-second hold/fade behavior. The existing drawer slide/backdrop transition and overlay layering are unchanged. The four description rows now wait 200 ms after entrance, type at 55 ms per character with a 150 ms stagger, and remain complete until closing. There is no description opacity animation or automatic hide timer. One cancellable deadline clock drives the staggered counts and has no pending work after completion. Closing retains the currently painted text during exit; reopening resets every row before painting. Reduced motion shows and retains full text immediately. Full-description layout reservation and static native/web accessibility hints are unchanged.

The navbar's default Dashboard crop was opaque: 1,147 fully white pixels and zero transparent pixels. Wrapper inspection found the intended active circle is `#D1E2F8`, not a white rectangle; no wrapper/tint fix was necessary. The Menu glyph now consistently uses neutral/blue transparent crops from the supplied `Icons.png` and `Icons (1).png` across navigation shells. Both new 24 × 24 assets have 456 transparent pixels and no opaque white pixels. Original black/blue ink and proportions are preserved, with the existing 28-point navbar box. SHA-256 comparisons confirmed the other nine sidebar glyphs are byte-for-byte unchanged. The old Dashboard crop is preserved but superseded.

Changed files:

- `src/utils/menu-description-sequence.ts`, `src/hooks/use-menu-descriptions.ts`: new pause/speed/stagger, per-row counts, persistent completion, cancellation/reset, and no fade/hide work.
- `src/components/menu/menu-row.tsx`, `src/components/menu/owner-menu-drawer.tsx`: per-row reveal counts and static reserved text area; removal of the description opacity layer.
- `src/components/menu/menu-icon.tsx`, `src/components/dashboard/dashboard-navigation.tsx`, `src/components/dashboard/dashboard-ui.tsx`: transparent Menu assets in both states, preserving other icon rendering and the active circle.
- `scripts/prepare-menu-assets.cjs`, `assets/images/menu/menu.png`, `assets/images/menu/menu-active.png`, and the Menu/Dashboard asset READMEs: exact color/alpha extraction and provenance.
- `tests/menu-description-sequence.test.cjs`: five focused timing, persistence, cancellation/reopening, queued stale callback, and reduced-motion tests.
- This document. No dependency, backend, authentication, route, Welcome, or Quick Add changes.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test tests/menu-description-sequence.test.cjs`: **5 passed**. The broader domain suite was not rerun for this focused refinement.
- Headless Chrome at 412 × 917: measured approximately **53.7 ms per character**. First visible characters were sampled at 274/402/563/711 ms after the first fully open frame (polling contributes timing variance), consistent with the configured pause, 55 ms character interval, and 150 ms stagger. Partial, complete, persistent, and reopened states were captured and visually inspected.
- All four descriptions remained fully visible more than **12 seconds after completion**, beyond the removed timeout. Layout rectangles were identical before, during, and after typing. Reopening replayed the staggered reveal; rapid open/close canceled and reset cleanly. Menu options remained tappable during typing and reached their existing destination.
- Verified native full-description hint configuration and complete browser accessibility-tree descriptions. The visual letter spans remain excluded from that tree. Browser reduced-motion emulation showed full descriptions immediately and kept them visible beyond 12 seconds.
- Visually inspected default and active navbar states and returning from a destination. The active blue glyph blends into the existing blue circle with no white rectangle. Original navbar nodes stayed mounted behind the overlay; a real click at a covered navbar control could not navigate or dismiss the drawer. No console errors or runtime exceptions were reported.
- Local ignored artifacts: `.expo/menu-persistent-review.cjs`, `.expo/menu-persistent-review/*.png`, `.expo/menu-persistent-review/measurements.json`, and `.expo/menu-persistent-review/timing-samples.json`.
- **Android native runtime: not tested.** No ADB/device/emulator was available. Native frame pacing, Back, safe areas, TalkBack, and device reduced motion remain device checks.
- **iOS native runtime: not tested.** No connected device/simulator was available on Windows. Native frame pacing, modal handoff, safe areas, VoiceOver, and device reduced motion remain device checks.

No native build, platform bundle export, or dependency diagnostic was run for this follow-up. The supplied glyphs were found; individual vector/high-density exports remain unavailable as previously documented.

## Previous fifteen-second fade and title settling — October 29, 2026

This update supersedes the preceding indefinite-description behavior. The existing typewriter timing, sidebar transition, icons, navigation, neutral selection, and overlay layering are preserved. One independent 15-second timer starts after the drawer finishes opening; typing time is included. Expiry fades all four descriptions together over 250 ms, then moves their titles downward over 250 ms. Each title is centered within the original title-plus-description block; the description footprint stays reserved. Row bounds, icons, touch targets, and other entries stay fixed. Settings has no description and does not move.

Descriptions stay hidden and titles stay settled until closing/reopening. Closing or unmounting cancels the deadline, character clock, and shared animation sequence. New openings restore original title positions and replay typing with a fresh deadline. Reduced motion reveals complete text immediately, then switches visibility and title position instantly at 15 seconds. Preference changes do not restart the window. Complete static screen-reader hints remain available after visual hiding.

Changed files:

- `src/utils/menu-description-sequence.ts`: visibility/fade/movement constants and a cancellable, one-shot lifetime clock independent of typing completion.
- `src/hooks/use-menu-descriptions.ts`: lifetime gating, shared fade-then-move sequence, reset/cancellation, expiry latch, and reduced-motion handling.
- `src/components/menu/menu-row.tsx`: description opacity, measured title translation within the reserved text block, unchanged explicit Poppins typography, and stable row/title identifiers for verification.
- `src/components/menu/owner-menu-drawer.tsx`: passes the shared sequence to existing rows.
- `tests/menu-description-sequence.test.cjs`: four added deadline, stale callback, reopening, and long-typing cancellation cases alongside the five preserved entrance tests.
- This document. No assets, dependency/configuration, route, backend, authentication, Welcome, or Quick Add changes.

Verification:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test tests/menu-description-sequence.test.cjs`: **9 passed**. The broader domain suite was not rerun for this focused change.
- Headless Chrome at 412 × 917 verified preserved typing/stagger, full text before expiry, and a deadline measured from completed entrance rather than typing completion. The final run sampled fade onset at approximately **15,015 ms**, title movement at **15,282 ms**, and settled positions at **15,502 ms**. Sampling variance reflects browser frames/tool polling.
- All four opacity values stayed coordinated. Title movement began only after descriptions reached opacity zero, with intermediate translated positions observed. Final downward offsets were 17, 17, 9.5, and 9.5 points, according to each description's measured height. The outer row rectangles, icon bounds, reserved description rectangles, and touch targets stayed identical throughout. Settings' title stayed unchanged.
- Captured and visually inspected Poppins-styled full-text, hidden/settled, and reopened states. Screenshot review caught and corrected Animated.Text losing class-based typography; the final explicit style matches the original font, size, line height, and color.
- Verified descriptions remained hidden afterward and an option still navigated successfully. Browser accessibility-tree descriptions remained complete after hiding, without exposing the individual animated letter spans.
- Verified a canceled opening's old deadline did not affect the next opening; a fresh opening retained a full visibility window. Closing during title movement and rapidly reopening canceled pending movement, restored original positions, and replayed typing. No console errors or runtime exceptions were reported.
- Reduced-motion browser emulation showed full text immediately and switched opacity/title positions without intermediate animation at approximately **15,014 ms**. Row/icon geometry stayed fixed.
- Local ignored artifacts: `.expo/menu-window-review.cjs`, `.expo/menu-window-review/*.png`, and `.expo/menu-window-review/measurements.json`.
- **Android native runtime: not tested.** No Android device/emulator was used; native Back, safe areas, TalkBack/text scaling, frame pacing, and device reduced motion remain native checks.
- **iOS native runtime: not tested.** No connected device/simulator was used in this Windows environment; native modal handoff, safe areas, VoiceOver/text scaling, frame pacing, and device reduced motion remain native checks.

No native build, platform bundle export, or dependency diagnostic was run for this update. Browser emulation does not establish native runtime behavior.

## Current simultaneous typing, backspacing, and title settling — October 29, 2026

This update replaces the preceding stagger/pause and fade behavior. All four descriptions start visibly empty after the drawer completes opening, type simultaneously at 55 ms per character, and hold their complete text until the shared opening clock reaches 15 seconds. At that deadline they backspace simultaneously at 35 ms per character. Shorter descriptions finish first; titles wait for the longest to become empty before moving to their established centered positions over 280 ms. Descriptions remain empty until reopening.

Inspection found that each character previously traveled through a JavaScript timeout and React state update, rerendering the drawer and its 155 description glyphs. Those paints depended on React/JavaScript scheduling. The implementation now samples one linear Reanimated elapsed-time clock on the UI thread and directly updates animated glyph colors; there are no per-letter React updates or description JavaScript timers. This removes that scheduling dependency. The local browser's default `prefers-reduced-motion: reduce` was also verified as **true**, which explains immediate descriptions in this preview environment: that mode intentionally skips typing. Normal and reduced motion were tested separately through emulation; this does not establish the user's phone preference. The native symptom could not be reproduced or profiled without a native runtime. A separate opening mask prevents retained full/partial native text from painting before the next clock reset. Full text stays in layout, so glyph wrapping and all row/touch geometry remain stable. Complete accessibility hints stay static, with visual glyphs excluded from announcements.

Closing or unmounting cancels the clock without a delayed completion callback. Reopening resets elapsed time, title positions, and the reduced-motion setting for the new opening. Reduced motion displays the complete descriptions immediately and hides/repositions them instantly at 15 seconds. Its clock deliberately continues measuring time even when system animation reduction is enabled; visible styles do not animate. Enabling reduced motion mid-opening remains latched until reopening, preventing later motion or text resurrection. Drawer transitions, overlay layering, provided icons, neutral defaults, routes, and permissions are unchanged. The existing source frame and requirement traceability above still apply; no new asset or requirement conflict was found.

Files changed for this refinement:

- `src/utils/menu-description-sequence.ts`: elapsed-time typing/backspacing/title calculation and timing constants.
- `src/hooks/use-menu-descriptions.ts`: cancellable Reanimated clock, opening reset, and reduced-motion handling.
- `src/components/menu/menu-row.tsx`: UI-thread glyph visibility, opening mask, stable reserved layout, and title translation after erasing.
- `src/components/menu/owner-menu-drawer.tsx`: shared presentation state and opening-mask wiring.
- `src/types/menu.ts`: frontend-only description presentation type.
- `tests/menu-description-sequence.test.cjs`: eight focused simultaneous typing, exact deadline/erasing, title-order/duration, elapsed sampling, persistence, and reduced-motion tests using the existing fixture descriptions.
- `docs/owner-menu.md`: current behavior and verification record.

Validation:

- `npm run typecheck` and `npm run lint`: passed.
- `node --test tests/menu-description-sequence.test.cjs`: **8 passed**. The unrelated domain suite was not rerun.
- Headless Chrome at 412 × 917 verified the complete typing/backspacing/title sequence, including simultaneous first characters, intermediate character counts, retained prefixes during erasing, and no description fade. First backspace was sampled at approximately **15,051 ms**, title movement at **16,983 ms**, and a fully settled sample at **17,313 ms** (including an explicit 80 ms settling wait). Timing tests assert the 280 ms title interval independently of browser polling.
- All outer row rectangles, icon bounds, full-description rectangles, and individual glyph positions stayed identical through typing/erasing/title movement. Titles alone moved down by 17, 17, 9.5, and 9.5 points; Settings stayed fixed. Options remained tappable throughout.
- Closing during typing, backspacing, and title movement, then reopening, restored initial positions and a fresh sequence. An old opening's deadline did not shorten the next opening. Rapid close/reopen checks at 0, 100, 260, 280, and 300 ms passed. An additional opening-frame check confirmed descriptions stayed masked throughout entrance, including reopening from complete and partial text; browser Escape dismissal also passed. Selecting Financial Statements while typing navigated once after dismissal, and back navigation worked.
- Verified complete browser accessibility descriptions after visual hiding, scrolling at 320 × 568, overlay coverage of the bottom navbar, backdrop dismissal, and preservation of the underlying mounted screen/navbar.
- Reduced-motion browser emulation showed complete text immediately, then hid all text and repositioned all titles without intermediate animation at approximately **15,026 ms**. Reopening restored full descriptions and original title positions. No console errors/runtime exceptions occurred in the successful complete-sequence run.
- Captured and visually inspected partial typing, complete descriptions, partial backspacing, settled titles, and the original `docs/designs/More tools (FS).png` reference. Ignored local artifacts are `.expo/menu-backspace-review.cjs`, `.expo/menu-backspace-review/*.png`, and `.expo/menu-backspace-review/results.json`.
- **Android native runtime: not tested.** No connected Android device/emulator was available. Native text rendering/frame pacing, system Back, safe areas, text scaling, TalkBack, and device reduced motion remain device checks.
- **iOS native runtime: not tested.** No device/simulator was available in this Windows environment. Native text rendering/frame pacing, modal behavior, safe areas, text scaling, VoiceOver, and device reduced motion remain device checks.

No dependencies, native builds, platform bundle exports, backend changes, or authentication changes were introduced for this refinement. Browser checks do not establish native runtime behavior.
