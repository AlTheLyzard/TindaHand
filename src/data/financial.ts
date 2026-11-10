import type { FinancialAccount, FinancialDataset, JournalEntry } from '@/types/financial';

const accounts: readonly FinancialAccount[] = [
  { id: 'cash', name: 'Cash', category: 'current-asset', normal: 'debit' },
  { id: 'receivables', name: 'Accounts Receivable', category: 'current-asset', normal: 'debit' },
  { id: 'inventory', name: 'Merchandise Inventory', category: 'current-asset', normal: 'debit' },
  { id: 'equipment', name: 'Store Equipment & Fixtures', category: 'non-current-asset', normal: 'debit' },
  { id: 'payables', name: 'Accounts Payable', category: 'liability', normal: 'credit' },
  { id: 'capital', name: 'Capital', category: 'equity', normal: 'credit' },
  { id: 'sales', name: 'Sales', category: 'revenue', normal: 'credit' },
  { id: 'cogs', name: 'Cost of Goods Sold', category: 'cost', normal: 'debit' },
  { id: 'utilities', name: 'Store Electricity & Water', category: 'expense', normal: 'debit' },
  { id: 'transport', name: 'Supplier Transportation', category: 'expense', normal: 'debit' },
];
function entry(id: string, date: string, description: string, debitId: string, creditId: string, amount: number): JournalEntry {
  return { id, date, description, lines: [{ accountId: debitId, debit: amount, credit: 0 }, { accountId: creditId, debit: 0, credit: amount }] };
}
/** A single fictional posted accounting book. Independent from unposted operational demo state.
 * No inferred POS/expense postings: source cost, payment-source and opening-balance contracts remain open. */
export const financialSeed: FinancialDataset = {
  storeName: 'JDC Sari-Sari Store', timezone: 'Asia/Manila', updatedAt: '2026-11-09T10:00:00+08:00', accounts,
  entries: [
    entry('FS-001', '2026-09-01', 'Owner investment', 'cash', 'capital', 3000000),
    entry('FS-002', '2026-09-01', 'Equipment purchased', 'equipment', 'cash', 1000000),
    entry('FS-003', '2026-09-02', 'Stock purchased on credit', 'inventory', 'payables', 1200000),
    entry('FS-004', '2026-09-30', 'September cash sales', 'cash', 'sales', 500000),
    entry('FS-005', '2026-09-30', 'Cost of September sales', 'cogs', 'inventory', 300000),
    entry('FS-006', '2026-10-01', 'Additional owner investment', 'cash', 'capital', 500000),
    entry('FS-007', '2026-10-24', 'Cash sales', 'cash', 'sales', 800000),
    entry('FS-008', '2026-10-24', 'Cost of cash sales', 'cogs', 'inventory', 480000),
    entry('FS-009', '2026-10-25', 'Credit sales', 'receivables', 'sales', 250000),
    entry('FS-010', '2026-10-25', 'Cost of credit sales', 'cogs', 'inventory', 150000),
    entry('FS-011', '2026-10-26', 'Restock paid in cash', 'inventory', 'cash', 600000),
    entry('FS-012', '2026-10-27', 'Customer payment', 'cash', 'receivables', 100000),
    entry('FS-013', '2026-10-28', 'Supplier payment', 'payables', 'cash', 400000),
    entry('FS-014', '2026-10-30', 'Electricity and water bills', 'utilities', 'cash', 120000),
    entry('FS-015', '2026-10-31', 'Supplier delivery', 'transport', 'cash', 35000),
    entry('FS-016', '2026-11-02', 'November cash sales', 'cash', 'sales', 300000),
    entry('FS-017', '2026-11-02', 'Cost of November sales', 'cogs', 'inventory', 180000),
    entry('FS-018', '2026-11-08', 'Electricity bill', 'utilities', 'cash', 45000),
    entry('FS-019', '2026-11-09', 'Cash sales', 'cash', 'sales', 90000),
    entry('FS-020', '2026-11-09', 'Cost of cash sales', 'cogs', 'inventory', 54000),
    entry('FS-021', '2026-11-09', 'Credit sales', 'receivables', 'sales', 20000),
    entry('FS-022', '2026-11-09', 'Cost of credit sales', 'cogs', 'inventory', 12000),
  ],
};
