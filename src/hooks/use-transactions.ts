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
  // Both POS sales and ledger records are stamped with the owner's ID as ownerId,
  // regardless of whether Kahera or May-Ari recorded them.  Always filter by the
  // owner's ID so projectTransactions can match sales correctly.
  // (The disk key used by inventory for pos-sales is deviceSession.id for Kahera,
  // but that is handled entirely by inventory.tsx — useTransactions never calls
  // loadJson/persistJson directly; it just receives the already-loaded pos.sales.)
  const ledgerOwnerId = owner?.id ?? operator?.ownerId;
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
    () => (ledgerOwnerId ? transactionLedgerForOwner(ledgerOwnerId, scope) : null),
    [ledgerOwnerId, scope, transactionLedgerForOwner],
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

  // ── Mock/preview path: re-project whenever the local data source changes ──
  // This runs any time pos.sales, the ledger, or scope changes — including when
  // pos.sales is hydrated from disk after a restart.  The confirmed path has its
  // own effect below so the two never interfere.
  useEffect(() => {
    if (confirmedMode) return;
    let active = true;
    const request: Promise<TransactionRecord[]> = ledgerOwnerId
      ? readTransactions(ledgerOwnerId, source)
      : Promise.resolve([]);
    void request
      .then((rows) => {
        if (active) setResult({ rows, source, error: "" });
      })
      .catch(() => {
        if (active)
          setResult({ rows: [], source, error: "Could not load transactions. Please try again." });
      });
    return () => {
      active = false;
    };
  // source is a stable useMemo ref — it only changes when pos, ledger, scope, or
  // revision changes, so this effect is safe to track it directly.
  }, [ledgerOwnerId, confirmedMode, source]);

  // ── Confirmed (real API) path: fetch from backend on revision bump ──────
  useEffect(() => {
    if (!confirmedMode) return;
    let active = true;
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
    return () => {
      active = false;
    };
  }, [confirmedMode, operator?.operatorId, revision]);

  // Re-fetch when the screen comes back into focus (e.g. after recording a sale).
  // For the confirmed path, bump revision so the API effect re-fires.
  // For the mock path, source already reflects the latest pos.sales so a revision
  // bump isn't strictly necessary — but it re-projects the seed in case new
  // quick-add records landed while the screen was off-focus.
  useFocusEffect(
    useCallback(() => {
      setRevision((value) => value + 1);
    }, []),
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
