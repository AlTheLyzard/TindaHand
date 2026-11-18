import type { OwnerIdentity } from '@/types/auth';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import { quickAddErrors, quickAddTotal } from '@/utils/quick-add';
import { createPayablesRepository } from '@/services/payables';
import { apiFetch } from '@/services/api';

// ── Legacy in-memory service (used by existing quick-add screens — do not remove) ────────
export function createQuickAddService() {
  const saved = new Map<string, QuickAddRecord>();
  const payables = createPayablesRepository();
  return {
    readPayables: payables.read,
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

// ── Real API function ─────────────────────────────────────────────────────────────────────

export interface QuickAddResponse {
  id: number;
  kind: 'expense' | 'customerDebt' | 'storeDebt';
  name: string;
  amountCentavos: number;
  occurredAt: string;
}

/**
 * Submit a Quick Add entry to the backend.
 * The backend auto-creates the customer or creditor if the name is new.
 */
export async function submitQuickAdd(data: {
  kind: 'expense' | 'customerDebt' | 'storeDebt';
  name: string;
  amountCentavos: number;
  category?: string;
  details?: string;
  dueDate?: string;
  expenseDate?: string;
}): Promise<QuickAddResponse> {
  return apiFetch<QuickAddResponse>('/quick-add', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
