# Owner Dashboard refinements

## Compact dashboard and Quick Add follow-up

This follow-up supersedes the five-row activity preview described below. The dashboard now selects the latest **three** actual records by full timestamp; fewer records remain fewer, and the history source and View All route are unchanged. Loading mirrors the three-row preview. The existing regression test now covers zero, two, three and seven source records with the three-record limit and unchanged source history.

Sales metric tiles reduce vertical padding from 12 to 8 points, label/value spacing from 8 to 4 points, and minimum height from 112 to 94 points. Both tiles retain the same caption space and equal heights across Daily/Weekly/Monthly; the growth graphic is preserved. Top Selling Items uses the existing 10-point type step instead of 12 for sold counts and reserves 76 points for a single-line normal-text count. Larger accessibility text moves the count below the product name and permits expansion.

Quick Add uses a shared shell at 90% of available height, capped at 600 points, replacing the previous full-height/750-point cap. Vertical padding and form gaps are reduced using existing spacing tokens. Header/tabs and the footer remain outside the bounded body scroller. At narrow normal-text widths, the existing compact ChoiceChip variant keeps all three form tabs visible on one line; enlarged labels retain horizontal scrolling.

Quick Add confirmations use equal-width, stretching footer buttons, an 8-point gap and equal inner margins. Add Cash opts into this layout only for its discard confirmation. Labels, destructive/outlined styles, actions and shared button radii are preserved; unrelated default confirmation layouts remain unchanged.

Changed for this follow-up: `src/components/dashboard/{dashboard-cards,quick-add-modal,quick-add-ui,add-cash-modal}.tsx`, `src/components/ui/confirmation-content.tsx`, `src/utils/dashboard.ts`, `tests/auth-validation.test.cjs`, this document and `docs/quick-add-layout-refinement.md`.

Validation: `npm run typecheck`, `npm run lint` and the 26 existing auth/dashboard/Quick Add tests passed. Headless Chrome verified 320- and 390-pixel dashboard layouts, 94-point equal-height metric boxes and period stability, preserved graph, three activity/skeleton rows, and a full single-line `999 pcs sold` layout fixture. Quick Add checks covered 320×568, 390×844 and a reduced 320×288 viewport: stable shell/header/footer across categories and Cash/Product, single-line tabs, selected product rows, fixed reachable actions, and discard/keep-editing in both dashboard modal flows. At 320 pixels, Quick Add discard buttons measured 114×68 each with 18-point equal margins; Add Cash discard buttons measured 112×68 with 20-point equal margins. Both used an 8-point gap and 5-point shared radius. Screenshots were visually inspected; ignored browser artifacts are under `.expo/dashboard-compact-*`.

Android runtime remains **not tested**: no device/emulator or ADB is available. iOS runtime remains **not tested**: no iOS simulator/device session is available on this Windows host. Reduced browser height does not open a native keyboard; native keyboard/focus scrolling, safe areas, back behavior and accessibility text still need platform checks. No dependencies, native configuration or requirements sources changed, and no native build or platform bundle export was run.

## Earlier refinement

Updated the existing dashboard using `docs/designs/MA-DASH-001.png`, `MA-DASH-002.png`, Buttons, palette, typography, and icons. The requested `designs/` files are stored under `docs/designs/`; no separately named `MA-DASH-002(1)` export exists. The supplied MA-DASH-002 includes the requested interaction states.

Read root AGENTS.md, the original requirements engineering document, and MAY-ARI MODULE MA-DASH-001–007 acceptance criteria in the source workbook. The baseline overview still says Financial Overview/Store Health, while later stories and supplied designs say Sales Report/Stock Health. This task's English names govern the implementation. The copy owner sheet's capital-placement and growth-formula remarks remain unresolved source notes; no growth comparison is fabricated for periods without comparison data. Source requirements are unchanged.

The five cards share edges, 16-point corner radii, 20-point section padding and 24-point gaps. On screens narrower than 360 points, outside gutters shrink from 24 to 16 points so currencies remain readable. Cash on Hand retains the blue emphasis and independent Add Cash action. Quick Add Records is removed; its records remain in the existing state and the separate FAB is unchanged. Scroll padding clears the navigation and FAB.

