import { t } from '@/i18n';
import type { AccountRole } from '@/types/auth';

export function parseAccountRole(value: string | string[] | undefined): AccountRole | null {
  return value === 'owner' || value === 'cashier' ? value : null;
}

export function validateLogin(id: string, pin: string) {
  return {
    id: id.trim() ? undefined : t('validation.ownerIdRequired'),
    pin: /^[0-9]{4}$/.test(pin) ? undefined : t('validation.loginPin'),
  };
}
