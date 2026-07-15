/**
 * Pure, React-independent calculator interaction helpers.
 *
 * Nothing in this file may import React, touch the DOM, allocate an
 * `AbortController`, call the T-005 API, or perform any I/O. Every export
 * belongs to the calculator interaction model: request construction,
 * display formatting, error mapping, and input mapping.
 *
 * Result computation for the seven supported operations is intentionally
 * absent — the backend remains authoritative (see `docs/calculator-contract.md`).
 */

import type { Locale } from 'i18n';
import type { I18nKey } from 'i18n';
import type { ApiErrorCode, CalculationRequest, Operation } from 'api/types';
import type { ApiError } from 'api/errors';
import type { State } from './types';

/**
 * Buffer for a partially-composed operand.
 *
 * Buffers are canonical (dot-decimal, optional leading `-`) so that they can
 * be parsed with `parseFloat` after full-string validation.
 */
export const MAX_BUFFER_LENGTH = 32;

/**
 * Returns the locale-specific decimal separator glyph used only for display
 * and physical-keyboard input. Internal buffers always use `.`.
 */
export function decimalSeparatorFor(locale: Locale): ',' | '.' {
  return locale === 'pt-BR' ? ',' : '.';
}

/**
 * Predicate over a canonical buffer string: `true` when the buffer parses to
 * a finite number in full. A partially-composed buffer such as `.`, `-`, or
 * `-.` fails this check.
 */
export function isFiniteOperandBuffer(buffer: string): boolean {
  if (buffer === '' || buffer === '.' || buffer === '-' || buffer === '-.') {
    return false;
  }

  const n = Number(buffer);
  return Number.isFinite(n);
}

/**
 * Parses a validated buffer to a finite number. Callers must ensure
 * `isFiniteOperandBuffer(buffer)` beforehand.
 */
export function parseOperandBuffer(buffer: string): number {
  return Number(buffer);
}

/**
 * Constructs the exact request that `=` would submit for the current state,
 * or `null` when the state is not a well-formed submission (contract §14).
 *
 * The function is the single owner of payload construction and never mutates
 * `state`. It preserves operand order and enforces arity:
 *
 * - `sqrt`  → exactly one operand;
 * - other operations → exactly two operands.
 */
export function buildCalculationRequest(
  state: State,
): CalculationRequest | null {
  if (state.type === 'binary') {
    if (!isFiniteOperandBuffer(state.buffer)) return null;
    const right = parseOperandBuffer(state.buffer);
    if (!Number.isFinite(state.left) || !Number.isFinite(right)) return null;
    return { operation: state.op, operands: [state.left, right] };
  }

  if (state.type === 'unarySqrtPending') {
    if (!isFiniteOperandBuffer(state.buffer)) return null;
    const operand = parseOperandBuffer(state.buffer);
    if (!Number.isFinite(operand)) return null;
    return { operation: 'sqrt', operands: [operand] };
  }

  return null;
}

/**
 * Formats a backend-provided result for display.
 *
 * The frontend never invents numeric behavior: it only converts the finite
 * `number` returned by the API into a stable string. Negative zero is
 * normalized to `0`; non-finite inputs are surfaced explicitly so callers
 * can treat them as validation errors rather than silently displaying
 * `NaN`.
 */
export function formatResult(result: number): string {
  if (!Number.isFinite(result)) return 'NaN';
  const normalized = Object.is(result, -0) ? 0 : result;
  // `String` for a finite `number` preserves accepted precision and uses
  // scientific notation for magnitudes beyond the ECMAScript threshold,
  // matching contract §5.5 expectations.
  return String(normalized);
}

/**
 * Formats the value shown by the display area.
 *
 * `state.type === 'success'` renders the backend result via `formatResult`;
 * all other states echo the composition buffer (or `0` when no buffer is
 * available), with `.` swapped for the locale separator. Buffers themselves
 * remain canonical so later API submissions do not depend on locale glyphs.
 */
export function selectDisplayValue(state: State, locale: Locale): string {
  const separator = decimalSeparatorFor(locale);

  const echoBuffer = (buffer: string): string =>
    separator === '.' ? buffer : buffer.replace('.', separator);

  switch (state.type) {
    case 'entry':
    case 'binary':
    case 'unarySqrtPending':
      return echoBuffer(state.buffer);
    case 'success':
      return formatResult(state.result);
    case 'submitting':
    case 'retryableFailure':
    case 'domainFailure': {
      const inner = state.previousState;
      if (
        inner.type === 'entry' ||
        inner.type === 'binary' ||
        inner.type === 'unarySqrtPending'
      ) {
        return echoBuffer(inner.buffer);
      }
      if (inner.type === 'success') return formatResult(inner.result);
      return '0';
    }
  }
}

