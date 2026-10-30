# Quick Add visual correction

Visual references: `docs/designs/Quick Add 1.png` through `Quick Add 5.png`. All five originals were opened, then their **48 individual frames** were inspected in readable groups. The reference sheets contain repeated states and Account Balances destinations, as well as the Quick Add flow.

## Changes

- `src/components/dashboard/dashboard-quick-add.tsx`: 56-point navy FAB, 48-point blue icon circles, 32-point adjacent white labels, regular 12-point type, 12-point row spacing, reference shadows and centered SVG plus/close. Retains measured positioning above the existing navigation and its safe-area clearance.
- `src/components/dashboard/quick-add-modal.tsx`: reference modal widths, 24-point corners, padding, placement, blue-gray backdrop, evenly stretched raised chips, spaced radio buttons, field grouping, total cards, narrower Clear button, success layout and compact confirmation presentation. Customer validation retains its reserved footer space. Existing validation rules, dirty checks, shared saves, duplicate prevention and financial/inventory boundaries remain unchanged.
- `src/components/dashboard/quick-add-ui.tsx`: scoped field/chip styles, Poppins semibold labels, pale red error surfaces, blue focus outlines, soft field shadows, calendar affordances, and formatted date/money display. Inputs retain their original editable values beneath a noninteractive display layer, preserving text selection, exact centavos and date-only drafts. Date editing remains a labelled text input; no native picker dependency was added.
- `src/components/pos/credit-product-selector.tsx`: compact horizontal blue product rows, name/price snapshots, raised blue quantity controls, trash icons and full-width Add Product button. Larger native text scales move controls beneath the item text.
- `src/components/pos/credit-product-browser.tsx`: the pictured full-screen New Customer Debt presentation **inside the same modal**, with brand header, back arrow, customer field, alphabetical two-column product grid, availability badges, Cancel/Review Debt footer and decorative noninteractive navigation. Reuses POS filtering, selection, totals, icons and alphabetical-index components. Search expands from the product-header search icon. The decorative navigation hides on native keyboard notifications, following the existing POS pattern. Back, Cancel and Review Debt return to the retained draft; selections do not write stock or the POS cart.
- `src/components/ui/button.tsx` and `confirmation-content.tsx`: opt-in Quick Add appearances; existing default appearances remain intact. Primary buttons retain visible pressed feedback and loading/disabled behavior. Confirmations retain full touch targets around the smaller pictured button surfaces.
- `src/components/pos/pos-icon.tsx`: calendar already existed; adds the needed chevrons, back and check geometry.
- `src/app/_layout.tsx`: loads the existing installed Poppins 600 asset alongside 400 and 700; no dependency or build-configuration changes.

The original functional implementation and provisional requirements remain documented in `quick-add-implementation.md`. This visual correction does not resolve new business rules or add Account Balances routes.

## Visual validation

Headless Chrome rendered the app using the existing development mock owner flow. Captured **38 representative states at 412 × 917**, plus **9 responsive views at 320 × 568, 390 × 844 and 430 × 932**. Screenshots cover collapsed/expanded FAB, cash empty/focused/errors/filled/custom date, product empty/errors/selection/search/selected rows/quantities/removal/clear/discard, Store Debt empty/focused/errors/filled, expense empty/category errors/open and selected dropdown/amount errors/filled, all success variants, confirmation dialogs, and the Select Products pressed state.

The screenshots were opened and visually compared against the corresponding reference frames; corrections included semibold weights, field heights, button proportions/shadows, date selection behavior and an empty-text rendering warning. The final interaction run checks console errors as well as exceptions.

At the reference viewport, measured rectangles include:

| State | Implemented width × height | Reference comparison |
| --- | --- | --- |
| Customer cash | 396 × 670 | Matches reference size and approximately 71-point top position; validation does not resize it |
| Success | 396 × 488 | Matches reference size and centered placement |
| Expense closed dropdown | 396 × 522 | Matches reference size and centered placement |
| Store Debt | approximately 396 × 619 | Within a few points of the principal reference frame |
| Two selected products | approximately 396 × 769 | About 19 points taller than the principal 750-point reference frame |
| Expense open dropdown | approximately 396 × 591 | Taller than reference to keep each option a 48-point target |

Artifacts are local and ignored by Git:

- `.expo/quick-add-reference-review/`: readable crops of all supplied reference frames.
- `.expo/quick-add-visual-review/`: screenshots and `measurements.json`.
- `.expo/quick-add-visual-review.cjs`: capture and interaction regression script.

Checks: `npm run typecheck`, `npm run lint`, and `node --test tests/*.test.cjs` (47 tests). Browser regressions cover actual saved amounts/names, field corrections, selection/quantity totals, draft retention across the product browser, search, removal/clear/discard confirmations, custom dates, display-only money formatting, footer scrolling, no horizontal page overflow, and pressed feedback.

## Remaining differences and verification limits

- English copy, dynamic dates/amounts/names and Done success buttons remain intentional. Confirmation copy also preserves the approved draft-protection behavior; a decrement from one confirms removal while retaining quantity one until confirmed, rather than displaying an uncommitted zero row.
- Dropdown options and other controls retain accessible touch targets. This increases the open dropdown and selected-product form height. Small screens scroll rather than scaling down text or truncating controls.
- The existing optional expense-details field is available through an additional text action, absent from the reference. It expands without discarding entered information.
- The product browser uses the existing live demo catalog (13 products), rather than replacing it with the reference's six products. It retains search, adds a selected-total announcement and uses the existing accessible alphabetical index, whose targets are larger than the tiny reference index. Navigation in this modal is decorative and disabled as required.
- The surrounding Dashboard and its existing navigation were not redesigned. Device status/home bars from the references were not copied; absolute placement varies with safe areas and available height.
- Save-failure visuals were not forced in this browser review. Existing domain tests exercise failed-save retry and draft immutability. Account Balances frames remain unimplemented and outside this visual correction.
- **Android runtime: not tested.** No Android device/emulator or ADB was available. Native keyboard, Android Back, font scaling, TalkBack and shadow rendering remain device checks.
- **iOS runtime: not tested.** No iOS device/simulator was available in this Windows environment. Native keyboard, safe areas, VoiceOver and native modal handoff remain device checks.
- Browser dimensions, focus and scrolling do not validate native keyboard behavior or OS accessibility text scaling. No native builds or new platform bundle exports were run for this visual correction.
