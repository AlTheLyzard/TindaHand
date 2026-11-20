import { transactionSeed } from "@/data/transactions";
import { apiFetch } from "@/services/api";
import {
  projectTransactions,
  type TransactionSources,
} from "@/utils/transactions";

// ── Legacy projection (used by existing transaction-history screen — do not remove) ──────
export async function readTransactions(
  ownerId: string,
  sources: TransactionSources,
) {
  return projectTransactions(ownerId, sources, transactionSeed);
}

// ── Real API function ─────────────────────────────────────────────────────────────────────

import type { TransactionRecord } from "@/types/transactions";

export interface ApiTransactionFilters {
  fromDate?: string; // ISO date string e.g. '2026-11-01'
  toDate?: string;
  /** Backend filter: 'sale' | 'customerPayment' | 'expense' */
  type?: "sale" | "customerPayment" | "expense";
}

/** Fetches the transaction log from the backend.
 *  The backend returns objects that already match TransactionRecord. */
export async function getTransactions(
  filters: ApiTransactionFilters = {},
): Promise<TransactionRecord[]> {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set("from_date", filters.fromDate);
  if (filters.toDate) params.set("to_date", filters.toDate);
  if (filters.type) params.set("type", filters.type);
  const query = params.toString();
  return apiFetch<TransactionRecord[]>(`/transactions${query ? `?${query}` : ""}`);
}
