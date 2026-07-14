import { formatNumber, getLocale, type Locale } from 'i18n';

// Cache for locale separators
const sepCache: Record<string, { group: string; decimal: string }> = {};

/**
 * Returns grouping and decimal separators for a given locale using Intl.NumberFormat.
 */
export const getSeparators = (locale: string) => {
  const hit = sepCache[locale];
  if (hit) return hit;
  const numberWithGroupAndDecimal = 12345.6;
  const parts = new Intl.NumberFormat(locale).formatToParts(
    numberWithGroupAndDecimal,
  );
  const group = parts.find((p) => p.type === 'group')?.value ?? ',';
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  const value = { group, decimal };
  sepCache[locale] = value;
  return value;
};

/**
 * Parses a locale-formatted numeric string into a number.
 * Returns null for empty/invalid transient states (e.g., "-", "0,", ".").
 */
export const parseLocaleNumber = (text: string, locale: string) => {
  const { group, decimal } = getSeparators(locale);
  const cleaned = text
    .replace(new RegExp(`[^0-9\\${decimal}-]`, 'g'), '')
    .replace(new RegExp(`\\${group}`, 'g'), '')
    .replace(decimal, '.');
  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.')
    return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/**
 * Formats a number according to the given locale.
 *
 * The earlier currency mode was removed alongside `formatCurrency`; add a
 * dedicated formatter alongside a real feature if one is ever needed.
 */
export const formatWithIntl = (
  value: number,
  opts: {
    locale?: Locale;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  } = {},
) => {
  const { maximumFractionDigits, useGrouping } = opts;
  const locale = opts.locale ?? getLocale();
  return formatNumber(value, {
    locale,
    maximumFractionDigits: maximumFractionDigits ?? 0,
    useGrouping: useGrouping ?? true,
  });
};
