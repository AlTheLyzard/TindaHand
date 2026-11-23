import { getTransactions, readTransactions } from "@/services/transactions";
import { useAuthFlow } from "@/state/auth-flow";
import { useInventory } from "@/state/inventory";
import { useQuickAdd } from "@/state/quick-add";
import type { TransactionRecord } from "@/types/transactions";
import type { TransactionSources } from "@/utils/transactions";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";

export function useTransactions() {
  const { owner, deviceSession } = useAuthFlow();
  const { store } = useInventory();
  const { transactionLedgerForOwner } = useQuickAdd();
  const operator = deviceSession?.role === "operator" ? deviceSession : null;
  const ownerId = owner?.id ?? operator?.ownerId;
  const scope = operator ? "operator" : "owner";
  const confirmedMode = owner?.mode === "confirmed";

  // ── Mock/preview path: source-keyed result ──────────────────────────────
  const [result, setResult] = useState<{
    rows: TransactionRecord[];
    source: TransactionSources | null;
    error: string;
  }>({ rows: [], source: null, error: "" });

  // ── Real API path: separate loading/rows state to avoid source-equality issues ──
  // The `source` object is rebuilt every render (new reference), so comparing
  // result.source === source for the confirmed API path would cause perpetual
  // loading/blank state even after a successful fetch.
  const [apiState, setApiState] = useState<{
    rows: TransactionRecord[];
    loading: boolean;
    error: string;
  }>({ rows: [], loading: true, error: "" });

  const [revision, setRevision] = useState(0);
  const ledger = useMemo(
    () => (ownerId ? transactionLedgerForOwner(ownerId, scope) : null),
    [ownerId, scope, transactionLedgerForOwner],
  );
  const pos = store.pos;
  const source = useMemo(
    () => ({
      scope,
      revision,
      sales: pos?.sales ?? [],
      customers: pos?.customers ?? [],
      records: ledger?.records ?? [],
      payments: ledger?.receivablePayments ?? [],
      payables: ledger?.payables,
    }),
    [scope, revision, pos, ledger],
  );

  useEffect(() => {
    let active = true;
    if (confirmedMode) {
      // Real API path: fetch from backend; track loading separately.
      // For cashier sessions, scope the results to this Kahera's own records so
      // their history never shows another Kahera's or the May-Ari's transactions.
      const kaheraId = operator?.operatorId ?? undefined;
      setApiState(prev => ({ ...prev, loading: true, error: "" }));
      void getTransactions({ kaheraId })
        .then((rows) => {
          if (active) setApiState({ rows, loading: false, error: "" });
        })
        .catch(() => {
          if (active)
            setApiState({ rows: [], loading: false, error: "Could not load transactions. Please try again." });
        });
    } else {
      // Mock/preview path: project from local seed.
      const request: Promise<TransactionRecord[]> = ownerId
        ? readTransactions(ownerId, source)
        : Promise.resolve([]);
      void request
        .then((rows) => {
          if (active) setResult({ rows, source, error: "" });
        })
        .catch(() => {
          if (active)
            setResult({ rows: [], source, error: "Could not load transactions. Please try again." });
        });
    }
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, confirmedMode, scope, revision]);

  // Re-fetch when the screen comes back into focus (e.g. after recording a sale).
  useFocusEffect(
    useCallback(() => {
      if (confirmedMode) {
        setRevision((value) => value + 1);
      }
    }, [confirmedMode]),
  );

  if (confirmedMode) {
    return {
      rows: apiState.rows,
      error: apiState.error,
      loading: apiState.loading,
      retry: () => setRevision((value) => value + 1),
    };
  }
  return {
    rows: result.source === source ? result.rows : [],
    error: result.source === source ? result.error : "",
    loading: result.source !== source,
    retry: () => setRevision((value) => value + 1),
  };
}
