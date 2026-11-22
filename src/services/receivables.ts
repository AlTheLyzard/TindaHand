import { apiFetch } from "@/services/api";
import type { OwnerIdentity } from "@/types/auth";
import type { QuickAddDraft } from "@/types/quick-add";
import type { InventoryAction, InventoryStore } from "@/utils/inventory";

// ── Legacy in-memory adapter (used by state/inventory.tsx — do not remove) ──────────────
export function createReceivablesService(
  getStore: () => InventoryStore,
  dispatch: (action: InventoryAction) => boolean,
) {
  return {
    saveDebt(owner: OwnerIdentity | null, token: string, draft: QuickAddDraft) {
      if (!owner) throw new Error("A store session is required.");
      const existing = getStore().pos?.debts.find(
        (row) => row.id === token && row.ownerId === owner.id,
      );
      if (existing) return existing;
      if (
        !dispatch({
          type: "saveCustomerDebt",
          command: {
            id: token,
            ownerId: owner.id,
            occurredAt: new Date().toISOString(),
            draft,
          },
        })
      )
        throw new Error(
          "Check customer, amount, due date and available stock.",
        );
      return getStore().pos!.debts.find(
        (row) => row.id === token && row.ownerId === owner.id,
      )!;
    },
    confirmPayment(
      owner: OwnerIdentity | null,
      token: string,
      debtId: string,
      amount: string,
    ) {
      if (!owner) throw new Error("A store session is required.");
      const existing = getStore().receivablePayments?.find(
        (row) => row.id === token && row.ownerId === owner.id,
      );
      if (existing) return existing;
      if (
        !dispatch({
          type: "confirmReceivablePayment",
          command: {
            id: token,
            ownerId: owner.id,
            occurredAt: new Date().toISOString(),
            debtId,
            amount,
          },
        })
      )
        throw new Error("Check the amount against the current debt balance.");
      return getStore().receivablePayments!.find(
        (row) => row.id === token && row.ownerId === owner.id,
      )!;
    },
  };
}

// ── Real API functions ────────────────────────────────────────────────────────────────────

export interface CustomerDebtLine {
  productId: string;
  itemName: string;
  unitPriceCentavos: number;
  quantity: number;
}

export interface CustomerDebt {
  id: string;
  ownerId: string;
  customerId: string | null;
  saleId: string | null;
  name: string;
  originalAmountCentavos: number;
  amountCentavos: number;
  paidCentavos: number | null;
  borrowing: 'cash' | 'product' | null;
  /** Product line items — present for product-borrowing debts, null/absent for cash */
  items: Record<string, CustomerDebtLine> | null;
  dueDate: string | null;
  details: string | null;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  occurredAt: string;
}

export interface DebtPayment {
  id: string;
  ownerId: string;
  debtId: string;
  amountCentavos: number;
  reference: string | null;
  occurredAt: string;
}

export interface Customer {
  id: number;
  name: string;
}

/** List all customer debts (accounts receivable). */
export async function getReceivables(): Promise<CustomerDebt[]> {
  return apiFetch<CustomerDebt[]>("/receivables");
}

/** Record a new customer debt. */
export async function createReceivable(data: {
  name: string;
  customerId?: string;
  amountCentavos: number;
  borrowing: 'cash' | 'product';
  /** Product line items — required when borrowing is 'product' */
  items?: Record<string, CustomerDebtLine>;
  dueDate?: string;
  details?: string;
  occurredAt: string;
}): Promise<CustomerDebt> {
  return apiFetch<CustomerDebt>("/receivables", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** List AR payments. */
export async function getReceivablePayments(): Promise<DebtPayment[]> {
  return apiFetch<DebtPayment[]>("/receivables/payments");
}

/** Record a payment against a customer debt. */
export async function createReceivablePayment(data: {
  debtId: string;
  amountCentavos: number;
  occurredAt: string;
}): Promise<DebtPayment> {
  return apiFetch<DebtPayment>("/receivables/payments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** List customers for the current owner. */
export async function getCustomers(): Promise<Customer[]> {
  const data = await apiFetch<{ id: string; ownerId: string; name: string }[]>("/pos/customers");
  return data.map(c => ({ id: c.id, name: c.name }));
}

/** Create a new customer. */
export async function createCustomer(name: string): Promise<Customer> {
  const data = await apiFetch<{ id: string; ownerId: string; name: string }>("/pos/customers", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return { id: data.id, name: data.name };
}
