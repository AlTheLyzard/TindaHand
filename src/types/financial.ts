export type ReportKind = 'general-journal' | 'general-ledger' | 'income-statement' | 'balance-sheet';
export type ReportPreset = 'today' | 'week' | 'month' | 'yesterday' | 'custom';
/** Calendar dates in the store timezone; never ISO event timestamps. */
export type ReportSelection = { preset: ReportPreset; from: string; to: string };
export type ReportFilterState = { draft: ReportSelection; applied: ReportSelection };
export type AccountCategory = 'current-asset' | 'non-current-asset' | 'liability' | 'equity' | 'revenue' | 'cost' | 'expense';
export type FinancialAccount = { id: string; name: string; category: AccountCategory; normal: 'debit' | 'credit' };
export type JournalLine = { accountId: string; debit: number; credit: number };
/** Only posted, saved entries reach this read model. Monetary values are integer centavos. */
export type JournalEntry = { id: string; date: string; description: string; lines: readonly JournalLine[] };
export type FinancialDataset = { storeName: string; timezone: string; updatedAt: string; accounts: readonly FinancialAccount[]; entries: readonly JournalEntry[] };
export type JournalDay = { date: string; entries: JournalEntry[]; debit: number; credit: number };
export type LedgerRow = { entryId: string; date: string; description: string; debit: number; credit: number; balance: number };
/** Signed balances are debit-positive. A negative balance is a credit, regardless of account normal side. */
export type LedgerAccount = FinancialAccount & { opening: number; debit: number; credit: number; ending: number; rows: LedgerRow[] };
export type StatementAmount = { id: string; name: string; amount: number };
export type FinancialReport = {
  kind: ReportKind; selection: ReportSelection; storeName: string; timezone: string; generatedAt: string; sourceUpdatedAt: string;
  journal: { days: JournalDay[]; debit: number; credit: number; balanced: boolean };
  ledger: LedgerAccount[];
  income: { sales: number; cost: number; grossProfit: number; expenses: StatementAmount[]; totalExpenses: number; netProfit: number };
  balance: { currentAssets: StatementAmount[]; nonCurrentAssets: StatementAmount[]; liabilities: StatementAmount[]; capital: StatementAmount[];
    currentTotal: number; nonCurrentTotal: number; assets: number; liabilityTotal: number; capitalTotal: number; accumulatedEarnings: number; equity: number; liabilitiesAndEquity: number; balanced: boolean };
  hasActivity: boolean;
};
export interface FinancialRepository {
  getReport(owner: import('./auth').OwnerIdentity | null, kind: ReportKind, selection: ReportSelection): Promise<FinancialReport>;
  getStatus(owner: import('./auth').OwnerIdentity | null): Promise<{ updatedAt: string; storeName: string }>;
}
