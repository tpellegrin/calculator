/**
 * Pure display-string derivation for the physical-calculator display.
 *
 * T-006 exposes a `displayValue` selector, but its result-branch formatting
 * (`String(number)`) predates T-007 and does not apply the contract §5.5
 * significant-digit and locale rules. T-007 owns presentation formatting,
 * so the composition boundary derives the visible string here:
 *
 *   - buffer branches echo the canonical T-006 buffer with the locale's
 *     decimal separator glyph (already handled by `selectDisplayValue`);
 *   - success branches route the finite result number through the T-007
 *     `formatNumber` helper (locale-aware, 15 significant digits, scientific
 *     notation for extreme magnitudes).
 *
 * This module is React-independent and free of side effects. It reads only
 * public T-006 state and returns strings; it never mutates state, dispatches
 * actions, or infers new calculator behavior.
 */
import type { Locale } from 'i18n';

import type { State } from '../state/types';
import { selectDisplayValue } from '../state/logic';
import { formatNumber } from './formatNumber';

/**
 * Returns the string the display should render for `state` at `locale`.
 *
 * When the current or previous state carries a backend result, formatting
 * flows through `formatNumber`. Otherwise, the canonical T-006 buffer echo
 * is used unchanged.
 */
export function selectDisplayString(state: State, locale: Locale): string {
  if (state.type === 'success') {
    return formatNumber(state.result, locale);
  }

  if (
    state.type === 'submitting' ||
    state.type === 'retryableFailure' ||
    state.type === 'domainFailure'
  ) {
    const inner = state.previousState;
    if (inner.type === 'success') {
      return formatNumber(inner.result, locale);
    }
  }

  return selectDisplayValue(state, locale);
}
