import type { Creditor } from '@/types/payables';
import type { QuickAddDraft } from '@/types/quick-add';

/** Selection may be stale or absent. Change identity only; never recreate a draft. */
export function selectDraftCreditor(draft: QuickAddDraft, creditors: readonly Creditor[], id: string | undefined): QuickAddDraft {
  const creditor = creditors.find(record => record.id === id);
  return creditor ? { ...draft, name: creditor.name, creditorId: creditor.id } : draft;
}
