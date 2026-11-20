import type { OwnerIdentity } from '@/types/auth';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import { quickAddErrors, quickAddTotal } from '@/utils/quick-add';
import { createPayablesRepository } from '@/services/payables';

/** Record-only mock boundary. No cash, sales, revenue, or inventory effects are authorized. */
// TODO(backend): Replace the local Map with authorized debt and expense writes.
// - Method/Action: POST / Create customer debt, store debt, or expense
// - Expected Input/Payload: Authenticated session, QuickAddDraft, and durable owner-scoped idempotency key
// - Expected Response: Canonical QuickAddRecord with validated amounts, dates, links, and item snapshots
// - UI State to Wire: Resolve only after confirmation; retain drafts and surface validation/retry errors
export function createQuickAddService() {
  const saved = new Map<string, QuickAddRecord>();
  const payables = createPayablesRepository();
  return {
    readPayables: payables.read,
    readPayablesForOwner: payables.readForOwner,
    confirmPayablePayment: payables.confirmPayment,
    async save(owner: OwnerIdentity | null, token: string, draft: QuickAddDraft): Promise<QuickAddRecord> {
      if (!owner) throw new Error('An owner session is required.');
      if (draft.kind === 'storeDebt') return payables.saveDebt(owner, token, draft);
      const key = `${owner.id}:${token}`;
      const existing = saved.get(key);
      if (existing) return existing;
      if (Object.keys(quickAddErrors(draft)).length) throw new Error('Check the highlighted fields.');
      const product = draft.kind === 'customerDebt' && draft.borrowing === 'product';
      const record: QuickAddRecord = {
        id: token, ownerId: owner.id, kind: draft.kind,
        name: draft.kind === 'expense' ? draft.category : draft.name.trim(),
        amountCentavos: quickAddTotal(draft), category: draft.kind === 'expense' ? draft.category : null,
        details: draft.details.trim(), expenseDate: draft.kind === 'expense' ? draft.expenseDate : null,
        dueDate: draft.kind === 'expense' ? null : draft.dueDate || null,
        borrowing: draft.kind === 'customerDebt' ? draft.borrowing : null,
        items: product ? Object.fromEntries(Object.entries(draft.items).map(([id, line]) => [id, { ...line }])) : {},
        paymentStatus: draft.kind === 'expense' ? null : 'unpaid', occurredAt: new Date().toISOString(),
      };
      saved.set(key, record);
      return record;
    },
  };
}
