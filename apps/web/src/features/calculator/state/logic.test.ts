import { describe, expect, it } from 'vitest';

import { ApiError } from '../../../api/errors';

import {
  buildCalculationRequest,
  classifyApiError,
  decimalSeparatorFor,
  formatResult,
  isFiniteOperandBuffer,
  keyboardEventToCommand,
  mapErrorToI18nKey,
  selectDisplayValue,
  selectErrorKey,
  selectPreviousResult,
  selectStatus,
} from './logic';
import type { State } from './types';

/**
 * Pure logic tests never touch React or the DOM. They exercise the
 * request-construction, formatting, error-mapping, and keyboard-mapping
 * responsibilities carved out of the previous monolithic component.
 */
describe('decimalSeparatorFor', () => {
  it('returns "," for pt-BR', () => {
    expect(decimalSeparatorFor('pt-BR')).toBe(',');
  });

  it('returns "." for en-US and pseudo', () => {
    expect(decimalSeparatorFor('en-US')).toBe('.');
    expect(decimalSeparatorFor('pseudo')).toBe('.');
  });
});

describe('isFiniteOperandBuffer', () => {
  it.each([
    ['0', true],
    ['12', true],
    ['-3', true],
    ['1.5', true],
    ['-0.25', true],
    ['', false],
    ['.', false],
    ['-', false],
    ['-.', false],
    ['abc', false],
  ] as const)('classifies %j → %s', (buffer, expected) => {
    expect(isFiniteOperandBuffer(buffer)).toBe(expected);
  });
});

describe('buildCalculationRequest', () => {
  it('returns null for entry state (no operator yet)', () => {
    const s: State = { type: 'entry', buffer: '5', pendingResult: null };
    expect(buildCalculationRequest(s)).toBeNull();
  });

  it('produces a binary payload preserving operand order', () => {
    const s: State = { type: 'binary', left: 1, op: 'add', buffer: '2' };
    expect(buildCalculationRequest(s)).toEqual({
      operation: 'add',
      operands: [1, 2],
    });
  });

  it('produces a percentage payload (binary, two operands)', () => {
    const s: State = {
      type: 'binary',
      left: 200,
      op: 'percentage',
      buffer: '15',
    };
    expect(buildCalculationRequest(s)).toEqual({
      operation: 'percentage',
      operands: [200, 15],
    });
  });

  it('produces a sqrt payload with exactly one operand', () => {
    const s: State = { type: 'unarySqrtPending', buffer: '9' };
    expect(buildCalculationRequest(s)).toEqual({
      operation: 'sqrt',
      operands: [9],
    });
  });

  it('rejects an incomplete binary buffer', () => {
    const s: State = { type: 'binary', left: 1, op: 'add', buffer: '.' };
    expect(buildCalculationRequest(s)).toBeNull();
  });

  it('rejects an incomplete sqrt buffer', () => {
    const s: State = { type: 'unarySqrtPending', buffer: '-' };
    expect(buildCalculationRequest(s)).toBeNull();
  });

  it('returns null for terminal states (success, failure, submitting)', () => {
    const success: State = { type: 'success', result: 3 };
    expect(buildCalculationRequest(success)).toBeNull();
    const failure: State = {
      type: 'retryableFailure',
      previousState: { type: 'entry', buffer: '0', pendingResult: null },
    };
    expect(buildCalculationRequest(failure)).toBeNull();
  });
});

describe('formatResult', () => {
  it('formats a plain integer', () => {
    expect(formatResult(42)).toBe('42');
  });

  it('normalizes negative zero to "0"', () => {
    expect(formatResult(-0)).toBe('0');
  });

  it('returns "NaN" for non-finite input rather than silently rendering', () => {
    expect(formatResult(Number.POSITIVE_INFINITY)).toBe('NaN');
    expect(formatResult(Number.NaN)).toBe('NaN');
  });
});

describe('selectDisplayValue', () => {
  it('echoes the buffer for composition states', () => {
    const s: State = { type: 'entry', buffer: '12', pendingResult: null };
    expect(selectDisplayValue(s, 'en-US')).toBe('12');
  });

  it('swaps the decimal glyph for pt-BR', () => {
    const s: State = { type: 'entry', buffer: '1.5', pendingResult: null };
    expect(selectDisplayValue(s, 'pt-BR')).toBe('1,5');
  });

  it('renders the backend result for success', () => {
    const s: State = { type: 'success', result: 3 };
    expect(selectDisplayValue(s, 'en-US')).toBe('3');
  });

  it('keeps showing the previous composition while submitting', () => {
    const s: State = {
      type: 'submitting',
      previousState: { type: 'binary', left: 1, op: 'add', buffer: '2' },
    };
    expect(selectDisplayValue(s, 'en-US')).toBe('2');
  });
});

