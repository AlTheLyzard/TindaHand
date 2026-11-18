/**
 * POS API service — checkout and sales history.
 */

import { apiFetch } from '@/services/api';
import type { ChangeBreakdown, CheckoutApiResult, PaymentDraft, ProductSelection } from '@/types/pos';

export type { ChangeBreakdown };

export interface CheckoutResponse {
  sale: { id: string };
  change: ChangeBreakdown | null;
}

export interface Customer {
  id: string;
  name: string;
}

/**
 * Maps the frontend PaymentDraft → the flat shape the backend expects.
 * Backend PaymentDraft fields: method, cashRaw, gcashRaw, reference,
 * customerName, customerId, partialMethod.
 */
function mapDraft(draft: PaymentDraft): object {
  const base = {
    method: draft.method,
    customerName: draft.customerName ?? '',
    customerId: draft.customerId ?? null,
    partialMethod: draft.partialMethod ?? null,
  };

  if (draft.method === 'cash') {
    return { ...base, cashRaw: draft.cashAmount, gcashRaw: null, reference: '' };
  }
  if (draft.method === 'gcash') {
    return { ...base, cashRaw: null, gcashRaw: draft.gcashAmount, reference: draft.gcashReference };
  }
  if (draft.method === 'split') {
    return { ...base, cashRaw: draft.splitCashAmount, gcashRaw: draft.splitGcashAmount, reference: draft.splitReference };
  }
  // partial
  const partialCash  = draft.partialMethod === 'cash'  ? draft.partialAmount : null;
  const partialGcash = draft.partialMethod === 'gcash' ? draft.partialAmount : null;
  return { ...base, cashRaw: partialCash, gcashRaw: partialGcash, reference: draft.partialReference };
}

/**
 * Complete a sale. Deducts stock (FEFO), creates the sale record,
 * runs Greedy Coin Change for cash payments, and handles partial (debt) sales.
 */
export async function checkout(data: {
  id: string;
  occurredAt: string;
  selection: ProductSelection;
  draft: PaymentDraft;
  kaheraId?: string | null;
}): Promise<CheckoutApiResult> {
  // Parse numeric Kahera ID from "TH-KH-XXXX" format
  let kahera_id: number | null = null;
  if (data.kaheraId) {
    const numeric = parseInt(data.kaheraId.replace(/^TH-KH-/i, ''), 10);
    if (!isNaN(numeric)) kahera_id = numeric;
  }

  const body = {
    id: data.id,
    occurredAt: data.occurredAt,
    selection: data.selection,
    draft: mapDraft(data.draft),
    kahera_id,
  };

  const result = await apiFetch<CheckoutResponse>('/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return { saleId: result.sale.id, change: result.change };
}

/** List customers for the current store. */
export async function getCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>('/pos/customers');
}

/** Create a new customer. */
export async function createCustomer(name: string): Promise<Customer> {
  return apiFetch<Customer>('/pos/customers', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
