# Quick Add bottom-sheet follow-up

This presentation update supersedes the centered shell and pill selector in earlier Quick Add layout notes. The supplied Basic / Standard / Premium attachment guides only the selector. Fields, calculations, mock saves, role checks, and draft protection retain their existing implementations.

Read root `AGENTS.md`, package/lockfile/configuration, shared buttons/motion components, the current Quick Add flow, requirements engineering, and workbook MA-QA-001/004/005 and KH-QA-001/003 in the named role sheets before editing. The copy sheet still conflicts with the named owner sheet about Store Debt and shortcut scope. This task explicitly retains all three existing forms; source requirements were not modified.

## Changes

- `src/constants/design-tokens.json`: exposes `color.textPrimary` as **#0C1B3C**, the existing Midnight Navy / Text Primary entry in `docs/designs/Color Pallette (1).png`. No shared primary-button palette is changed.
- `src/components/dashboard/dashboard-quick-add.tsx`: applies that background to the main circular trigger, retaining the white centered icon, current hover/pressed colors, pressure/rotation animation, positioning and expansion/handoff behavior. The three option circles keep their existing colors.
- `src/components/dashboard/quick-add-ui.tsx`: replaces the standalone pills with one softly rounded neutral track and three equal-width, full-segment targets. The active segment is a white tile with a subtle shadow and Midnight Navy label; inactive text uses the existing secondary-text token. Labels stay single-line, use a compact size at narrow widths, and can fit within available width. A labelled tab list exposes names and selected state through native accessibility state and explicit web ARIA attributes.
- `src/components/dashboard/quick-add-modal.tsx`: uses the existing shared `MotionModal` sheet entrance/exit mode, anchors the surface to the bottom, rounds its top corners, adds a decorative handle and retains close/backdrop/Back discard handling. At rest the shell occupies 82% of the available height, capped at 580 points; below 420 points of available space it uses that space fully. This size depends only on the viewport, never the active category or product count. Header, selector and actions remain outside the bounded body scroller. Product/customer/creditor browsing and calendar/confirmation overlays retain their existing flow.
- Footer actions now stack **Save Debt → Clear** or **Save Expense → Clear**, using the existing primary and secondary buttons at equal full width. Their edges align with the fields. The existing keyboard-avoidance container adjusts available space; the footer includes the bottom safe-area inset, while the outer safe-area view leaves the sheet flush with the bottom edge. Native keyboard notifications replace the home-indicator padding with the normal 8-point gap above the keyboard, freeing input space. Calendar and discard overlays also retain bottom safe-area padding.

The handle is a visual affordance; no new drag/swipe dismissal bypasses the existing discard confirmation.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 92 passed, 0 failed.
- Headless Chrome: 53 measured sheet states passed at 320×568, 390×844, 430×932 and 768×1024, plus reduced available heights of 320×288, 390×360 and 430×420. These verify bottom anchoring, equal-width single-line selector labels and selected-state markup, full-width stacked actions aligned to the sheet padding, unchanged sheet/header/footer bounds across categories, Cash/Product, dropdowns, errors and product selection, and no horizontal page overflow.
- Browser interaction checks passed for direct opening to each FAB action, last-field focus/scrolling with both actions still visible, cancelling Clear and discard, cancelling/confirming dirty tab switches, closing a draft through X/Escape, retaining selected products on return, and actual debt/expense saves with success/Done. The required expense-date field remains enforced.
- 23 screenshots were captured, and representative full, small, reduced-height, product, confirmation and success views were visually inspected. The local preview required a Metro cache reset; limiting its worker count allowed the rebuild to finish. No package or configuration changes were made for that recovery.

The browser harness and screenshots are local ignored artifacts under `.expo/quick-add-sheet-check.cjs` and `.expo/quick-add-sheet-review/`, including `measurements.json`. No native builds or platform bundle exports were run for this presentation update.

Android runtime: **not tested**; no device/emulator or ADB was available. iOS runtime: **not tested**; no connected device or simulator was available in this Windows environment. Browser viewport reductions simulate available keyboard space and do not validate native keyboard behavior, safe-area rendering, OS text scaling, TalkBack/VoiceOver, or Android hardware Back.
