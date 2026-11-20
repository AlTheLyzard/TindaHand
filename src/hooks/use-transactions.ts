import { useEffect, useMemo, useState } from 'react';
import { readTransactions } from '@/services/transactions';
import { useAuthFlow } from '@/state/auth-flow';
import { useInventory } from '@/state/inventory';
import { useQuickAdd } from '@/state/quick-add';
import type { TransactionRecord } from '@/types/transactions';
import type { TransactionSources } from '@/utils/transactions';

export function useTransactions() {
  const { owner, deviceSession } = useAuthFlow();
  const { store } = useInventory();
  const { transactionLedgerForOwner } = useQuickAdd();
  const operator = deviceSession?.role === 'operator' ? deviceSession : null;
  const ownerId = owner?.id ?? operator?.ownerId;
  const scope = operator ? 'operator' : 'owner';
  const [result, setResult] = useState<{ rows: TransactionRecord[]; source: TransactionSources | null; error: string }>({ rows: [], source: null, error: '' });
  const [revision, setRevision] = useState(0);
  const ledger = useMemo(() => ownerId ? transactionLedgerForOwner(ownerId, scope) : null, [ownerId, scope, transactionLedgerForOwner]);
  const pos = store.pos;
  const source = useMemo(() => ({ scope, revision, sales: pos?.sales ?? [], customers: pos?.customers ?? [],
    records: ledger?.records ?? [], payments: ledger?.receivablePayments ?? [], payables: ledger?.payables }),
  [scope, revision, pos, ledger]);
  useEffect(() => {
    let active = true;
    // TODO: Backend integration: replace this local read with the authenticated API call. Pass the current page, limit (8), search, category, and date/payment filters, and refetch when any of them change.
    const request = ownerId ? readTransactions(ownerId, source) : Promise.resolve([]);
    void request.then(rows => { if (active) setResult({ rows, source, error: '' }); })
      .catch(() => { if (active) setResult({ rows: [], source, error: 'Could not load transactions. Please try again.' }); });
    return () => { active = false; };
  }, [ownerId, scope, source]);
  return { rows: result.source === source ? result.rows : [], error: result.source === source ? result.error : '', loading: result.source !== source, retry: () => setRevision(value => value + 1) };
}
