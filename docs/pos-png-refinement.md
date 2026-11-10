# POS PNG refinement

Refined the existing frontend POS flow against `docs/designs/MA-POS-001.png`, `MA-POS-003.png`, `MA-POS-004.png`, and `Back validation.png`. No dependencies, backend integrations, native configuration, or source requirements were changed.

## Reference measurements and requirements

Opened the original PNGs (17,732 × 7,824; 20,780 × 6,888; 23,828 × 13,724; and 2,313 × 1,638) and cropped individual phone frames at their original resolution before making 414-pixel-wide inspection copies. The first, far-left MA-POS-001 phone is the layout baseline throughout the flow.

At a 414-pixel frame width, the baseline has approximately 43 pixels from the white header's bottom divider to the visible title glyphs, a 21-pixel content gutter, and 20 pixels from the title glyphs to the step indicator. The shared layout uses 30 pixels of top padding plus Poppins' glyph offset, a 32/48 title font/line height, and an 8-pixel margin before the indicator. These values scale with the safe content width, capped at the existing 460-pixel page width. `PosFrame` applies the top safe area once. Browser layout measurements confirm identical title positions in Select Products, Cart Review, and Payment at the same width.

Tiles measure approximately 179 × 217 pixels in the reference, with a 12-pixel column gap. The cart sheet has a 12-pixel side inset, rounded upper corners, a thin outline, and approximately 113 pixels of height at this width. It sits directly above the navigation bar, with a separate list viewport so the sheet never covers the last scrollable row. The empty sheet retains its blue View Cart button; the empty Cart Review still disables Checkout.

Read `AGENTS.md`, the source requirements README, and MA/KH-POS-001–004 and MA/KH-AR-001–004 from the named MAY-ARI and KAHERA workbook sheets. Inspected Copy of MAY-ARI MODULE separately. Its stock/removal/clear notes, partial-debt label, receipt remarks, and item-allocation questions were not silently treated as additional requirements. The baseline owner payment story lists Cash/GCash; this request explicitly preserves all four existing methods. The references contain inconsistent prices, stock labels, totals, title placement, and language. Existing catalog values, calculated centavo totals, English UI copy, payment validation, and the first frame's title spacing remain authoritative. The live shared catalog has 13 products rather than the reference's six.

