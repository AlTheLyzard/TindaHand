import { useEffect, useMemo, useState } from 'react';
import { readTransactions } from '@/services/transactions';
import { useAuthFlow } from '@/state/auth-flow';
import { useInventory } from '@/state/inventory';
import { useQuickAdd } from '@/state/quick-add';
import type { TransactionRecord } from '@/types/transactions';
import type { TransactionSources } from '@/utils/transactions';

export function useTransactions() {
  const { owner } = useAuthFlow();
  const { store } = useInventory();
  const { records, receivablePayments } = useQuickAdd();
  const ownerId = owner?.id;
  const [result, setResult] = useState<{ rows: TransactionRecord[]; source: TransactionSources | null; error: string }>({ rows: [], source: null, error: '' });
  const [revision, setRevision] = useState(0);
  const source = useMemo(() => ({ ownerId, revision, sales: store.pos?.sales ?? [], customers: store.pos?.customers ?? [], records, payments: receivablePayments }), [ownerId, revision, store, records, receivablePayments]);
  useEffect(() => {
    let active = true;
    const request = ownerId ? readTransactions(ownerId, source) : Promise.resolve([]);
    void request.then(rows => { if (active) setResult({ rows, source, error: '' }); })
      .catch(() => { if (active) setResult({ rows: [], source, error: 'Could not load transactions. Please try again.' }); });
    return () => { active = false; };
  }, [ownerId, source]);
  return { rows: result.source === source ? result.rows : [], error: result.source === source ? result.error : '', loading: result.source !== source, retry: () => setRevision(value => value + 1) };
}
