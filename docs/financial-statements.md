# Financial Statements

Implemented November 9, 2026 for Android and iOS using shared Expo Router screens. Visual sources: `docs/designs/General Journal.png`, `General Ledger.png`, `Income Statement.png`, and `Balance Sheet.png`. The decorative store strip is cropped from the supplied Journal landing frame; report icons follow the supplied document, book, bar-chart, and pie-chart outlines. Device status/gesture chrome is excluded.

## Requirements and scope

The source workbook in `docs/requirements/` was read directly, including MAY-ARI MODULE row 115 (MA-MT-001), KAHERA MODULE restrictions, and Copy of MAY-ARI MODULE row 115. The named owner sheet requires the four reports from saved transactions, excludes unsaved records, and lists PDF and JPG/JPEG downloads. This task implements PDF only, as explicitly requested. JPG/JPEG remains a source-requirement follow-up. The copy has identical Financial Statements acceptance criteria and an unrelated Profile remark; it is not merged into this feature. Original documents remain unchanged. The October 17 cross-platform scope decision supersedes original Android-only wording.

The designs contain inconsistent periods, sample numbers, blank totals, copied modal titles, Tagalog labels, Balance Sheet button order, and active navigation. These are corrected as requested. Four report cards lead to individual routes, the landing page keeps More active, report pages omit bottom navigation, and report Back dismisses to the landing page. Nested route guards and the repository require an owner identity. These are frontend simulation checks, not production authorization.

## Data and calculations

`src/data/financial.ts` is one fictional **posted accounting book**, separate from editable operational demo state. Dates run from September 1 through November 9, 2026. The screen discloses demo records. No unposted POS cart, expense draft, receivable draft, or payable draft can enter a report. Existing operational fixtures do not contain enough accounting information to safely derive a complete posted book, so their amounts are not silently treated as accounting entries.

Every entry has a stable ID, store calendar date, description, and integer-centavo debit/credit lines. Accounts include Cash, Accounts Receivable, Merchandise Inventory, Equipment & Fixtures, Accounts Payable, Capital, Sales, Cost of Goods Sold, and two operating expense accounts. `calculateFinancialReport` derives all four reports from those entries without mutating seed data.

- Journal: chronological transaction groups, credit indentation, daily/overall totals, computed equality check.
- Ledger: every account, signed debit-positive opening balance from before the range, dated period activity, running balances, totals, ending Dr/Cr balance, account-specific normal-side explanation. Zero-activity accounts retain opening balances.
- Income Statement: period revenue, COGS, gross profit, expense breakdown, total expenses, profit/loss. Negative results use error colors.
- Balance Sheet: cumulative current/non-current assets, liabilities, capital, and accumulated earnings through one As of Date. Cumulative unclosed revenue less costs/expenses is included exactly once in equity; selected-period profit is never added again.

Reconciliation examples: October sales ₱10,500.00 less COGS ₱6,300.00 and expenses ₱1,550.00 give net profit ₱2,650.00. At October 31, assets and liabilities/equity both equal ₱47,650.00. Accumulated earnings are ₱4,650.00, including ₱2,000.00 from September. At November 9, both balance-sheet totals equal ₱48,840.00. These values are derived, not display constants.

## Filters and states

The business timezone is Asia/Manila, independent of device timezone. Calendar arithmetic uses date components; timestamps are explicitly formatted in Manila. Range reports use inclusive From/To, Monday week starts, and month-to-date presets. Balance Sheet uses Today, Yesterday, or one custom date. The inline Monday-first calendar includes month navigation, endpoints, and range fill. Custom fields accept `YYYY-MM-DD` while editing and display English formatted dates otherwise.

Draft edits/presets never change visible results or export data. Apply validates and retrieves a new applied snapshot; pending text and the applied card show the distinction. Same-day ranges work. Invalid dates/reversed ranges show field highlighting and an inline message, and disable Apply. Reset immediately applies Today and clears errors. Refresh retrieves the same applied selection and preserves draft edits. Async responses from obsolete requests are ignored. Loading, failure/retry, no-period-activity, export failure/retry, and cancellation states are provided.

Tables scroll horizontally only when the available width or text size cannot contain the complete amounts. Numeric cells are right-aligned with tabular numerals. Statement rows can stack labels/amounts at larger text sizes. Report content scrolls vertically; tall designs are not scaled down. Shared buttons, chips, modal motion, fonts, safe areas, header actions, and bottom navigation are reused. New user-facing copy is registered in the existing English catalog through `financial-en.ts`.

## PDF export

`financialReportHtml` renders the applied snapshot with store name, correct report title, dates, generation time in PHT, complete rows and totals. User/source text is HTML-escaped. A4 print styles permit multiple pages, repeat table headers, avoid splitting ordinary rows, and impose no clipping heights. Native `exportFinancialPdf` uses SDK 58-compatible `expo-print`, `expo-file-system`, and `expo-sharing`. It generates a real PDF, moves it into a per-export cache directory using a meaningful report/date filename, then opens the native save/share sheet. No storage permission or incoming-share extension is needed. New native modules require a development build if absent from the installed client.

The modal has dynamic report naming, Download, Cancel, and close controls. Export captures the applied result even when draft dates differ, with a fresh generation timestamp. A synchronous ref lock plus disabled controls prevents duplicate actions. Errors retain the dialog for retry. Cancel/close before generation explicitly cancels. Generation cannot be aborted halfway, so dialog actions are disabled while it runs. Expo Sharing returns `void` after closing and cannot distinguish a save/share from native-sheet cancellation; feedback confirms generation and sheet closure only, never a saved/downloaded file. Cached PDFs are left for OS cache eviction so receiving apps can still read them.