Daily/Weekly/Monthly use equal-width, 48-point-minimum pills with selected accessibility semantics and invariant borders/padding. Metric values, growth graphic and captions have reserved space independent of period data. Larger system text can grow the pills and stack metric/stock/cash tiles. Loading uses the existing reduced-motion-aware skeleton system, now including pills, ranked thumbnails and activity slots. Empty report copy names the period; stock distinguishes no catalog from no restocking alerts; real zero cash remains ₱0.00.

Recent Activity copies and sorts the combined actual records by full timestamp before limiting the dashboard to five. View All keeps its existing transaction-history destination, which is currently a placeholder: a complete history screen is outside this dashboard task. Credit principal retains its original amount after subsequent payments; product/store debt records are neutral. Cash lent and recorded expenses are outflows, customer payments are inflows, and store debt payments are outflows. These presentation directions do not introduce cash-register posting rules for the record-only ledgers. Sale activity shows applied payment after change, including partial payments, while sales revenue continues to use the full item snapshots. No synthetic activity is generated to fill five rows.

Top Selling Items resolves saved inventory `photoUri` by stable product ID. No bundled product photos exist in the current catalog. Category icons occupy the same 36-point thumbnail space when a photo is absent or fails. The historical dashboard products have category metadata without being merged into the distinct inventory catalog. Rank, name and units remain visible.

Add Cash retains the existing session state, centavo parser, single-use token and success toast. Invalid Add attempts show inline errors which update during correction. Clear requires confirmation for a nonempty field; discard/keep-editing preserves the draft until confirmation. Cash additions update Cash on Hand and Money In once and never change sales revenue. The existing scrollable, keyboard-avoiding modal and focus isolation are preserved.

Changed implementation files:

- `src/components/dashboard/owner-dashboard-screen.tsx`
- `src/components/dashboard/dashboard-cards.tsx`
- `src/components/dashboard/activity-tile.tsx`
- `src/components/dashboard/add-cash-modal.tsx`
- `src/types/dashboard.ts`
- `src/data/dashboard.ts`
- `src/utils/dashboard.ts`
- `src/utils/pos-records.ts`
- `src/i18n/en.ts`
- `tests/auth-validation.test.cjs`
- `tests/pos-checkout.test.cjs`

Documentation: this file and `docs/dashboard-cash-register.md`. No dependencies, native configuration, backend integration or source requirements were changed.

Verification on November 3, 2026:

- `npm run typecheck` and `npm run lint`: passed, with no lint warnings.
- `npm test`: all 92 tests passed. Regression coverage includes zero/three/seven activity records, full timestamp and timezone ordering, unchanged full history, recorded direction/signs, original debt principal, partial-sale collections versus revenue, and cash idempotency.
- Headless Chrome, 320- and 390-pixel phone widths: passed all three periods with identical card, chip, metric and Stock Health positions; empty-period stability; five aligned card edges; missing/failed-photo category fallback; and populated/list screenshots. A controlled browser fixture exercised mixed inflow/outflow/neutral activity and the five-record cap. The separate photo fixture also checked all-in-stock feedback.
- Loading from populated data preserves the dimensions of all five cards, including wrapped product/activity rows. Empty-state previews passed zero cash, no inventory, ranking guidance and no activity; loading never displayed those empty messages. Existing reduced-motion skeleton handling is reused.
- Cash form at 320/360/390/430 pixels: passed blank/zero/malformed submissions, live correction, clear/cancel/confirmed clear, discard/keep-editing, saved balance and Money In, unchanged sales, rapid duplicate clicks, toast, navigation persistence, backdrop dismissal and keyboard Tab isolation while confirming. The 320-pixel form screenshot was visually inspected; this is browser validation, not an on-screen native keyboard test.
- View All still reaches the existing history placeholder. At maximum scroll, the final activity is above the fixed navigation and the FAB has its own clearance. Browser screenshots/scripts/results remain ignored under `.expo/dashboard-*`.

Android runtime: **not tested**. No connected device/emulator or ADB is available in this environment. Native keyboard avoidance, system back, safe areas, TalkBack and system font scaling still require device validation.

iOS runtime: **not tested**. This Windows environment has no iOS simulator/device session. Native keyboard avoidance, safe areas, back gestures, VoiceOver and Dynamic Type still require platform validation. No native build or Android/iOS bundle export was run for this task; shared checks and browser rendering do not establish native runtime behavior.
