/**
 * Offline-first journal posting.
 *
 * Converts local in-memory state (POS sales, quick-add records, cash additions,
 * payable payments, receivable payments) into double-entry JournalEntry records
 * using the same account IDs defined in src/data/financial.ts.
 *
 * Account map (matches financial seed):
 *   cash          – Cash on hand / GCash received
 *   receivables   – Accounts Receivable (customer credit)
 *   inventory     – Merchandise Inventory (cost basis)
 *   equipment     – Store Equipment & Fixtures
 *   payables      – Accounts Payable (store debt)
 *   capital       – Owner's Capital
 *   sales         – Sales Revenue
 *   cogs          – Cost of Goods Sold
 *   utilities     – Store Electricity & Water
 *   transport     – Supplier Transportation
 *   expense       – General Operating Expense (catch-all for uncategorised expenses)
 */

import type { JournalEntry, JournalLine } from '@/types/financial';
import type { LocalSale } from '@/types/pos';
import type { QuickAddRecord } from '@/types/quick-add';
import type { ReceivablePayment } from '@/types/receivables';
import type { PayablePayment } from '@/types/payables';
import type { InventoryProduct } from '@/types/inventory';

/** Map a quick-add expense category to the nearest chart-of-accounts ID. */
function expenseAccountId(category: string | null): string {
  const cat = (category ?? '').toLowerCase();
  if (cat.includes('electric') || cat.includes('water') || cat.includes('util')) return 'utilities';
  if (cat.includes('transport') || cat.includes('delivery') || cat.includes('freight')) return 'transport';
  return 'expense';
}

/** Derive YYYY-MM-DD date string in Manila timezone from an ISO timestamp. */
function manilaDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function lines(...pairs: [accountId: string, debit: number, credit: number][]): JournalLine[] {
  return pairs.map(([accountId, debit, credit]) => ({ accountId, debit, credit }));
}

/**
 * Post journal entries for a completed POS sale.
 *
 * Rules:
 *  - Cash / GCash received → Debit Cash
 *  - Remaining balance on credit → Debit Accounts Receivable
 *  - Revenue → Credit Sales (full sale amount)
 *  - Cost of goods → Debit COGS, Credit Inventory (at cost)
 */
export function postSaleEntries(
  sale: LocalSale,
  products: readonly InventoryProduct[],
): JournalEntry[] {
  const date = manilaDate(sale.occurredAt);
  const entries: JournalEntry[] = [];

  const cashReceived = sale.payment.tenders.reduce((sum, t) => sum + t.receivedCentavos, 0) - sale.payment.cashChangeCentavos;
  const applied = sale.payment.appliedCentavos;
  const remaining = sale.remainingCentavos;

  // Revenue entry
  const revenueLines: JournalLine[] = [];
  if (cashReceived > 0) revenueLines.push({ accountId: 'cash', debit: cashReceived, credit: 0 });
  if (remaining > 0) revenueLines.push({ accountId: 'receivables', debit: remaining, credit: 0 });
  revenueLines.push({ accountId: 'sales', debit: 0, credit: applied + remaining });

  entries.push({
    id: `local-sale-${sale.id}`,
    date,
    description: `POS Sale #${sale.id.slice(-8)}`,
    lines: revenueLines,
  });

  // COGS entry — compute cost from product catalog
  const costCentavos = Object.values(sale.items).reduce((sum, line) => {
    const product = products.find(p => p.id === line.productId);
    const cost = product?.costCentavos ?? 0;
    return sum + cost * line.quantity;
  }, 0);

  if (costCentavos > 0) {
    entries.push({
      id: `local-cogs-${sale.id}`,
      date,
      description: `Cost of sale #${sale.id.slice(-8)}`,
      lines: lines(
        ['cogs', costCentavos, 0],
        ['inventory', 0, costCentavos],
      ),
    });
  }

  return entries;
}

/**
 * Post a journal entry for a quick-add record.
 *
 * - expense              → Debit Expense account, Credit Cash
 * - customerDebt/cash    → Debit Accounts Receivable (cash lent), Credit Cash
 * - customerDebt/product → already captured in sale entry; skip (saleId present)
 * - storeDebt            → Debit Inventory/Expense, Credit Accounts Payable
 * - asset                → Debit Equipment, Credit Cash
 */
