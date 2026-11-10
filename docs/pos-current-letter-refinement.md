# Select Products: quantity, current letter, summary amount

This follow-up supersedes the temporary-only index highlight and the 16px quantity/30px summary amount in the earlier POS notes. Read `AGENTS.md`, inspected the current tile/index/summary, and verified the supplied palette's Pure White / Surface Card value (`#FFFFFF`). Existing MA/KH-POS requirements and payment behavior remain unchanged.

Changed files:

- `src/constants/design-tokens.json`: exposes the existing palette's white card surface through the semantic `surfaceCard` key.
- `src/components/pos/product-tile.tsx`: quantity badge uses `surfaceCard` with dark Text Primary numerals. Number size decreases from 16px to 14px. Existing 24px line height, padding, minimum badge size, reserved control area, tile geometry, and selection/press colors are retained.
- `src/components/pos/alphabet-index.tsx`: the current letter has a persistent compact Accent Blue pill and white letter. The same indicator follows index interaction and manual scrolling; other letters stay small and subdued. The existing transient gesture emphasis now affects scale only, respecting reduced motion.
- `src/utils/alphabet-index.ts`: derives the current section from measured section positions and the list's top edge, with the final short section selected at the scroll limit. Empty results clear selection, and unmeasured or stale unrelated offsets cannot select a letter outside the current results.
- `src/components/pos/product-browsing-screen.tsx`: recalculates the current letter on scroll and content/section/viewport layout; resets it on search/category changes. Index navigation keeps the requested letter selected while scrolling to its destination. A small section wrapper keeps measurement callbacks outside render-time ref access. Only the cart summary amount changes to 24px; its existing line height, label/count, text link, sheet, and Cart Review/Payment amounts are preserved.
- `tests/alphabet-index.test.cjs`: adds top-edge, final-short-section, short-list, filter, empty-result, and missing-measurement coverage.

Verification: `npm run typecheck`, `npm run lint`, and the 10 focused alphabet-index/POS tests pass. Tracked edited files pass `git diff --check`. A local development web export also passed.

Headless Chrome checks at 390 × 844 covered the empty amount, single-digit then double-digit quantity, a pressed tile, manual scrolling from A to B and C, persistent highlighting after scrolling stopped, tapping Z at the end, search/category recalculation, clearing no-result searches, dragging to C, and opening Cart Review. Badge measurements remained 34 × 32 for quantities 1 and 10, with centered 14px numerals, white surfaces, dark text, and stable tile bounds. Both empty and populated summary amounts measured 24px. Additional screenshots at 320 × 568 and 414 × 896 showed no horizontal overflow. Application console errors/exceptions: none. Artifacts are ignored under `.expo/pos-current-letter-check/`.

Android runtime: not tested; the existing ADB user-directory permission blocker remains. iOS runtime: not tested; no iOS simulator is available on this Windows host. Browser pointer checks do not establish native finger-gesture, screen-reader, keyboard, or OS text-scaling behavior. No native bundle/build, dependency change, backend work, commit, push, or deployment was performed for this follow-up.
