/** Frontend records only. No HTTP or database schema has been agreed. */
export type Creditor = { id: string; ownerId: string; name: string };
export type PayableDebt = {
  id: string;
  ownerId: string;
  creditorId: string;
  name: string;
  originalAmountCentavos: number;
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
