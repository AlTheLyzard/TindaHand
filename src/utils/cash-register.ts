import { parsePaymentAmount } from './pos-payment';

export function cashAmountError(value: string) {
  if (!value.trim()) return 'Please enter the amount.';
  const amount = parsePaymentAmount(value);
  if (amount === null) return 'Enter a valid peso amount with up to two decimal places.';
  if (amount <= 0) return 'Enter an amount greater than zero.';
  return null;
}

/** Session-only adjustments. A form token is consumed synchronously, before React renders. */
export function createCashRegisterStore() {
  let nextToken = 0;
  let total = 0;
  const used = new Set<number>();
  return {
    begin() { return ++nextToken; },
    add(token: number, value: string, openingBalance: number): number | null {
      const amount = parsePaymentAmount(value);
      if (!Number.isInteger(token) || token < 1 || token > nextToken || used.has(token) || cashAmountError(value) || amount === null) return null;
      if (!Number.isSafeInteger(openingBalance + total + amount)) return null;
      used.add(token);
      total += amount;
      return total;
    },
  };
}
