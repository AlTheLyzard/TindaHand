/** BACKEND-INTEGRATION: INVENTORY_RULES
 * Replace these frontend defaults with store-scoped backend settings here.
 * Stock/expiry selectors live in utils/inventory-stock.ts; inventory.ts composes
 * them for summaries and filters. Stock is the sum of ALL remaining batch units,
 * including expired stock, preserving existing POS availability and cost × stock
 * valuation. Expiry is evaluated per nonempty, dated batch, independently of stock.
 * Preserve the existing 1–2 critical tier internally; the three-status UI groups
 * it under Low Stock (1–5). Change thresholds here, never in individual screens.
 * Asia/Manila is the existing business timezone. Compare YYYY-MM-DD calendar
 * dates; UTC is used only for calendar-day arithmetic, never to localize expiry.
 * Nearing expiry includes today through today + 30 days, excluding expired,
 * undated and depleted batches. Backend settings must keep these consumers aligned.
 */
export const inventoryRules = {
  lowStock: 5,
  criticalStock: 2,
  expiryDays: 30,
  maxStock: 1_000_000,
  timeZone: 'Asia/Manila',
} as const;
