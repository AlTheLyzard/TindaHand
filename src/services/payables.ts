import { payablesSeed } from '@/data/payables';
import type { OwnerIdentity } from '@/types/auth';
import type { PayablesLedger } from '@/types/payables';
import type { QuickAddDraft } from '@/types/quick-add';
import { payableAsQuickAdd, payableBalance, payablePaymentError } from '@/utils/payables';
import { quickAddErrors, quickAddTotal } from '@/utils/quick-add';
import { parsePaymentAmount } from '@/utils/pos-payment';

const nameKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();

/** Replaceable in-memory repository. No cash, inventory or expense posting. */
// TODO(BACKEND): Authorize owner/store, transact creditor/debt/payment writes,
// enforce current balance and durable idempotency, return canonical records.
export function createPayablesRepository(seed: PayablesLedger = payablesSeed) {
  let ledger: PayablesLedger = {
    creditors: seed.creditors.map(row => ({ ...row })), debts: seed.debts.map(row => ({ ...row })), payments: seed.payments.map(row => ({ ...row })),
  };
  const saved = new Map<string, string>();
  const confirmed = new Map<string, string>();
  function read(owner: OwnerIdentity | null): PayablesLedger {
    return {
      creditors: ledger.creditors.filter(row => row.ownerId === owner?.id),
      debts: ledger.debts.filter(row => row.ownerId === owner?.id),
      payments: ledger.payments.filter(row => row.ownerId === owner?.id),
    };
  }
  return {
    read,
    saveDebt(owner: OwnerIdentity | null, token: string, draft: QuickAddDraft) {
      if (!owner || !token) throw new Error('An owner session and save token are required.');
      const key = `${owner.id}:${token}`;
      const previous = saved.get(key);
      if (previous) return payableAsQuickAdd(ledger.debts.find(row => row.id === previous && row.ownerId === owner.id)!, ledger.payments);
      if (draft.kind !== 'storeDebt' || Object.keys(quickAddErrors(draft)).length) throw new Error('Check the highlighted fields.');
      const creditors = read(owner).creditors;
      let creditor = draft.creditorId ? creditors.find(row => row.id === draft.creditorId) : creditors.find(row => nameKey(row.name) === nameKey(draft.name));
      if (draft.creditorId && !creditor) throw new Error('Select an available creditor.');
      if (!creditor) creditor = { id: `creditor-${token}`, ownerId: owner.id, name: draft.name.trim() };
      const debt = { id: token, ownerId: owner.id, creditorId: creditor.id, name: creditor.name,
        originalAmountCentavos: quickAddTotal(draft), dueDate: draft.dueDate || null, details: draft.details.trim(), occurredAt: new Date().toISOString() };
      ledger = { ...ledger, creditors: creditors.some(row => row.id === creditor.id) ? ledger.creditors : [...ledger.creditors, creditor], debts: [debt, ...ledger.debts] };
      saved.set(key, debt.id);
      return payableAsQuickAdd(debt, ledger.payments);
    },
    confirmPayment(owner: OwnerIdentity | null, token: string, debtId: string, amount: string) {
      if (!owner || !token) throw new Error('An owner session and confirmation token are required.');
      const key = `${owner.id}:${token}`;
      const previous = confirmed.get(key);
      if (previous) {
        const payment = ledger.payments.find(row => row.id === previous && row.ownerId === owner.id)!;
        if (payment.debtId !== debtId || payment.amountCentavos !== parsePaymentAmount(amount)) throw new Error('Confirmation token already used.');
        return payment;
      }
      const debt = read(owner).debts.find(row => row.id === debtId);
      if (!debt) throw new Error('Debt is no longer available.');
      const error = payablePaymentError(amount, payableBalance(debt, ledger.payments).remainingCentavos);
      if (error) throw new Error(error);
      const payment = { id: `payable-payment-${token}`, ownerId: owner.id, debtId, amountCentavos: parsePaymentAmount(amount)!, occurredAt: new Date().toISOString() };
      ledger = { ...ledger, payments: [...ledger.payments, payment] };
      confirmed.set(key, payment.id);
      return payment;
    },
  };
}
