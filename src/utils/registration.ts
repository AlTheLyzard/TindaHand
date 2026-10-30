import { t } from '@/i18n';
import type { RegistrationErrors, RegistrationFormValues } from '@/types/auth';

export const PASSWORD_HELP_KEY = 'validation.passwordHelp' as const;

export function validateRegistration(values: RegistrationFormValues): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!values.name.trim()) errors.name = t('validation.requiredFields');
  if (!values.password) {
    errors.password = t('validation.passwordRequired', { help: t(PASSWORD_HELP_KEY) });
  } else if (
    values.password.length < 8 ||
    !/[a-z]/.test(values.password) ||
    !/[A-Z]/.test(values.password) ||
    !/[0-9]/.test(values.password) ||
    !/[^a-zA-Z0-9\s]/.test(values.password)
  ) {
    errors.password = t(PASSWORD_HELP_KEY);
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = t('validation.confirmPasswordRequired');
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = t('validation.passwordMismatch');
  }
  if (!values.pin) {
    errors.pin = t('validation.pinRequired');
  } else if (!/^[0-9]{4}$/.test(values.pin)) {
    errors.pin = t('validation.pinFormat');
  }
  if (!values.confirmPin) {
    errors.confirmPin = t('validation.confirmPinRequired');
  } else if (!/^[0-9]{4}$/.test(values.confirmPin)) {
    errors.confirmPin = t('validation.confirmPinFormat');
  } else if (values.pin !== values.confirmPin) {
    errors.confirmPin = t('validation.pinMismatch');
  }
  return errors;
}
