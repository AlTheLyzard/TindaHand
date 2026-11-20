import type { QuickAddDraft } from './quick-add';

export type ReceivableStatus = 'paid' | 'overdue' | 'partial' | 'pending';
// TODO(backend): Verify receivable payment and debt command shapes against the receivables API schema.
// - Method/Action: POST / Create customer debt or record payment
// - Expected Input/Payload: CustomerDebtCommand or ReceivablePaymentCommand with stable IDs and centavo amounts
// - Expected Response: Canonical QuickAddRecord debt or ReceivablePayment with payment timestamp
// - UI State to Wire: Refresh balances/statuses and show validation or retry state after responses
export type ReceivablePayment = {
  id: string;
  ownerId: string;
  debtId: string;
  amountCentavos: number;
  occurredAt: string;
  /** Present only when an existing POS payment supplied it. */
  reference?: string;
};
export type CustomerDebtCommand = { id: string; ownerId: string; occurredAt: string; draft: QuickAddDraft };
export type ReceivablePaymentCommand = { id: string; ownerId: string; debtId: string; amount: string; occurredAt: string };
