import type { PaymentDraft, ProductSelection } from '@/types/pos';

export function emptyPaymentDraft(): PaymentDraft {
  return { method: 'cash', cashAmount: '', gcashAmount: '', gcashReference: '',
    splitCashAmount: '', splitGcashAmount: '', splitReference: '',
    partialAmount: '', partialMethod: null, partialReference: '', customerId: null, customerName: '' };
}

/** Parse decimal pesos to exact integer centavos. Reject signs, exponents and rounding. */
export function parsePaymentAmount(value: string): number | null {
  const input = value.trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(input)) return null;
  const [whole, fraction = ''] = input.split('.');
  const centavos = Number(`${whole || '0'}${fraction.padEnd(2, '0')}`);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

export function paymentAmounts(totalCentavos: number, draft: PaymentDraft) {
  const partial = draft.method === 'partial';
  const cashRaw = draft.method === 'split' ? draft.splitCashAmount : partial ? draft.partialMethod === 'cash' ? draft.partialAmount : null : draft.method === 'cash' ? draft.cashAmount : null;
  const gcashRaw = draft.method === 'split' ? draft.splitGcashAmount : partial ? draft.partialMethod === 'gcash' ? draft.partialAmount : null : draft.method === 'gcash' ? draft.gcashAmount : null;
  const cash = cashRaw === null ? 0 : parsePaymentAmount(cashRaw);
  const gcash = gcashRaw === null ? 0 : parsePaymentAmount(gcashRaw);
  const combined = (cash ?? 0) + (gcash ?? 0);
  const safe = Number.isSafeInteger(combined);
  const paidCentavos = safe ? combined : 0;
  // GCash above the total is invalid. Only the Cash portion can fund change.
  const changeCentavos = Math.max(0, (cash ?? 0) - Math.max(0, totalCentavos - (gcash ?? 0)));
  const reference = draft.method === 'split' ? draft.splitReference : partial ? draft.partialReference : draft.gcashReference;
  return { cashRaw, gcashRaw, cash, gcash, safe, paidCentavos, reference,
    remainingCentavos: Math.max(0, totalCentavos - paidCentavos), changeCentavos,
    needsReference: gcashRaw !== null && (draft.method !== 'split' || gcash === null || gcash > 0) };
}

export function paymentErrors(totalCentavos: number, draft: PaymentDraft) {
  const a = paymentAmounts(totalCentavos, draft);
  const fieldError = (raw: string | null, value: number | null) => raw === null ? null : !raw.trim() ? 'required' : value === null ? 'invalid' : null;
  return {
    order: !Number.isSafeInteger(totalCentavos) || totalCentavos <= 0,
    cash: fieldError(a.cashRaw, a.cash), gcash: fieldError(a.gcashRaw, a.gcash) ?? ((a.gcash ?? 0) > totalCentavos ? 'overpayment' : null),
    amount: !a.safe ? 'invalid' : draft.method === 'partial'
      ? a.paidCentavos <= 0 ? 'positive' : a.paidCentavos >= totalCentavos ? 'fullyPaid' : null
      : a.paidCentavos <= 0 ? 'positive' : a.remainingCentavos > 0 ? 'insufficient' : null,
    reference: a.needsReference && !a.reference.trim(),
    customer: draft.method === 'partial' && !draft.customerId && !draft.customerName.trim(),
    tender: draft.method === 'partial' && draft.partialMethod === null,
  } as const;
}

export function orderSelectionKey(selection: ProductSelection) {
  return JSON.stringify(Object.values(selection).sort((a, b) => a.productId.localeCompare(b.productId)));
}