describe('selectStatus / selectPreviousResult / selectErrorKey', () => {
  it('reports idle for entry states', () => {
    const s: State = { type: 'entry', buffer: '0', pendingResult: null };
    expect(selectStatus(s)).toBe('idle');
    expect(selectPreviousResult(s)).toBeNull();
    expect(selectErrorKey(s)).toBeNull();
  });

  it('reports pending during submitting and exposes previous-result correctly', () => {
    const s: State = {
      type: 'submitting',
      previousState: { type: 'success', result: 3 },
    };
    expect(selectStatus(s)).toBe('pending');
    expect(selectPreviousResult(s)).toBe(3);
  });

  it('maps retryableFailure to network error key', () => {
    const s: State = {
      type: 'retryableFailure',
      previousState: { type: 'entry', buffer: '0', pendingResult: null },
    };
    expect(selectStatus(s)).toBe('retryable');
    expect(selectErrorKey(s)).toBe('network');
  });

  it('maps domainFailure to its API error code', () => {
    const s: State = {
      type: 'domainFailure',
      code: 'division_by_zero',
      previousState: { type: 'entry', buffer: '0', pendingResult: null },
    };
    expect(selectStatus(s)).toBe('domain-error');
    expect(selectErrorKey(s)).toBe('division_by_zero');
  });
});

describe('mapErrorToI18nKey', () => {
  it('returns null for null input', () => {
    expect(mapErrorToI18nKey(null)).toBeNull();
  });

  it('produces stable translation keys for known codes', () => {
    expect(mapErrorToI18nKey('division_by_zero')).toBe(
      'calculator.errors.division_by_zero',
    );
    expect(mapErrorToI18nKey('network')).toBe('calculator.errors.network');
  });
});

describe('classifyApiError', () => {
  it('preserves kind and code without leaking the message', () => {
    const err = new ApiError('apiError', 'Division by zero', {
      code: 'division_by_zero',
    });
    expect(classifyApiError(err)).toEqual({
      kind: 'apiError',
      code: 'division_by_zero',
    });
  });

  it('preserves aborted classification', () => {
    const err = new ApiError('aborted', 'cancelled');
    expect(classifyApiError(err)).toEqual({ kind: 'aborted', code: undefined });
  });
});

describe('keyboardEventToCommand', () => {
  const en = { locale: 'en-US' as const, canRetry: false };
  const pt = { locale: 'pt-BR' as const, canRetry: false };

  it('maps digits', () => {
    expect(keyboardEventToCommand({ key: '7' }, en)).toEqual({
      kind: 'digit',
      digit: 7,
    });
  });

  it('maps the locale decimal separator', () => {
    expect(keyboardEventToCommand({ key: '.' }, en)).toEqual({
      kind: 'decimal',
    });
    expect(keyboardEventToCommand({ key: ',' }, pt)).toEqual({
      kind: 'decimal',
    });
    // Wrong separator for the locale is ignored.
    expect(keyboardEventToCommand({ key: ',' }, en)).toBeNull();
    expect(keyboardEventToCommand({ key: '.' }, pt)).toBeNull();
  });

  it('maps binary operators', () => {
    expect(keyboardEventToCommand({ key: '+' }, en)).toEqual({
      kind: 'operator',
      op: 'add',
    });
    expect(keyboardEventToCommand({ key: '*' }, en)).toEqual({
      kind: 'operator',
      op: 'multiply',
    });
    expect(keyboardEventToCommand({ key: '^' }, en)).toEqual({
      kind: 'operator',
      op: 'power',
    });
  });

  it('routes `r` to retry only when canRetry, otherwise to unarySqrt', () => {
    expect(keyboardEventToCommand({ key: 'r' }, en)).toEqual({
      kind: 'unarySqrt',
    });
    expect(
      keyboardEventToCommand({ key: 'r' }, { ...en, canRetry: true }),
    ).toEqual({ kind: 'retry' });
  });

  it('maps Enter/=, Backspace, Escape/Delete', () => {
    expect(keyboardEventToCommand({ key: 'Enter' }, en)).toEqual({
      kind: 'equals',
    });
    expect(keyboardEventToCommand({ key: '=' }, en)).toEqual({
      kind: 'equals',
    });
    expect(keyboardEventToCommand({ key: 'Backspace' }, en)).toEqual({
      kind: 'backspace',
    });
    expect(keyboardEventToCommand({ key: 'Escape' }, en)).toEqual({
      kind: 'clear',
    });
    expect(keyboardEventToCommand({ key: 'Delete' }, en)).toEqual({
      kind: 'clear',
    });
  });

  it('returns null for unknown keys', () => {
    expect(keyboardEventToCommand({ key: 'F1' }, en)).toBeNull();
    expect(keyboardEventToCommand({ key: 'a' }, en)).toBeNull();
  });
});
