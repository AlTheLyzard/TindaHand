/**
 * useApiExpenses — fetches expenses from the real backend for confirmed owners.
 * Returns a list shaped as ExpenseRecord[] so it plugs directly into the existing
 * filterExpenses / monthlyExpenses utilities without any screen-level changes.
 */
import { useCallback, useEffect, useState } from "react";
import { getExpenses, type Expense } from "@/services/expenses";
import type { ExpenseRecord } from "@/types/expenses";

/** Convert a backend Expense row into the local ExpenseRecord shape. */
function toExpenseRecord(expense: Expense): ExpenseRecord {
  return {
    id: String(expense.id),
    ownerId: "", // owner is implied by the authenticated session
    kind: "expense",
    name: expense.name,
    amountCentavos: expense.amountCentavos,
    category: expense.category,
    details: expense.details ?? "",
    expenseDate: expense.expenseDate,
    dueDate: null,
    borrowing: null,
    items: {},
    paymentStatus: null,
    occurredAt: expense.occurredAt,
  };
}

export function useApiExpenses() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getExpenses()
      .then((rows) => {
        if (active) {
          setExpenses(rows.map(toExpenseRecord));
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("Could not load expenses. Please try again.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const refresh = useCallback(() => setRevision((v) => v + 1), []);

  return { expenses, loading, error, refresh };
}
