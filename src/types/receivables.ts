import type { QuickAddDraft } from './quick-add';

export type ReceivableStatus = 'paid' | 'overdue' | 'partial' | 'pending';
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
