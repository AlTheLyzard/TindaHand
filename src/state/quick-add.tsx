import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { quickAddSeed } from '@/data/quick-add';
import { createQuickAddService } from '@/services/quick-add';
import { useAuthFlow } from '@/state/auth-flow';
import { useInventory } from '@/state/inventory';
import type { QuickAddDraft, QuickAddRecord } from '@/types/quick-add';
import { summarizeQuickAdd } from '@/utils/quick-add';

type ExpenseFeedback = { recordId: string; expiresAt: number } | null;
type QuickAddState = { records: readonly QuickAddRecord[]; totals: ReturnType<typeof summarizeQuickAdd>; save: (token: string, draft: QuickAddDraft) => Promise<QuickAddRecord>; expenseFeedback: ExpenseFeedback; dismissExpenseFeedback: () => void };
const Context = createContext<QuickAddState | null>(null);
export function QuickAddProvider({ children }: { children: ReactNode }) {
  // TODO(BACKEND): Records/Map survive logout in this root provider, filtered by
  // owner; POS debts reset separately. Replace with authenticated reads and a
  // deliberate cache/logout policy. See docs/backend-handoff.md#persistence.
  const { owner } = useAuthFlow();
  const { store, ensureCustomer } = useInventory();
  const service = useRef(createQuickAddService());
  const [allRecords, setRecords] = useState<readonly QuickAddRecord[]>(quickAddSeed);
  const [feedback, setFeedback] = useState<(NonNullable<ExpenseFeedback> & { ownerId: string }) | null>(null);
  const records = [...(store.pos?.debts ?? []), ...allRecords].filter(record => record.ownerId === owner?.id);
  async function save(token: string, draft: QuickAddDraft) {
    const saved = await service.current.save(owner, token, draft);
    const customer = saved.kind === 'customerDebt' ? ensureCustomer(saved.name, `customer-${saved.id}`) : null;
    const record = customer ? { ...saved, customerId: customer.id } : saved;
    setRecords(previous => previous.some(item => item.id === record.id && item.ownerId === record.ownerId) ? previous : [record, ...previous]);
    if (record.kind === 'expense') setFeedback({ recordId: record.id, ownerId: record.ownerId, expiresAt: Date.now() + 5000 });
    return record;
  }
  return <Context.Provider value={{ records, totals: summarizeQuickAdd(records), save, expenseFeedback: feedback?.ownerId === owner?.id ? feedback : null, dismissExpenseFeedback: () => setFeedback(null) }}>{children}</Context.Provider>;
}
export function useQuickAdd() {
  const state = useContext(Context);
  if (!state) throw new Error('Quick Add requires QuickAddProvider.');
  return state;
}