Web fallback opens the same complete HTML in a dedicated print window and offers the browser's Save as PDF. It does not print the app UI or claim the user saved a file. Popup-blocked failures are handled by the export modal.

## Proposed backend integration (no live endpoints)

No existing Financial Statements HTTP contract was found. `FinancialRepository` in `src/types/financial.ts` is a **proposed local boundary**, implemented by `createFinancialRepository`:

```ts
getStatus(owner): Promise<{ updatedAt: string; storeName: string }>
getReport(owner, kind, { preset, from, to }): Promise<FinancialReport>
```

The UI reads only this service. A future authenticated adapter can replace it without moving data access into routes. Do not send the local owner object as authentication. The server must resolve the authenticated store, enforce owner capability, validate dates, and provide one consistent posting revision/snapshot for rows and aggregates. Prefer explicit query dates over trusting client presets. The result needs authoritative store name/timezone, generation/source-update timestamps, journal/ledger rows, opening balances, expense categories, accumulated earnings, subtotals, and reconciliation values. Date-only values and centavos must preserve current semantics. Agree complete-report retrieval versus pagination and server-side export for large books; a PDF must never export only a visible page.

Before linking live Node.js/MySQL APIs, decide posting/correction/void rules; historical cost-of-sales and stock valuation; cash vs GCash clearing accounts; operational-record linkage/idempotency; receivable/payable settlement postings; expense funding source; opening inventory/assets/liabilities/capital; drawings and retained-earnings closing entries; fiscal-year treatment; and accounting timezone policy. This fixture has no closing/drawing entries. Once earnings are closed into a retained-earnings equity account, the server must add only unclosed income to that stored equity balance. No backend, database schema, real authentication, or live endpoint is introduced here.

## Validation

Executed shared checks: `npm run typecheck`, `npm run lint`, and `npm test` all passed (120 tests, including 13 focused Financial Statements tests). `EXPO_OFFLINE=1 npx expo install --check` reported dependencies up to date, with Expo's warning that offline dependency validation is unreliable; no online Expo Doctor diagnosis is claimed.

Focused tests cover inclusive/same-day filtering, Manila midnight and Monday/week/year boundaries, invalid ranges and dates, independent draft/applied state, reset and refresh semantics, daily/overall journal equality, reconciliation across statements, opening/running/ending debit and credit balances, cumulative earnings without double counting, losses, empty periods, deliberate imbalances, owner access, source immutability, complete/escaped PDF content, large amounts and long names, and native exporter payload/filename/handoff/failure behavior with mocked Expo modules.

Headless Chrome checks at 320, 390, and 430 px passed: direct-route owner gate, More Tools navigation, More active on landing, hidden report navigation, all accounts, custom ranges and calendar display, applied results unchanged during drafts, validation/disabled Apply, immediate Reset, refresh preservation, calculated figures, loss styling, correct per-report confirmation titles, cancellation, export failure/retry, and duplicate-action prevention. An export from a loss period while 2030 dates were pending contained only the applied October dates and loss. Browser runs recorded no JavaScript exceptions. Screenshots were compared with all four supplied references, including report content and bottom summaries. Ledger sizing was adjusted after review to keep ordinary amounts visible at 390 px; narrower/wider-value tables retain horizontal scrolling.

Actual browser PDF generation produced Journal (3 pages), Ledger (4), Income Statement (1), and Balance Sheet (2); a 120-transaction journal produced 14 pages. This validates the shared HTML through Chromium printing, not Expo's native print engines. The native exporter was tested with mocked Expo modules; a real Android/iOS save/share sheet was not exercised.

Android and iOS Hermes bundle exports passed separately through `npx expo export --platform android --platform ios`. These are JavaScript bundles, not native builds. No native build was run. Android runtime: **not tested**, no connected device/emulator or ADB available. iOS runtime: **not tested**, this Windows environment has no iOS simulator. Native safe areas, accessibility text sizes, keyboard behavior, screen readers, gestures/back navigation, and print/share behavior still require checks on each platform.

Browser screenshots, generated PDFs, results and local scripts are retained in ignored `.expo/financial-check/`; final native bundle outputs in `.expo/financial-native-export-final/`.

## Changed files

- Routes: `src/app/owner-menu/financial-statements/{_layout,index,general-journal,general-ledger,income-statement,balance-sheet}.tsx`; compatibility redirect added to existing `src/app/owner-menu/[tool].tsx`.
- UI: `src/components/financial/{financial-frame,financial-landing-screen,financial-report-screen,report-filters,report-calendar,report-content}.tsx`.
- State/data boundary: `src/hooks/use-financial-report.ts`, `src/types/financial.ts`, `src/data/financial.ts`, `src/services/financial.ts`, `src/utils/financial.ts`.
- Export: `src/utils/financial-pdf.ts`, `src/services/financial-export.ts`, `src/services/financial-export.web.ts`.
- Copy/assets: `src/i18n/financial-en.ts`, its spread in existing `src/i18n/en.ts`, `assets/images/financial/`; removed the obsolete unavailable notice from `src/data/menu.ts`.
- Dependencies: `package.json` and `package-lock.json` add SDK-compatible Expo print/sharing and a direct file-system dependency. Expo Sharing's required config-plugin dependency resolves a compatible patch. No native project/configuration was created or changed.
- Tests/handoff: `tests/financial.test.cjs` and this document. Existing unrelated workspace edits and original source requirements are preserved.
