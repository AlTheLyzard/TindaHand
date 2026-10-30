import { useSyncExternalStore } from 'react';

import { DEFAULT_LOCALE, getAppLocale, subscribeToLocale, t } from '@/i18n';

/** All localized screens subscribe here; changing a future preference rerenders copy. */
export function useTranslation() {
  const locale = useSyncExternalStore(subscribeToLocale, getAppLocale, () => DEFAULT_LOCALE);
  return { locale, t };
}
