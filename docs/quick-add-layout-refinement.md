# Quick Add layout refinement

This presentation-only follow-up supersedes the per-form dimensions and outer scrolling described in `quick-add-visual-refinement.md`. Colors, Poppins typography, fields, validation, dirty-draft confirmations, product selection, and save logic are retained.

## Requirements reviewed

Read `AGENTS.md`, the requirements engineering document, and the source workbook's named MAY-ARI MODULE (MA-QA-001, MA-QA-004, MA-QA-005) and KAHERA MODULE (KH-QA-001, KH-QA-003) before editing. The copy sheet proposes removing Store Debt and emphasizes product borrowing; the named owner sheet includes Store Debt and debt amounts/details. These existing conflicts remain unresolved. This request explicitly retains all three current owner categories and both borrowing types; role access and transaction behavior are unchanged. The original requirements files remain unchanged.

## Changed files

- `src/components/dashboard/quick-add-ui.tsx`: chips use intrinsic label widths plus equal growth, consistent 6-point horizontal/7-point vertical padding, 8-point gaps, centered single-line labels, and minimum 48-point touch targets. All three labels fit together at tested normal-text phone widths. A horizontal scroller accommodates enlarged text without shrinking fonts or truncating labels.
- `src/components/dashboard/quick-add-modal.tsx`: all categories, Cash/Product, and success states share one card, at most 412 points wide and 750 points high, centered in the available safe-area/keyboard-adjusted space with 8-point outer clearance. Its explicit height follows that available space rather than form content. Header/chips/footer stay outside the bounded form scroller. Descriptions reserve two lines so category descriptions cannot move the chips at normal text size. Below 420 points of available height, every category hides its subtitle to free space for inputs. Shared inputs retain their component identity when borrowing type changes.
- `docs/quick-add-layout-refinement.md`: records scope, checks, and platform limitations.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `node --test tests/quick-add.test.cjs`: 5 passed, 0 failed; existing validation, dates, exact money, snapshots, dirty state, authorization failure/retry, and duplicate-save checks.
- Headless Chrome: 88 measured layout states at 320×568, 360×640, 390×844, 430×932, and 768×1024, plus reduced heights of 288, 360, 564, 612, and 704 respectively. Reduced heights simulate available keyboard space; they do **not** open an Android/iOS keyboard.
- Across those full/reduced viewports: all category labels fit on one line, with consistent pill heights, centered text, minimum 48-point touch targets, and no horizontal page overflow. Category and Cash/Product switching preserve card/header/footer bounds. Opening the expense dropdown/details, displaying errors, focusing/scrolling to the amount input, and selecting a product preserve container dimensions. Footer actions remain visible without scrolling the form.
- All three categories successfully saved actual entered amounts through the fixed footer, with Clear/Keep Editing confirmation and success/Done behavior checked. Browser-only doubled chip text remains on one line and scrolls horizontally. Small, large, selected-product, and enlarged-chip screenshots were visually inspected.
- Ignored local artifacts: `.expo/quick-add-layout-check.cjs`, `.expo/quick-add-layout-review/measurements.json`, and screenshots in that directory. No dependencies, native configuration, requirements sources, or business logic changed.

Android runtime: **not tested**; no connected device/emulator or ADB is available. Native keyboard open/close, focus scrolling, system back, safe areas, OS text scaling, and TalkBack remain device checks.

iOS runtime: **not tested**; no connected iOS device or simulator is available in this Windows environment. Native keyboard open/close, focus scrolling, safe areas, OS text scaling, and VoiceOver remain device checks.

Shared lint/typecheck, domain tests, browser layout, and web bundling do not establish native runtime success. No Android/iOS platform exports or native builds were run for this refinement.
