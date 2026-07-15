/**
 * Presentation mapping from a T-006-classified calculator error key to a
 * localization key inside the `calculator.errors` namespace.
 *
 * Single T-007-owned mapping. The renderer performs the actual translation
 * so a locale change updates existing error text without state loss and
 * without recomputing anything in T-006.
 *
 * This module must not:
 *   - create or store error state;
 *   - infer retryability (that is T-006's decision, exposed as `canRetry`);
 *   - inspect raw server messages;
 *   - translate at module initialization time;
 *   - return hard-coded English strings.
 */
import type { I18nKey } from 'i18n';
import type { ApiErrorCode } from 'api/types';

/**
 * The closed set of error keys T-006 may expose to the presentation layer.
 *
 * Mirrors `ReturnType<typeof selectErrorKey>` from the T-006 hook. Kept as
 * a locally-defined union so newly introduced codes surface as compile-time
 * errors in the exhaustive switch below.
 */
export type CalculatorErrorKey = ApiErrorCode | 'network';

/**
 * Fallback localization key used when a `null` or genuinely unclassifiable
 * error must still be presented. Callers pass the T-006 error key directly;
 * `null` short-circuits to `null` (no status to announce).
 */
const FALLBACK_KEY: I18nKey = 'calculator.errors.generic';

/**
 * Maps a T-006 error key to a stable calculator-namespace translation key.
 *
 * The mapping is exhaustive over `CalculatorErrorKey`. The `default` branch
 * exists as a runtime safety net only — TypeScript will surface any newly
 * added `ApiErrorCode` value at compile time via the `never` assertion.
 */
export function errorToI18nKey(
  errorKey: CalculatorErrorKey | null,
): I18nKey | null {
  if (errorKey === null) return null;

  switch (errorKey) {
    case 'network':
      return 'calculator.errors.network';
    case 'invalid_json':
      return 'calculator.errors.invalid_json';
    case 'invalid_request':
      return 'calculator.errors.invalid_request';
    case 'unsupported_operation':
      return 'calculator.errors.unsupported_operation';
    case 'invalid_operands':
      return 'calculator.errors.invalid_operands';
    case 'division_by_zero':
      return 'calculator.errors.division_by_zero';
    case 'math_domain':
      return 'calculator.errors.math_domain';
    case 'numeric_overflow':
      return 'calculator.errors.numeric_overflow';
    case 'payload_too_large':
      return 'calculator.errors.payload_too_large';
    case 'unsupported_media_type':
      return 'calculator.errors.unsupported_media_type';
    case 'method_not_allowed':
      return 'calculator.errors.method_not_allowed';
    case 'not_found':
      return 'calculator.errors.not_found';
    case 'internal_error':
      return 'calculator.errors.internal_error';
    default: {
      // Compile-time exhaustiveness guard: adding a new `ApiErrorCode`
      // without extending this switch surfaces as a type error here.
      const _exhaustive: never = errorKey;
      void _exhaustive;
      return FALLBACK_KEY;
    }
  }
}
