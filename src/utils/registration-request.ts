import { t } from '@/i18n';
import type { RegistrationFormValues, RegistrationResult, RegistrationService } from '@/types/auth';
import { validateRegistration } from '@/utils/registration';

/** One in-flight request at a time, including calls within the same render/event turn. */
export function createRegistrationRequest(service: RegistrationService) {
  let inFlight = false;
  let completed = false;
  return async (values: RegistrationFormValues): Promise<RegistrationResult | null> => {
    if (inFlight || completed) return null;
    const fields = validateRegistration(values);
    if (Object.keys(fields).length) return { status: 'error', message: t('validation.correctFields'), fields };
    inFlight = true;
    try {
      const result = await service({ ...values, name: values.name.trim() });
      if (result.status === 'confirmed' && (!result.account?.id?.trim() || !result.account?.name?.trim())) {
        return { status: 'error', message: t('auth.registration.unconfirmed') };
      }
      if (result.status === 'confirmed') completed = true;
      return result;
    } catch {
      // Never render raw exceptions: a transport might include request credentials.
      return { status: 'error', message: t('auth.registration.requestFailed') };
    } finally {
      inFlight = false;
    }
  };
}
