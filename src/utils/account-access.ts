import { t } from '@/i18n';
import type { AccountRole } from '@/types/auth';
import { isOwnerId } from '@/utils/owner-id';

export function parseAccountRole(value: string | string[] | undefined): AccountRole | null {
  return value === 'owner' || value === 'cashier' ? value : null;
}

export function validateLogin(id: string, pin: string) {
  return {
    id: !id.replace(/-/g, '').trim() ? t('validation.ownerIdRequired')
      : isOwnerId(id) ? undefined : t('validation.ownerIdFormat'),
    pin: !pin.trim() ? t('validation.loginPinRequired')
      : /^[0-9]{4}$/.test(pin) ? undefined : t('validation.loginPin'),
  };
}
