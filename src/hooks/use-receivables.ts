/**
 * useApiReceivables — fetches customer debts and payments from the real backend
 * for confirmed owners. Returns them in the shapes that receivableLists() expects
 * so the overview screen needs minimal changes.
 */
import { useCallback, useEffect, useState } from "react";
import {
  getReceivables,
  getReceivablePayments,
  type CustomerDebt as ApiCustomerDebt,
  type DebtPayment as ApiDebtPayment,
} from "@/services/receivables";
import type { QuickAddRecord } from "@/types/quick-add";
import type { ReceivablePayment } from "@/types/receivables";

/** Convert a backend CustomerDebt row into the local QuickAddRecord shape. */
function toQuickAddRecord(debt: ApiCustomerDebt, ownerId: string): QuickAddRecord {
  return {
    id: String(debt.id),
    ownerId,
    kind: "customerDebt",
    name: debt.customerName,
    amountCentavos: debt.amountCentavos,
    originalAmountCentavos: debt.amountCentavos,
    paidCentavos: 0,
    category: null,
    details: debt.details ?? "",
    expenseDate: null,
    dueDate: debt.dueDate ?? null,
    borrowing: "cash",
    items: {},
    paymentStatus: "unpaid",
    customerId: debt.customerId != null ? String(debt.customerId) : undefined,
    occurredAt: debt.occurredAt,
  };
}

/** Convert a backend DebtPayment row into the local ReceivablePayment shape. */
function toReceivablePayment(
  payment: ApiDebtPayment,
  ownerId: string,
): ReceivablePayment {
  return {
    id: String(payment.id),
    ownerId,
    debtId: String(payment.debtId),
    amountCentavos: payment.amountCentavos,
    occurredAt: payment.occurredAt,
  };
}

export function useApiReceivables(ownerId: string | undefined) {
  const [debts, setDebts] = useState<QuickAddRecord[]>([]);
  const [payments, setPayments] = useState<ReceivablePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.allSettled([getReceivables(), getReceivablePayments()]).then(
      ([debtsResult, paymentsResult]) => {
        if (!active) return;
        if (debtsResult.status === "fulfilled") {
          setDebts(debtsResult.value.map((d) => toQuickAddRecord(d, ownerId)));
        }
        if (paymentsResult.status === "fulfilled") {
          setPayments(
            paymentsResult.value.map((p) => toReceivablePayment(p, ownerId)),
          );
        }
        if (
          debtsResult.status === "rejected" &&
          paymentsResult.status === "rejected"
        ) {
          setError("Could not load receivables. Please try again.");
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [ownerId, revision]);

  const refresh = useCallback(() => setRevision((v) => v + 1), []);

  return { debts, payments, loading, error, refresh };
}
