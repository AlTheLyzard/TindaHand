import { useCallback, useEffect, useReducer, useState } from 'react';
import { useAuthFlow } from '@/state/auth-flow';
import { financialRepository } from '@/services/financial';
import type { FinancialReport, ReportKind, ReportSelection } from '@/types/financial';
import { presetSelection, reportFilterReducer, samePeriod, storeToday } from '@/utils/financial';

export function useFinancialReport(kind: ReportKind) {
  const { owner } = useAuthFlow();
  const [filters, dispatch] = useReducer(reportFilterReducer, undefined, () => {
    const today = presetSelection('today'); return { draft: today, applied: { ...today } };
  });
  const [result, setResult] = useState<{ selection: ReportSelection; revision: number; ownerId: string | undefined; kind: ReportKind; report: FinancialReport | null; error: boolean } | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const loading = result?.selection !== filters.applied || result?.revision !== revision || result?.ownerId !== owner?.id || result?.kind !== kind;
  const report = result?.report ?? null;
  const error = !loading && !!result?.error;
  useEffect(() => {
    let current = true;
    void financialRepository.getReport(owner, kind, filters.applied).then(value => {
      if (current) setResult({ selection: filters.applied, revision, ownerId: owner?.id, kind, report: value, error: false });
    }).catch(() => { if (current) setResult({ selection: filters.applied, revision, ownerId: owner?.id, kind, report: null, error: true }); });
    return () => { current = false; };
  }, [owner, kind, filters.applied, revision]);
  return { filters, report, loading, error, refresh, pending: !samePeriod(filters.draft, filters.applied),
    setDraft: (selection: ReportSelection) => dispatch({ type: 'draft', selection }),
    apply: () => dispatch({ type: 'apply' }), reset: () => dispatch({ type: 'reset', today: storeToday() }) };
}
