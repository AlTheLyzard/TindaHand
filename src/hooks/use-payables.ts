/**
 * useApiPayables — fetches store debts, creditors, and payments from the real backend
 * for confirmed owners. Returns them shaped as PayablesLedger so payableLists() works
 * without changes in account-balances-screen.tsx.
 */
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getCreditors,
  getPayables,
  getPayablePayments,
  type StoreCreditor as ApiCreditor,
  type StoreDebt as ApiDebt,
  type StoreDebtPayment as ApiPayment,
} from "@/services/payables";
import type { Creditor, PayableDebt, PayablePayment, PayablesLedger } from "@/types/payables";

function toCreditor(c: ApiCreditor, ownerId: string): Creditor {
  return { id: String(c.id), ownerId, name: c.name };
}

function toPayableDebt(d: ApiDebt, ownerId: string): PayableDebt {
  return {
    id: String(d.id),
    ownerId,
    creditorId: String(d.creditorId),
    name: d.creditorName,
    originalAmountCentavos: d.amountCentavos,
    borrowingType: "cash",
    dueDate: d.dueDate ?? null,
    details: d.details ?? "",
    occurredAt: d.occurredAt,
  };
}

function toPayablePayment(p: ApiPayment, ownerId: string): PayablePayment {
  return {
    id: String(p.id),
    ownerId,
    debtId: String(p.debtId),
    amountCentavos: p.amountCentavos,
    occurredAt: p.occurredAt,
  };
}

const emptyLedger: PayablesLedger = { creditors: [], debts: [], payments: [] };

export function useApiPayables(ownerId: string | undefined) {
  const [ledger, setLedger] = useState<PayablesLedger>(emptyLedger);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.allSettled([
      getCreditors(),
      getPayables(),
      getPayablePayments(),
    ]).then(([creditorsResult, debtsResult, paymentsResult]) => {
      if (!active) return;
      const allFailed =
        creditorsResult.status === "rejected" &&
        debtsResult.status === "rejected" &&
        paymentsResult.status === "rejected";
      if (allFailed) {
        setError("Could not load payables. Please try again.");
      } else {
        setLedger({
          creditors:
            creditorsResult.status === "fulfilled"
              ? creditorsResult.value.map((c) => toCreditor(c, ownerId))
              : [],
          debts:
            debtsResult.status === "fulfilled"
              ? debtsResult.value.map((d) => toPayableDebt(d, ownerId))
              : [],
          payments:
            paymentsResult.status === "fulfilled"
              ? paymentsResult.value.map((p) => toPayablePayment(p, ownerId))
              : [],
        });
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [ownerId, revision]);

  const refresh = useCallback(() => setRevision((v) => v + 1), []);

  // Re-fetch when the screen comes back into focus (e.g. after recording a debt or payment).
  useFocusEffect(
    useCallback(() => {
      if (ownerId) setRevision((v) => v + 1);
    }, [ownerId]),
  );

  return { ledger, loading, error, refresh };
}
