import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAuthFlow } from '@/state/auth-flow';
import { financialRepositoryFromEntries } from '@/services/financial';
import { getJournalEntries } from '@/services/inventory';
import { useProfileSnapshot } from '@/hooks/use-owner-profile';
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

  // Get the owner's real store name from the profile snapshot.
  const profiles = useProfileSnapshot();
  const storeName = owner ? (profiles.get(owner.id)?.storeName || undefined) : undefined;

  // Build local in-session journal entries (POS sales, quick-add, etc.) that are not yet persisted.
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

    async function fetchAndBuild() {
      // Determine date range for the backend query (from ReportSelection's date-only strings).
      const fromDate = filters.applied.from || undefined;
      const toDate = filters.applied.to || undefined;

      // Fetch real journal entries from the backend.
      let backendEntries: JournalEntry[] = [];
      try {
        const apiEntries = await getJournalEntries(fromDate, toDate);
        backendEntries = apiEntries.map(e => ({
          id: e.id,
          date: e.date,
          description: e.description,
          lines: e.lines,
        }));
      } catch (err) {
        console.warn('[TindaHand] Backend journal fetch failed, falling back to local only:', err);
      }

      // Merge backend entries with any local in-session entries not yet persisted.
      const allEntries: readonly JournalEntry[] = [...backendEntries, ...localEntries];
      const repo = financialRepositoryFromEntries(allEntries, storeName);
      const value = await repo.getReport(owner, kind, filters.applied);
      return value;
    }

    fetchAndBuild()
      .then(value => {
        if (current) setResult({ selection: filters.applied, revision, ownerId: owner?.id, kind, report: value, error: false, entryCount });
      })
      .catch(() => {
        if (current) setResult({ selection: filters.applied, revision, ownerId: owner?.id, kind, report: null, error: true, entryCount });
      });

    return () => { current = false; };
  }, [owner, kind, filters.applied, revision, localEntries, entryCount, storeName]);

  return { filters, report, loading, error, refresh, pending: !samePeriod(filters.draft, filters.applied),
    setDraft: (selection: ReportSelection) => dispatch({ type: 'draft', selection }),
    apply: () => dispatch({ type: 'apply' }), reset: () => dispatch({ type: 'reset', today: storeToday() }) };
}