Checked SDK 58 documentation before using Expo/React Native APIs: [SDK reference](https://docs.expo.dev/versions/v58.0.0/), [documentation index](https://docs.expo.dev/llms.txt), [Router](https://docs.expo.dev/versions/v58.0.0/sdk/router/), [safe areas](https://docs.expo.dev/versions/v58.0.0/sdk/safe-area-context/), [Pressable](https://reactnative.dev/docs/pressable), and [window dimensions](https://reactnative.dev/docs/usewindowdimensions).

## Changed files

- `src/components/pos/pos-metrics.ts`: shared measurements scaled from the first reference phone.
- `src/components/pos/pos-frame.tsx`: consistent title/step spacing and gutters; navigation on Select Products and Cart Review; safe area remains owned by the frame.
- `src/components/pos/product-browsing-screen.tsx`: reference ordering and grid width, category spacing, overlay suggestions, stable reset placement, inset cart sheet, and accessible empty-cart viewing. Development preview controls move below the main content.
- `src/components/pos/product-tile.tsx`: stable image/name/control allocation, tile proportions, regular product names, blue prices, stock badges, temporary pressed fill, white selected tiles with Accent Blue outlines, and stock-limited quantities. Small-width/larger-text layouts reserve additional name space consistently.
- `src/components/pos/alphabet-index.tsx`: narrow edge rail to preserve tile widths.
- `src/components/pos/pos-chip.tsx`: pale-blue category/payment pills, full-height press targets, radio semantics, and distinct pressed/selected states using existing tokens.
- `src/components/pos/cart-review-screen.tsx`: aligned content, white cards, red removal controls, circular quantity buttons, calculated totals, equal-width actions, and the Discard Changes confirmation for Empty Cart.
- `src/components/pos/payment-screen.tsx`: shared gutters, one-row method chips, mode-specific balance/change panels, action spacing, and Discard Changes/Keep Editing for Cancel Order. Existing payment rules and English labels are retained.
- `src/components/pos/payment-customer-field.tsx`: existing-customer suggestions overlay the form only while the customer input is focused.
- `src/components/pos/pos-dialog.tsx`: dimmed backdrop, centered white surface, warning/info mark, divider, close icon, and stacked full-width confirm/cancel buttons.
- `src/state/pos.tsx`: associates successful Partial Payment feedback with its saved debt ID and consumes the redirect once. The existing atomic sale/debt/initial-payment commit remains unchanged.
- `src/components/pos/payment-preview-toast.tsx`: displays feedback on the focused POS screen and opens Accounts Receivable/Unpaid when the success toast expires or is dismissed, only for Partial Payment.
- `src/components/receivables/receivable-overview-screen.tsx`: clears stale search and resets scroll on POS arrival; moves the new sale's group and record first without merging debts or changing the total calculation.
- `tests/pos-checkout.test.cjs`: exact ₱100 sale / ₱40 paid / ₱60 outstanding regression for typed and selected customers, duplicate-confirm rejection, separate later sales, and receivable summary updates.
- `docs/pos-png-refinement.md`: this implementation and validation record.

Normal navigation preserves the session draft, so it does not discard unsaved changes or require a discard warning. Empty Cart and Cancel Order explicitly confirm destructive clearing. Keep Editing, Close, and cancelling checkout leave the draft intact.

## Verification

Shared checks passed: `npm run typecheck`, `npm run lint`, `npm test` (101 tests), and `git diff --check` on the edited tracked source/test files. The focused POS/payment/receivables run also passed all 26 tests.

Browser validation used headless Chrome and a local development web export with the existing opt-in fictional Owner session. Export-only environment flags were `EXPO_PUBLIC_ENABLE_MOCK_AUTH=true`, `EXPO_NO_BUNDLE_SPLITTING=1`, and `EXPO_NO_METRO_LAZY=1`; no environment file or configuration was changed. Inspected Select Products at 414 × 1,380, 390 × 844, and 320 × 568, and compared the 414-pixel screen side by side with the leftmost reference phone after excluding its drawn status bar. Checked tile/image/badge/quantity positions, header/title/indicator spacing, category pills, sheet alignment, and pressed/selected/stock-limit states. Extra catalog rows and calculated prices intentionally differ from the six-product artwork.

Visually checked Cart Review, Cash, GCash, Split Payment, Partial Payment, trash/zero-quantity removal, Discard Changes, checkout confirmation, the POS success toast, and Accounts Receivable arrival. Partial Payment includes the existing required Cash/GCash choice and customer guidance, making it taller than the reference's simpler form. Checked its reachable footer and lack of horizontal overflow at 414, 390, and 320 pixels. Font fallbacks, native soft keyboards, and OS text scaling still require device validation.

Browser interaction checks passed for pressed fill reverting to white with a blue outline; stable tile geometry across selection and stock limit; disabled zero-stock taps; overlay search suggestions; scrolling to the final category; alphabetical jumps; scrolling the last row fully above the sheet; quantity/removal confirmations; draft preservation across navigation; Close/Keep Editing/cancelled checkout; and disabled empty Checkout. Browser runs reported no application console errors or exceptions.

The exact May Kulang case used 2 × Argentina Corned Beef (₱32), Bear Brand Milk Powder (₱13), and Brown Sugar (₱23), for a ₱100 sale. Entered a new customer and ₱40 Cash. Twenty rapid Confirm clicks produced one sale and one receivable. The success toast appeared on POS, remained until its real 15-second timeout, then automatically opened Receivable/Unpaid with the new customer's ₱60 remaining record visible. Total Amount to Collect increased from ₱5,750 to ₱5,810. Repeated the scenario using that selected customer with GCash and a reference: it created a separate second ₱60 record and raised the total to ₱5,870. A deliberately stale receivables search was cleared on arrival. Cash, GCash, and Split Payment checkouts remained in POS after success; Cash was also checked after the actual toast timeout.

Artifacts are ignored under `.expo/pos-png-check/` (screenshots, side-by-side comparison, scripts, and result JSON), `.expo/pos-png-refs/` (original-resolution crops and inspection copies), `.expo/pos-png-web/`, and `.expo/pos-png-native/`.

Android: JavaScript bundle compilation passed via `npx expo export --platform android --platform ios --output-dir .expo/pos-png-native --no-bytecode --max-workers 2`. Native build and runtime were **not tested**. The installed ADB failed before device enumeration with `Cannot mkdir '\.android': Permission denied`; setting a workspace-local `ANDROID_USER_HOME` and separate server port did not resolve it. No connected-device status can be inferred from that failed check.

iOS: JavaScript bundle compilation passed with the same export. Native build and runtime were **not tested** because this Windows environment has no iOS simulator. Neither bundle export is a signed native build, Hermes bytecode validation, or native runtime test.

Android system back, iOS back gestures, native safe areas, keyboard avoidance/focus/dismissal, TalkBack/VoiceOver, font fallback, and larger accessibility text remain pending on both platforms. All records remain frontend mock session state. Nothing was committed, pushed, deployed, or published.
