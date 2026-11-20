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

export type TransactionType = "in" | "out";

export interface Transaction {
  id: string;
  type: TransactionType;
  amountCentavos: number;
  description: string;
  occurredAt: string;
  referenceKind: "sale" | "debt_payment" | "expense" | "cash_movement";
  referenceId: number;
}

export interface TransactionFilters {
  fromDate?: string; // ISO date string e.g. '2026-11-01'
  toDate?: string;
  type?: TransactionType;
}

/** Fetches the transaction log from the backend. */
export async function getTransactions(
  filters: TransactionFilters = {},
): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (filters.fromDate) params.set("from_date", filters.fromDate);
  if (filters.toDate) params.set("to_date", filters.toDate);
  if (filters.type) params.set("type", filters.type);
  const query = params.toString();
  return apiFetch<Transaction[]>(`/transactions${query ? `?${query}` : ""}`);
}
