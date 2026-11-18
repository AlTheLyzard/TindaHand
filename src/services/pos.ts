/**
 * POS API service — checkout and sales history.
 * The existing inventory state reducer handles the current mock POS flow.
 * These functions are the backend replacement for POST /pos/checkout.
 */

import { apiFetch } from '@/services/api';

export type PaymentMethod = 'cash' | 'gcash' | 'split' | 'partial';

export interface CheckoutItem {
  productId: number;
  quantity: number;
}

export interface CheckoutPayment {
  method: PaymentMethod;
  amountCentavos: number;
}

export interface ChangeBreakdown {
  totalChangeCentavos: number;
  breakdown: Record<number, number>; // denomination → count
}

export interface CheckoutResult {
  saleId: number;
  totalCentavos: number;
  change: ChangeBreakdown | null;
  customerDebtId: number | null;
  occurredAt: string;
}

export interface Sale {
  id: number;
  totalCentavos: number;
  paymentMethod: PaymentMethod;
  customerId: number | null;
  occurredAt: string;
}

export interface Customer {
  id: number;
  name: string;
}

/**
 * Complete a sale. Deducts stock (FEFO), creates the sale record,
 * runs Greedy Coin Change for cash payments, and handles partial (debt) sales.
 */
export async function checkout(data: {
  items: CheckoutItem[];
  payments: CheckoutPayment[];
  customerId?: number;
  customerName?: string;
}): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>('/pos/checkout', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/** List sales (optionally filtered by date range). */
export async function getSales(params?: { fromDate?: string; toDate?: string }): Promise<Sale[]> {
  const query = new URLSearchParams();
  if (params?.fromDate) query.set('from_date', params.fromDate);
  if (params?.toDate) query.set('to_date', params.toDate);
  const qs = query.toString();
  return apiFetch<Sale[]>(`/pos/sales${qs ? `?${qs}` : ''}`);
}

/** Get a single sale by ID. */
export async function getSale(id: number): Promise<Sale> {
  return apiFetch<Sale>(`/pos/sales/${id}`);
}

/** List customers. */
export async function getCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>('/pos/customers');
}

/** Create a customer. */
export async function createCustomer(name: string): Promise<Customer> {
  return apiFetch<Customer>('/pos/customers', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}
