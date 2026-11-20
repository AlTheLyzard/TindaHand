/** Frontend records only. No HTTP or database schema has been agreed. */
// TODO(backend): Verify creditor, payable debt, and payment types against the accounts-payable API.
// - Method/Action: GET / Read ledger; POST / Create debt or record payment
// - Expected Input/Payload: Creditor identity or debt/payment fields with integer-centavo amounts
// - Expected Response: PayablesLedger with canonical IDs, balances, due dates, and payment timestamps
// - UI State to Wire: Derive pending/partial/paid status and balances from server records
export type Creditor = { id: string; ownerId: string; name: string };
export type PayableDebt = {
  id: string;
  ownerId: string;
  creditorId: string;
  name: string;
  originalAmountCentavos: number;
  /** The current AP form records cash borrowing; kept in the client ledger for detail display. */
  borrowingType?: 'cash' | 'goods-stock';
  dueDate: string | null;
  details: string;
  occurredAt: string;
};
export type PayablePayment = {
  id: string;
  ownerId: string;
  debtId: string;
  amountCentavos: number;
  occurredAt: string;
};
export type PayablesLedger = {
  creditors: readonly Creditor[];
  debts: readonly PayableDebt[];
  payments: readonly PayablePayment[];
};
export type PayableStatus = 'pending' | 'partial' | 'paid';