/**
 * Selects the previous result to render in the small "previous" line above
 * the primary display, or `null` when nothing should be shown.
 */
export function selectPreviousResult(state: State): number | null {
  if (state.type === 'submitting') {
    const inner = state.previousState;
    if (inner.type === 'success') return inner.result;
    if (inner.type === 'binary') return inner.left;
  }
  return null;
}

/**
 * A closed status enum consumed by rendering; excludes any internal token
 * such as the pending sequence or abort controller.
 */
export type CalculatorStatus =
  | 'idle'
  | 'pending'
  | 'success'
  | 'retryable'
  | 'domain-error';

export function selectStatus(state: State): CalculatorStatus {
  switch (state.type) {
    case 'submitting':
      return 'pending';
    case 'success':
      return 'success';
    case 'retryableFailure':
      return 'retryable';
    case 'domainFailure':
      return 'domain-error';
    default:
      return 'idle';
  }
}

/**
 * Localization-key selector for a failure state.
 *
 * Returns `null` when the state is not a failure. Callers render
 * `t('calculator.errors.<key>')`; server messages and raw codes are never
 * exposed as primary UI content.
 */
export function selectErrorKey(state: State): ApiErrorCode | 'network' | null {
  if (state.type === 'domainFailure') return state.code;
  if (state.type === 'retryableFailure') return 'network';
  return null;
}

/**
 * Maps a typed `ApiError` from T-005 to the stable frontend classification
 * used by the reducer. Expected cancellation is preserved as `'aborted'`
 * and must be silenced by the hook, not surfaced to the user.
 *
 * Unknown or `invalidResponse` failures collapse to the localized fallback
 * (`internal_error`) — server diagnostics never reach the display.
 */
export function classifyApiError(error: ApiError): {
  kind: ApiError['kind'];
  code?: ApiErrorCode;
} {
  return { kind: error.kind, code: error.code };
}

/**
 * Localization key selector for a classified failure. Kept alongside the
 * classifier so the mapping between error taxonomy and translation
 * namespace lives in one place.
 */
export function mapErrorToI18nKey(
  errorKey: ApiErrorCode | 'network' | null,
): I18nKey | null {
  if (errorKey === null) return null;
  return `calculator.errors.${errorKey}` as I18nKey;
}

/**
 * Discriminated user-facing command union produced by the physical
 * keyboard. Kept independent of the reducer's internal `Action` type so the
 * component and hook can decide whether a command is applicable in the
 * current state.
 */
export type KeyboardCommand =
  | { kind: 'digit'; digit: number }
  | { kind: 'decimal' }
  | { kind: 'operator'; op: Operation }
  | { kind: 'unarySqrt' }
  | { kind: 'equals' }
  | { kind: 'backspace' }
  | { kind: 'clear' }
  | { kind: 'retry' };

/**
 * Maps a `KeyboardEvent` to a `KeyboardCommand`, honoring the active
 * locale's decimal separator and the current retryability of the last
 * failure. Returns `null` when the event should be ignored.
 *
 * Kept pure and testable: no DOM access, no `preventDefault`. The React
 * layer decides how to consume the command.
 */
export function keyboardEventToCommand(
  event: Pick<KeyboardEvent, 'key'>,
  options: { locale: Locale; canRetry: boolean },
): KeyboardCommand | null {
  const { key } = event;
  const { locale, canRetry } = options;

  if (key >= '0' && key <= '9') {
    return { kind: 'digit', digit: Number(key) };
  }

  const separator = decimalSeparatorFor(locale);
  if (key === separator) return { kind: 'decimal' };

  switch (key) {
    case '+':
      return { kind: 'operator', op: 'add' };
    case '-':
      return { kind: 'operator', op: 'subtract' };
    case '*':
      return { kind: 'operator', op: 'multiply' };
    case '/':
      return { kind: 'operator', op: 'divide' };
    case '^':
      return { kind: 'operator', op: 'power' };
    case '%':
      return { kind: 'operator', op: 'percentage' };
    case 's':
      return { kind: 'unarySqrt' };
    case 'Enter':
    case '=':
      return { kind: 'equals' };
    case 'Backspace':
      return { kind: 'backspace' };
    case 'Escape':
    case 'Delete':
      return { kind: 'clear' };
    case 'r':
      return canRetry ? { kind: 'retry' } : { kind: 'unarySqrt' };
    default:
      return null;
  }
}
