import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { QuickAddDraft } from '@/types/quick-add';
import { emptyQuickAddDraft } from '@/utils/quick-add';
import { localCalendarDate } from '@/utils/receivables';

export const newReceivableDraft = () => emptyQuickAddDraft('customerDebt', localCalendarDate());
type DraftState = { draft: QuickAddDraft; setDraft: Dispatch<SetStateAction<QuickAddDraft>>; query: string; setQuery: (value: string) => void };
const Context = createContext<DraftState | null>(null);
export function ReceivableDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(newReceivableDraft);
  const [query, setQuery] = useState('');
  return <Context.Provider value={{ draft, setDraft, query, setQuery }}>{children}</Context.Provider>;
}
export function useReceivableDraft() {
  const state = useContext(Context);
  if (!state) throw new Error('Receivable draft provider is required.');
  return state;
}
