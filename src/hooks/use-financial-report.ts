import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAuthFlow } from '@/state/auth-flow';
import { financialRepositoryWithLocal } from '@/services/financial';
import type { FinancialReport, JournalEntry, ReportKind, ReportSelection } from '@/types/financial';
import { presetSelection, reportFilterReducer, samePeriod, storeToday } from '@/utils/financial';
import { buildLocalJournalEntries, type LocalLedgerInput } from '@/utils/journal-posting';
import { useInventory } from '@/state/inventory';
import { useQuickAdd } from '@/state/quick-add';
import { useCashRegister } from '@/state/cash-register';

export function useFinancialReport(kind: ReportKind) {
  const { owner } = useAuthFlow();
  const { store } = useInventory();
  const quickAdd = useQuickAdd();
  const { addedCentavos } = useCashRegister();
  const sessionStartRef = useRef(new Date().toISOString());

  // Build local journal entries from all in-memory transactions.
  const localEntries: readonly JournalEntry[] = useMemo(() => {
    if (!owner?.id) return [];
    const input: LocalLedgerInput = {
      sales: store.pos?.sales ?? [],
      quickAddRecords: quickAdd.records,
      receivablePayments: store.receivablePayments ?? [],
      payablePayments: quickAdd.payables.payments,
      products: store.products,
      cashAddedCentavos: addedCentavos,
      cashAddedAt: sessionStartRef.current,
    };
    return buildLocalJournalEntries(input);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner?.id, store.pos?.sales, store.receivablePayments, store.products,
      quickAdd.records, quickAdd.payables.payments, addedCentavos]);

  const [filters, dispatch] = useReducer(reportFilterReducer, undefined, () => {
    const today = presetSelection('today'); return { draft: today, applied: { ...today } };
  });
  const [result, setResult] = useState<{ selection: ReportSelection; revision: number; ownerId: string | undefined; kind: ReportKind; report: FinancialReport | null; error: boolean; entryCount: number } | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const entryCount = localEntries.length;
  const loading = result?.selection !== filters.applied || result?.revision !== revision || result?.ownerId !== owner?.id || result?.kind !== kind || result?.entryCount !== entryCount;
  const report = result?.report ?? null;
  const error = !loading && !!result?.error;
  useEffect(() => {
    let current = true;
    // Build a repository that merges local journal entries with the seed dataset.
    // TODO(backend): Replace with authenticated financial reporting API when available.
    // - Method/Action: GET / Fetch financial report
    // - Expected Input/Payload: ReportKind and applied ReportSelection with session-derived Owner scope
    // - Expected Response: FinancialReport for the selected period
    // - UI State to Wire: Drive the existing loading/error/refresh state from the request lifecycle
    const repo = financialRepositoryWithLocal(localEntries);
    void repo.getReport(owner, kind, filters.applied).then(value => {
      if (current) setResult({ selection: filters.applied, revision, ownerId: owner?.id, kind, report: value, error: false, entryCount });
    }).catch(() => { if (current) setResult({ selection: filters.applied, revision, ownerId: owner?.id, kind, report: null, error: true, entryCount }); });
    return () => { current = false; };
  }, [owner, kind, filters.applied, revision, localEntries, entryCount]);
  return { filters, report, loading, error, refresh, pending: !samePeriod(filters.draft, filters.applied),
    setDraft: (selection: ReportSelection) => dispatch({ type: 'draft', selection }),
    apply: () => dispatch({ type: 'apply' }), reset: () => dispatch({ type: 'reset', today: storeToday() }) };
}
