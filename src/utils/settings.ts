import type { CashierValues, PinValues, SettingsErrors, SyncState } from '@/types/settings';

export function validatePinPair(values: Pick<CashierValues, 'pin' | 'confirmPin'>): SettingsErrors {
  const errors: SettingsErrors = {};
  if (!values.pin) errors.pin = 'Please complete the required fields.';
  else if (!/^[0-9]{4}$/.test(values.pin)) errors.pin = 'Enter exactly four numeric digits.';
  if (!values.confirmPin) errors.confirmPin = 'Please complete the required fields.';
  else if (!/^[0-9]{4}$/.test(values.confirmPin)) errors.confirmPin = 'Enter exactly four numeric digits.';
  else if (values.pin !== values.confirmPin) errors.confirmPin = 'The new PINs do not match.';
  return errors;
}
export function validatePinChange(values: PinValues): SettingsErrors {
  return { ...validatePinPair(values), ...(!values.ownerPin
    ? { ownerPin: 'Please complete the required fields.' }
    : !/^[0-9]{4}$/.test(values.ownerPin) ? { ownerPin: 'Enter exactly four numeric digits.' } : {}) };
}
export function validateCashier(values: CashierValues): SettingsErrors {
  return { ...validatePinPair(values), ...(!values.name.trim() ? { name: 'Please complete the required fields.' } : {}) };
}
export function canClearCache(state: SyncState): boolean {
  return state.pendingRecords === 0 && state.status !== 'syncing';
}
