import enUS from './locales/en-US.json';
import ptBR from './locales/pt-BR.json';
import pseudo from './locales/pseudo.json';

export type DotNestedKeys<T> = T extends
  | string
  | number
  | boolean
  | null
  | undefined
  ? never
  : {
      [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
        ? `${K}` | `${K}.${DotNestedKeys<T[K]>}`
        : `${K}`;
    }[Extract<keyof T, string>];

export type Messages = typeof enUS;
export type I18nKey = DotNestedKeys<Messages>;

const locales = {
  'en-US': enUS,
  'pt-BR': ptBR,
  pseudo,
} as const;

export type Locale = keyof typeof locales;

export const SUPPORTED_LOCALES: readonly Locale[] = [
  'en-US',
  'pt-BR',
  'pseudo',
];

// Base UI language for fallbacks — chosen intentionally.
const baseLocale: Locale = 'en-US';

let currentLocale: Locale = baseLocale;

export const getLocale = (): Locale => currentLocale;
export const setLocale = (locale: Locale) => {
  currentLocale = locale;
};

const getByPath = (obj: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (
      acc &&
      typeof acc === 'object' &&
      part in (acc as Record<string, unknown>)
    ) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
};

const interpolate = (
  template: string,
  params?: Record<string, string | number>,
) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`,
  );
};

export const t = (
  key: I18nKey,
  params?: Record<string, string | number>,
): string => {
  const candidate = getByPath(locales[currentLocale], key);
  if (typeof candidate === 'string') return interpolate(candidate, params);
  const fallback = getByPath(locales[baseLocale], key);
  if (typeof fallback === 'string') return interpolate(fallback, params);
  if (
    typeof import.meta !== 'undefined' &&
    import.meta.env?.MODE !== 'production'
  ) {
    // Surface missing key during development
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing key: ${key}`);
  }
  return key; // last-resort echo of the key
};

/**
 * Locale-aware number formatting.
 *
 * The calculator will render numeric operands and results, so a small,
 * locale-aware formatter is retained. Currency/percent/duration formatters
 * were removed from the earlier foundation; add them back if a feature justifies it.
 */
export const formatNumber = (
  value: number,
  opts?: {
    locale?: Locale;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  },
): string => {
  const locale = opts?.locale ?? getLocale();
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 0;
  const useGrouping = opts?.useGrouping ?? true;
  // 'pseudo' is not a valid BCP-47 tag — fall back to the base locale
  // for the Intl API while keeping the pseudo locale for message lookup.
  const intlLocale: string = locale === 'pseudo' ? baseLocale : locale;
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits,
    useGrouping,
  }).format(value);
};

export default {
  t,
  setLocale,
  getLocale,
  formatNumber,
};
