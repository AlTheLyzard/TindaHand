# Scoped Dashboard refinements

## Icon alignment and Slate Blue follow-up

This follow-up supersedes the earlier Muted Ice surface-border request. The four Dashboard surface cards now use a 1-point `tokens.color.borderOutline` border: Slate Blue `#B0C8E3`, from the existing supplied palette. The cash plus background and Quick Add option borders retain their previous colors.

The cash-card and collapsed FAB plus signs now use the existing `PosIcon` SVG renderer with a symmetric cross centered at (12, 12) in its 24-unit view box. Their 24-point and 32-point canvases sit centrally in the unchanged 32-point cash circle and 56-point FAB. Geometry replaces font glyphs so text baselines and platform font padding cannot offset the plus. The expanded close glyph, labels, hit targets, menu anchors and interactions are unchanged.

Quick Add options now include hand/coins, stacked coins and wallet outlines respectively. All three use the same renderer, 24-point canvas, 1.6-unit round-cap/round-join strokes, brand color and 8-point icon-to-label gap. Labels remain scalable and can wrap. Icons are decorative; existing button accessibility labels remain the accessible names. The attached image guides the symbols only, without copying its separate blue icon circles or menu design.

Changed files for this follow-up: `src/constants/design-tokens.json`, `src/components/pos/pos-icon.tsx` (new shapes only; existing icons unchanged), `src/components/dashboard/dashboard-ui.tsx`, `dashboard-cards.tsx`, `dashboard-quick-add.tsx`, and this document. No transaction behavior or navigation changes.

Follow-up verification: lint and TypeScript passed. Browser checks at 320 x 568, 360 x 640, 375 x 667, 390 x 844 and 430 x 932 measured both icon canvases centered within their touch targets, checked symmetric plus geometry, all four exact Slate Blue 1-point borders, uniform option icon dimensions/strokes/gaps, and no horizontal overflow. Cash and all three action notices, Close, backdrop and Escape retained their existing behavior. Doubled option-label text wrapped at 320 points without horizontal overflow. Screenshots were inspected; artifacts are in `.expo/dashboard-icon-alignment-*` and `.expo/dashboard-option-icons-large-text.png`.

Android native alignment/runtime: not tested; no device/emulator or ADB available. iOS native alignment/runtime: not tested; no simulator on Windows. These shared-code/browser checks do not validate native SVG rendering, safe areas, OS text scaling or screen-reader behavior. No native builds or platform exports were run for this follow-up.

## Earlier refinement

The attached MA-QA-001, MA-QA-001-1 and MA-DASH-001 pictures guide placement and proportions only. Their device chrome, language and other screen styling are not copied.

Sources reviewed: AGENTS.md, the existing Dashboard/cards/navigation/shared UI, token file, supplied color palette, and MA-DASH-001/002 plus MA-QA-001 through MA-QA-005 in the requirements workbook's named MAY-ARI MODULE. The main sheet lists six Quick Add options; the copy lists four and has remarks removing store debt/assets. This request explicitly specifies three actions, so only Add Customer Debt, Add Store Debt and Record Expense are shown. Other workbook/copy-sheet actions and remarks are not adopted.

Changes:

- Cash card outer vertical padding decreases from 20 to 16 points; the metric's top gap decreases by 4 points. A 48 x 48 accessible target with a 32-point plus circle sits at the metric row's right edge, above Expenses. Metric typography and values stay unchanged and text can wrap when scaled.
- Sales Report, Stock Health, Best-Selling Items and Recent Activity share a 1-point border. The supplied palette defines Muted Ice / Primary Disabled as `#B8CCE4`; that existing design value is now exposed as `tokens.color.primaryDisabled`, since it was absent from the code token file. No other card surfaces are changed.
- A 56-point Quick Add FAB sits above the highest expanded-navigation position plus a 16-point gap, with the actual bottom safe-area inset. Extra scroll clearance lets the last activity move above the FAB. The expanded menu uses existing typography, radii and colors, supports scalable labels and scrolling, and keeps Close outside the action scroller. Close, backdrop, Android modal back, accessibility escape and browser Escape use the same dismiss path. The menu uses no animation and does not depend on hover.

Missing destinations: there is no implemented Quick Add menu or customer-debt/store-debt/expense form in the current source tree. Selecting one of the three shortcuts closes the menu and reuses the Dashboard's existing unavailable-modal presentation, explicitly saying its form is missing and no record was created. No new transaction forms, data writes, debt rules or expense behavior were invented. The cash-card plus action is not defined in the main acceptance criteria; a copy-sheet capital remark is unresolved. Its notice explicitly reports this missing action and never changes cash. These UI entries need wiring once their feature owners supply the intended action and forms.

Changed files: `src/components/dashboard/dashboard-cards.tsx`, `dashboard-ui.tsx`, `owner-dashboard-screen.tsx`, new `dashboard-quick-add.tsx` in that directory, `src/constants/design-tokens.json`, `src/i18n/en.ts`, and this document. Existing totals, periods, fixtures, content-state controls, role/session gates, logout, navigation destinations and other Dashboard presentation remain unchanged.

Verification: lint and TypeScript passed; all 19 existing auth/dashboard validation tests passed. Headless Chrome at 320 x 568, 360 x 640, 390 x 844 and 430 x 932 checked the four exact border colors/widths, reduced cash padding, single-line metric beside its action, FAB/navigation clearance, consistent expanded/closed anchors, 48-point-or-larger action targets, all three labels, explicit missing-destination notices, Close/backdrop/Escape dismissal, last-card scroll clearance and no horizontal overflow. A browser-only doubled-label-size check verified menu wrapping. Screenshots were inspected. Temporary artifacts are under `.expo/dashboard-quick-add-*`, `.expo/quick-add-expanded-*` and `.expo/quick-add-large-text.png`.

Android runtime: not tested; no connected device/emulator or ADB available. iOS runtime: not tested; no iOS simulator on Windows. Native safe-area behavior, hardware Back, VoiceOver/TalkBack focus and OS text scaling need separate device checks. No native build or platform bundle export was run. Browser checks are not native runtime validation.
