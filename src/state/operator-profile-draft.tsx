import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AvatarId } from '@/types/profile';
import type { OperatorProfileValues } from '@/types/settings';

type Draft = { operatorId: string; values: OperatorProfileValues };
type OperatorProfileDraftState = {
  draft: Draft | null;
  begin: (operatorId: string, name: string, avatarId: AvatarId) => void;
  update: (values: Partial<OperatorProfileValues>) => void;
  clear: () => void;
};

const Context = createContext<OperatorProfileDraftState | null>(null);

/** Holds only the in-progress self-service edit while the photo picker is pushed. */
export function OperatorProfileDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const begin = useCallback((operatorId: string, name: string, avatarId: AvatarId) => {
    setDraft({ operatorId, values: { name, avatarId } });
  }, []);
  const update = useCallback((values: Partial<OperatorProfileValues>) => {
    setDraft(current => current ? { ...current, values: { ...current.values, ...values } } : current);
  }, []);
  const clear = useCallback(() => setDraft(null), []);
  const value = useMemo(() => ({ draft, begin, update, clear }), [draft, begin, update, clear]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOperatorProfileDraft() {
  const state = useContext(Context);
  if (!state) throw new Error('Operator profile draft must be rendered inside its route layout.');
  return state;
}
