import type { OwnerIdentity } from '@/types/auth';
import type { QuickAddDraft } from '@/types/quick-add';
import type { InventoryAction, InventoryStore } from '@/utils/inventory';

/** Replace this adapter with an authenticated atomic repository when APIs are agreed.
 * Replays return the original record; stock and payments are committed at most once. */
export function createReceivablesService(getStore: () => InventoryStore, dispatch: (action: InventoryAction) => boolean) {
  return {
    saveDebt(owner: OwnerIdentity | null, token: string, draft: QuickAddDraft) {
      if (!owner) throw new Error('A store session is required.');
      const existing = getStore().pos?.debts.find(row => row.id === token && row.ownerId === owner.id);
      if (existing) return existing;
      if (!dispatch({ type: 'saveCustomerDebt', command: { id: token, ownerId: owner.id, occurredAt: new Date().toISOString(), draft } })) throw new Error('Check customer, amount, due date and available stock.');
      return getStore().pos!.debts.find(row => row.id === token && row.ownerId === owner.id)!;
    },
    confirmPayment(owner: OwnerIdentity | null, token: string, debtId: string, amount: string) {
      if (!owner) throw new Error('A store session is required.');
      const existing = getStore().receivablePayments?.find(row => row.id === token && row.ownerId === owner.id);
      if (existing) return existing;
      if (!dispatch({ type: 'confirmReceivablePayment', command: { id: token, ownerId: owner.id, occurredAt: new Date().toISOString(), debtId, amount } })) throw new Error('Check the amount against the current debt balance.');
      return getStore().receivablePayments!.find(row => row.id === token && row.ownerId === owner.id)!;
    },
  };
}
