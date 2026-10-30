import { t } from '@/i18n';
import type { RegistrationService } from '@/types/auth';

// TODO(BACKEND): No request is sent; registration always returns unavailable.
// Validate credentials server-side and return confirmed identity only after a
// successful write. See docs/api-contract.md#authentication; recovery is unresolved.
export const registerOwner: RegistrationService = async () => ({
  status: 'error',
  message: t('auth.registration.unavailable'),
});
