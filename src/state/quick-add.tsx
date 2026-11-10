import { createContext, useContext, useState, type ReactNode } from 'react';
import { quickAddSeed } from '@/data/quick-add';
import { createQuickAddService } from '@/services/quick-add';
import { useAuthFlow } from '@/state/auth-flow';
import { useInventory } from '@/state/inventory';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import { summarizeQuickAdd } from '@/utils/quick-add';
import { payableAsQuickAdd } from '@/utils/payables';
import type { PayablesLedger, PayablePayment } from '@/types/payables';
import type { ReceivablePayment } from '@/types/receivables';
import { createReceivablesService } from '@/services/receivables';

type ExpenseFeedback = { recordId: string; expiresAt: number } | null;
type QuickAddState = { records: readonly QuickAddRecord[]; totals: ReturnType<typeof summarizeQuickAdd>; save: (token: string, draft: QuickAddDraft) => Promise<QuickAddRecord>; payables: PayablesLedger; confirmPayablePayment: (token: string, debtId: string, amount: string) => Promise<PayablePayment>; payableFeedback: string; dismissPayableFeedback: () => void; expenseFeedback: ExpenseFeedback; dismissExpenseFeedback: () => void;
  receivablePayments: readonly ReceivablePayment[]; confirmReceivablePayment: (token: string, debtId: string, amount: string) => Promise<ReceivablePayment>; receivableFeedback: string; dismissReceivableFeedback: () => void };
const Context = createContext<QuickAddState | null>(null);
export function QuickAddProvider({ children }: { children: ReactNode }) {
  // TODO(BACKEND): Records/Map survive logout in this root provider, filtered by
  // owner; the shared customer/POS debt ledger resets with inventory. Replace with authenticated reads and a
  // deliberate cache/logout policy. See docs/backend-handoff.md#persistence.
  const { owner } = useAuthFlow();
  const { store, getStore, dispatch } = useInventory();
  const receivables = createReceivablesService(getStore, dispatch);
  const [service] = useState(createQuickAddService);
  const [allRecords, setRecords] = useState<readonly QuickAddRecord[]>(quickAddSeed);
  const [feedback, setFeedback] = useState<(NonNullable<ExpenseFeedback> & { ownerId: string }) | null>(null);
  const [, setRevision] = useState(0);
  const [payableFeedback, setPayableFeedback] = useState<{ ownerId: string; message: string } | null>(null);
  const [receivableFeedback, setReceivableFeedback] = useState<{ ownerId: string; message: string } | null>(null);
  const payables = service.readPayables(owner);
  const records = [...(store.pos?.debts ?? []), ...allRecords, ...payables.debts.map(debt => payableAsQuickAdd(debt, payables.payments))].filter(record => record.ownerId === owner?.id);
  async function save(token: string, draft: QuickAddDraft) {
    if (draft.kind === 'customerDebt') {
      const record = receivables.saveDebt(owner, token, draft);
      setReceivableFeedback({ ownerId: record.ownerId, message: `Debt saved for ${record.name}.` });
      return record;
    }
    const saved = await service.save(owner, token, draft);
    const record = saved;
    if (record.kind === 'storeDebt') {
      setRevision(previous => previous + 1);
      setPayableFeedback({ ownerId: record.ownerId, message: `Debt saved for ${record.name}.` });
    } else setRecords(previous => previous.some(item => item.id === record.id && item.ownerId === record.ownerId) ? previous : [record, ...previous]);
    if (record.kind === 'expense') setFeedback({ recordId: record.id, ownerId: record.ownerId, expiresAt: Date.now() + 5000 });
    return record;
  }
  async function confirmPayablePayment(token: string, debtId: string, amount: string) {
    const payment = service.confirmPayablePayment(owner, token, debtId, amount);
    setRevision(previous => previous + 1);
    setPayableFeedback({ ownerId: payment.ownerId, message: 'Payment recorded. Debt balance updated.' });
    return payment;
  }
  async function confirmReceivablePayment(token: string, debtId: string, amount: string) {
    const payment = receivables.confirmPayment(owner, token, debtId, amount);
    setReceivableFeedback({ ownerId: payment.ownerId, message: 'Payment recorded. Debt balance updated.' });
    return payment;
  }
  return <Context.Provider value={{ records, totals: summarizeQuickAdd(records), save, payables, confirmPayablePayment,
    receivablePayments: (store.receivablePayments ?? []).filter(payment => payment.ownerId === owner?.id), confirmReceivablePayment,
    receivableFeedback: receivableFeedback && receivableFeedback.ownerId === owner?.id ? receivableFeedback.message : '', dismissReceivableFeedback: () => setReceivableFeedback(null),
    payableFeedback: payableFeedback && payableFeedback.ownerId === owner?.id ? payableFeedback.message : '', dismissPayableFeedback: () => setPayableFeedback(null),
    expenseFeedback: feedback?.ownerId === owner?.id ? feedback : null, dismissExpenseFeedback: () => setFeedback(null) }}>{children}</Context.Provider>;
}
export function useQuickAdd() {
  const state = useContext(Context);
  if (!state) throw new Error('Quick Add requires QuickAddProvider.');
  return state;
}
