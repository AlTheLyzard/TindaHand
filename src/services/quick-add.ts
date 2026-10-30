import type { OwnerIdentity } from '@/types/auth';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import { quickAddErrors, quickAddTotal } from '@/utils/quick-add';

/** Record-only mock boundary. No cash, sales, revenue, or inventory effects are authorized. */
// TODO(BACKEND): Replace this local Map with authorized debt/expense writes and
// durable owner-scoped idempotency. Revalidate amounts, dates and item snapshots;
// resolve only after server confirmation. Posting/customer linking rules remain
// open; see docs/backend-handoff.md#quick-add-and-expenses and docs/api-contract.md#customers-and-debts.
export function createQuickAddService() {
  const saved = new Map<string, QuickAddRecord>();
  return {
    async save(owner: OwnerIdentity | null, token: string, draft: QuickAddDraft): Promise<QuickAddRecord> {
      if (!owner) throw new Error('An owner session is required.');
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
