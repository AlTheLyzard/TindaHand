import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { QuickAddDraft } from '@/types/quick-add';
import { emptyQuickAddDraft } from '@/utils/quick-add';
import { todayInManila } from '@/utils/inventory';

export function newPayableDraft(): QuickAddDraft {
  return { ...emptyQuickAddDraft('storeDebt', todayInManila()), dueDate: '' };
}
const Context = createContext<{ draft: QuickAddDraft; setDraft: Dispatch<SetStateAction<QuickAddDraft>>; searchQuery: string; setSearchQuery: Dispatch<SetStateAction<string>> } | null>(null);
/** Kept above the form and creditor route so selection/back preserves every field. */
export function PayableDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(newPayableDraft);
  const [searchQuery, setSearchQuery] = useState('');
  return <Context.Provider value={{ draft, setDraft, searchQuery, setSearchQuery }}>{children}</Context.Provider>;
}
export function usePayableDraft() {
  const state = useContext(Context);
  if (!state) throw new Error('Payable draft provider is required.');
  return state;
}
