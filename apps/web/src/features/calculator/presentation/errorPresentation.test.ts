import { describe, expect, it } from 'vitest';

import type { ApiErrorCode } from 'api/types';

import { errorToI18nKey, type CalculatorErrorKey } from './errorPresentation';

const API_ERROR_CODES: readonly ApiErrorCode[] = [
  'invalid_json',
  'invalid_request',
  'unsupported_operation',
  'invalid_operands',
  'division_by_zero',
  'math_domain',
  'numeric_overflow',
  'payload_too_large',
  'unsupported_media_type',
  'method_not_allowed',
  'not_found',
  'internal_error',
];

describe('errorToI18nKey', () => {
  it('returns null when the T-006 hook exposes no error', () => {
    expect(errorToI18nKey(null)).toBeNull();
  });

  it('maps every supported API error code to a calculator-namespace key', () => {
    for (const code of API_ERROR_CODES) {
      expect(errorToI18nKey(code)).toBe(`calculator.errors.${code}`);
    }
  });

  it('maps the classifier-only "network" key to the network error message', () => {
    expect(errorToI18nKey('network')).toBe('calculator.errors.network');
  });

  it('preserves the CalculatorErrorKey union shape exhaustively', () => {
    // Compile-time check: every union member must be handled.
    const allKeys: readonly CalculatorErrorKey[] = [
      'network',
      ...API_ERROR_CODES,
    ];
    for (const key of allKeys) {
      expect(errorToI18nKey(key)).not.toBeNull();
    }
  });
});
