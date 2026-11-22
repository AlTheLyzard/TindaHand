import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { quickAddSeed } from '@/data/quick-add';
import { createQuickAddService } from '@/services/quick-add';
import { createPayable } from '@/services/payables';
import { useAuthFlow } from '@/state/auth-flow';
import { MOCK_AUTH_ENABLED } from '@/config/mock-auth';
import { useInventory } from '@/state/inventory';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import { summarizeQuickAdd, quickAddTotal } from '@/utils/quick-add';
import { payableAsQuickAdd } from '@/utils/payables';
import type { PayablesLedger, PayablePayment } from '@/types/payables';
import type { ReceivablePayment } from '@/types/receivables';
import { createReceivablesService, createReceivable, createReceivablePayment } from '@/services/receivables';

type ExpenseFeedback = { recordId: string; expiresAt: number } | null;
type TransactionLedger = { records: readonly QuickAddRecord[]; receivablePayments: readonly ReceivablePayment[]; payables: PayablesLedger };
type QuickAddState = { records: readonly QuickAddRecord[]; totals: ReturnType<typeof summarizeQuickAdd>; save: (token: string, draft: QuickAddDraft) => Promise<QuickAddRecord>; payables: PayablesLedger; transactionLedgerForOwner: (ownerId: string, scope: 'owner' | 'operator') => TransactionLedger; confirmPayablePayment: (token: string, debtId: string, amount: string) => Promise<PayablePayment>; payableFeedback: string; dismissPayableFeedback: () => void; expenseFeedback: ExpenseFeedback; dismissExpenseFeedback: () => void;
  receivablePayments: readonly ReceivablePayment[]; confirmReceivablePayment: (token: string, debtId: string, amount: string) => Promise<ReceivablePayment>; receivableFeedback: string; dismissReceivableFeedback: () => void };
const Context = createContext<QuickAddState | null>(null);
export function QuickAddProvider({ children }: { children: ReactNode }) {
  // TODO(backend): Replace root-level demo records with an authenticated owner-scoped ledger/cache.
  // - Method/Action: GET / Fetch quick-add ledgers; POST / Create or confirm debt/expense records
  // - Expected Input/Payload: Session-derived owner scope, record drafts, linked IDs, and idempotency keys
  // - Expected Response: QuickAddRecord[], PayablesLedger, and payment records
  // - UI State to Wire: Define cache/logout policy, loading/errors, and refresh derived totals after confirmation
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
  const transactionLedgerForOwner = useCallback((ownerId: string, scope: 'owner' | 'operator'): TransactionLedger => {
    const scopedPayables = scope === 'owner' ? service.readPayablesForOwner(ownerId) : { creditors: [], debts: [], payments: [] };
    const scopedRecords = [...(store.pos?.debts ?? []), ...allRecords].filter(record => record.ownerId === ownerId
      && (scope === 'owner' || record.kind === 'customerDebt'));
    return {
      records: [...scopedRecords, ...scopedPayables.debts.map(debt => payableAsQuickAdd(debt, scopedPayables.payments))],
      receivablePayments: (store.receivablePayments ?? []).filter(payment => payment.ownerId === ownerId),
      payables: scopedPayables,
    };
  }, [allRecords, service, store.pos?.debts, store.receivablePayments]);
  // TODO(backend): Keep drafts and feedback tied to confirmed quick-add/payment responses.
  // - Method/Action: POST / Create expense or debt; POST / Record payable or receivable payment
  // - Expected Input/Payload: Draft, debt ID, amount, and idempotency token under the current session
  // - Expected Response: Canonical record/payment and refreshed ledger balances
  // - UI State to Wire: Preserve modal drafts on error and update success feedback/totals only after confirmation
  async function save(token: string, draft: QuickAddDraft) {
    if (draft.kind === 'customerDebt') {
      if (!MOCK_AUTH_ENABLED && owner?.mode === 'confirmed') {
        if (!owner) throw new Error('An owner session is required.');
        const result = await createReceivable({
          name: draft.name.trim(),
          customerId: undefined, // local mock IDs (e.g. "demo-customer-*") are not valid backend IDs
          amountCentavos: quickAddTotal(draft),
          borrowing: draft.borrowing,
          // Send product line items so the backend stores and returns them
          items: draft.borrowing === 'product' ? draft.items : undefined,
          dueDate: draft.dueDate || undefined,
          details: draft.details.trim() || undefined,
          occurredAt: new Date().toISOString(),
        });
        const record: QuickAddRecord = {
          id: String(result.id),
          ownerId: owner.id,
          kind: 'customerDebt',
          name: result.name,
          amountCentavos: result.originalAmountCentavos,
          originalAmountCentavos: result.originalAmountCentavos,
          paidCentavos: 0,
          category: null,
          details: result.details ?? '',
          expenseDate: null,
          dueDate: result.dueDate ?? null,
          borrowing: result.borrowing ?? 'cash',
          // Use items returned by the backend (the backend now stores and returns them)
          items: result.items ?? {},
          paymentStatus: 'unpaid',
          customerId: result.customerId ?? undefined,
          occurredAt: result.occurredAt,
        };
        setReceivableFeedback({ ownerId: owner.id, message: `Debt saved for ${record.name}.` });
        return record;
      }
      const record = receivables.saveDebt(owner, token, draft);
      setReceivableFeedback({ ownerId: record.ownerId, message: `Debt saved for ${record.name}.` });
      return record;
    }
    if (draft.kind === 'storeDebt' && !MOCK_AUTH_ENABLED && owner?.mode === 'confirmed') {
      // Real path: POST to backend. The account-balances-screen re-fetches via useFocusEffect.
      const result = await createPayable({
        creditorName: draft.name.trim(),
        amountCentavos: quickAddTotal(draft),
        dueDate: draft.dueDate || undefined,
        details: draft.details.trim() || undefined,
      });
      if (!owner) throw new Error('An owner session is required.');
      const record: QuickAddRecord = {
        id: String(result.id),
        ownerId: owner.id,
        kind: 'storeDebt',
        name: result.creditorName,
        amountCentavos: result.amountCentavos,
        category: null,
        details: draft.details.trim(),
        expenseDate: null,
        dueDate: result.dueDate ?? null,
        borrowing: null,
        items: {},
        paymentStatus: 'unpaid',
        occurredAt: result.occurredAt,
      };
      setPayableFeedback({ ownerId: owner.id, message: `Debt saved for ${record.name}.` });
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
    if (!MOCK_AUTH_ENABLED && owner?.mode === 'confirmed') {
      if (!owner) throw new Error('An owner session is required.');
      const amountCentavos = Math.round(parseFloat(amount) * 100);
      const result = await createReceivablePayment({ debtId, amountCentavos, occurredAt: new Date().toISOString() });
      const payment: ReceivablePayment = {
        id: String(result.id),
        ownerId: owner.id,
        debtId: String(result.debtId),
        amountCentavos: result.amountCentavos,
        occurredAt: result.occurredAt,
      };
      setReceivableFeedback({ ownerId: owner.id, message: 'Payment recorded. Debt balance updated.' });
      return payment;
    }
    const payment = receivables.confirmPayment(owner, token, debtId, amount);
    setReceivableFeedback({ ownerId: payment.ownerId, message: 'Payment recorded. Debt balance updated.' });
    return payment;
  }
  return <Context.Provider value={{ records, totals: summarizeQuickAdd(records), save, payables, transactionLedgerForOwner, confirmPayablePayment,
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
