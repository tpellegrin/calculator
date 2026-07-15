/**
 * Locale-aware number formatting for the physical-calculator display.
 *
 * Single T-007-owned presentation module. It converts a finite `number`
 * (produced by T-006 from a validated API response) into a stable, locale-
 * aware string per contract §5.5:
 *
 *   - up to 15 significant digits;
 *   - scientific notation for magnitudes outside `[1e-6, 1e15)`;
 *   - grouping separators for standard notation only;
 *   - negative zero is normalized to `0`;
 *   - non-finite inputs surface as `'NaN'` (never silently hidden — this
 *     represents a T-006 defect the caller must not paper over).
 *
 * This module must not:
 *   - perform arithmetic;
 *   - parse user input;
 *   - alter T-006 state;
 *   - infer locale from module-level state.
 */
import type { Locale } from 'i18n';

/**
 * Formats a finite `number` for presentation in the calculator display.
 *
 * `locale` is an explicit parameter — the mapping never inspects mutable
 * module or window state. The `'pseudo'` locale is not a BCP-47 tag and is
 * mapped to `'en-US'` for the underlying `Intl.NumberFormat`; pseudo-string
 * localization is applied to translated *text*, not to numeric formatting.
 */
export function formatNumber(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return 'NaN';

  const normalized = Object.is(value, -0) ? 0 : value;

  const absValue = Math.abs(normalized);
  const isExtreme = absValue !== 0 && (absValue < 1e-6 || absValue >= 1e15);

  const intlLocale: string = locale === 'pseudo' ? 'en-US' : locale;

  return new Intl.NumberFormat(intlLocale, {
    notation: isExtreme ? 'scientific' : 'standard',
    maximumSignificantDigits: 15,
    useGrouping: !isExtreme,
  }).format(normalized);
}
