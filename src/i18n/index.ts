import { en } from './en';

export const DEFAULT_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['en', 'fil'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationKey = keyof typeof en;
export type NavigationLabelKey = Extract<TranslationKey, `navigation.${string}`>;
const localeFormats: Record<AppLocale, { date: string; number: string }> = {
  en: { date: 'en-US', number: 'en-PH' },
  fil: { date: 'fil-PH', number: 'fil-PH' },
};
type Catalog = Record<TranslationKey, string>;
type Placeholders<S extends string> = S extends `${string}{{${infer Name}}}${infer Rest}` ? Name | Placeholders<Rest> : never;
type Arguments<K extends TranslationKey> = [Placeholders<(typeof en)[K]>] extends [never]
  ? [values?: never]
  : [values: Record<Placeholders<(typeof en)[K]>, string | number>];

// Register a complete `fil` catalog here when its translations are approved.
// Reserving a locale does not enable it: unavailable languages resolve to English.
const catalogs: Partial<Record<AppLocale, Catalog>> = { en };
let appLocale: AppLocale = DEFAULT_LOCALE;
const listeners = new Set<() => void>();

export function getAppLocale(): AppLocale { return appLocale; }
export function getLocaleFormats() { return localeFormats[appLocale]; }
export function subscribeToLocale(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Future preference seam only: no device detection, persistence or language UI. */
export function setAppLocale(locale: AppLocale) {
  const next = catalogs[locale] ? locale : DEFAULT_LOCALE;
  if (next === appLocale) return;
  appLocale = next;
  listeners.forEach((listener) => listener());
}

export function translate<K extends TranslationKey>(locale: AppLocale, key: K, ...args: Arguments<K>): string {
  const template = catalogs[locale]?.[key] ?? en[key];
  const values = args[0] as Record<string, string | number> | undefined;
  // A callback preserves literal $, braces and other characters in names/content.
  return template.replace(/\{\{(\w+)\}\}/g, (placeholder, name: string) =>
    values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : placeholder);
}

/** Non-React callers (validation/adapters) use the same current locale. */
export function t<K extends TranslationKey>(key: K, ...args: Arguments<K>): string {
  return translate(appLocale, key, ...args);
}