export function postQuickAddEntry(record: QuickAddRecord): JournalEntry | null {
  // Customer debts arising from a POS sale are already posted by postSaleEntries
  if (record.saleId) return null;

  const date = manilaDate(record.occurredAt);
  const amount = record.amountCentavos;

  if (record.kind === 'expense') {
    const debitAccount = expenseAccountId(record.category);
    return {
      id: `local-expense-${record.id}`,
      date,
      description: `Expense – ${record.name}`,
      lines: lines([debitAccount, amount, 0], ['cash', 0, amount]),
    };
  }

  if (record.kind === 'customerDebt' && record.borrowing === 'cash') {
    return {
      id: `local-cashdebt-${record.id}`,
      date,
      description: `Cash lent – ${record.name}`,
      lines: lines(['receivables', amount, 0], ['cash', 0, amount]),
    };
  }

  if (record.kind === 'storeDebt') {
    // Treat store debt as inventory restock on credit
    return {
      id: `local-storedebt-${record.id}`,
      date,
      description: `Store debt – ${record.name}`,
      lines: lines(['inventory', amount, 0], ['payables', 0, amount]),
    };
  }

  if (record.kind === 'asset') {
    return {
      id: `local-asset-${record.id}`,
      date,
      description: `Asset purchased – ${record.name}`,
      lines: lines(['equipment', amount, 0], ['cash', 0, amount]),
    };
  }

  return null;
}

/**
 * Post a journal entry for a customer debt payment received.
 *   Debit Cash, Credit Accounts Receivable
 */
export function postReceivablePaymentEntry(payment: ReceivablePayment): JournalEntry {
  const date = manilaDate(payment.occurredAt);
  return {
    id: `local-recv-${payment.id}`,
    date,
    description: `Customer payment received`,
    lines: lines(['cash', payment.amountCentavos, 0], ['receivables', 0, payment.amountCentavos]),
  };
}

/**
 * Post a journal entry for a payable payment (store debt repaid).
 *   Debit Accounts Payable, Credit Cash
 */
export function postPayablePaymentEntry(payment: PayablePayment): JournalEntry {
  const date = manilaDate(payment.occurredAt);
  return {
    id: `local-payable-${payment.id}`,
    date,
    description: `Store debt payment`,
    lines: lines(['payables', payment.amountCentavos, 0], ['cash', 0, payment.amountCentavos]),
  };
}

/**
 * Post a journal entry for cash manually added to the register.
 *   Debit Cash, Credit Capital (owner injection / opening cash)
 */
export function postCashAddedEntry(amountCentavos: number, occurredAt: string): JournalEntry {
  return {
    id: `local-cashadd-${occurredAt}`,
    date: manilaDate(occurredAt),
    description: `Cash added to register`,
    lines: lines(['cash', amountCentavos, 0], ['capital', 0, amountCentavos]),
  };
}

export type LocalLedgerInput = {
  sales: readonly LocalSale[];
  quickAddRecords: readonly QuickAddRecord[];
  receivablePayments: readonly ReceivablePayment[];
  payablePayments: readonly PayablePayment[];
  products: readonly InventoryProduct[];
  /** Total centavos manually added via "Add Cash" this session. 0 if none. */
  cashAddedCentavos: number;
  /** ISO timestamp for the cash addition (session start is fine). */
  cashAddedAt: string;
};

/**
 * Convert all local in-memory transactions into JournalEntry records.
 * Returns an empty array when there are no local transactions.
 */
export function buildLocalJournalEntries(input: LocalLedgerInput): JournalEntry[] {
  const entries: JournalEntry[] = [];

  for (const sale of input.sales) {
    entries.push(...postSaleEntries(sale, input.products));
  }

  for (const record of input.quickAddRecords) {
    const entry = postQuickAddEntry(record);
    if (entry) entries.push(entry);
  }

  for (const payment of input.receivablePayments) {
    entries.push(postReceivablePaymentEntry(payment));
  }

  for (const payment of input.payablePayments) {
    entries.push(postPayablePaymentEntry(payment));
  }

  if (input.cashAddedCentavos > 0) {
    entries.push(postCashAddedEntry(input.cashAddedCentavos, input.cashAddedAt));
  }

  return entries;
}
