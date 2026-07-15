/**
 * Pure tests for `formatNumber`. These do not render React; they verify the
 * T-007 formatter output for representative magnitudes and locales.
 */
import { describe, expect, it } from 'vitest';

import { formatNumber } from './formatNumber';

describe('formatNumber', () => {
  it('formats ordinary integers with locale grouping', () => {
    expect(formatNumber(123, 'en-US')).toBe('123');
    expect(formatNumber(1234, 'en-US')).toBe('1,234');
    expect(formatNumber(1234, 'pt-BR')).toBe('1.234');
  });

  it('formats locale-aware fractions', () => {
    expect(formatNumber(1.25, 'en-US')).toBe('1.25');
    expect(formatNumber(1.25, 'pt-BR')).toBe('1,25');
  });

  it('omits unnecessary trailing zeros', () => {
    expect(formatNumber(2.5, 'en-US')).toBe('2.5');
  });

  it('normalizes negative zero to "0"', () => {
    expect(formatNumber(-0, 'en-US')).toBe('0');
    expect(formatNumber(-0, 'pt-BR')).toBe('0');
  });

  it('uses scientific notation for extreme magnitudes', () => {
    expect(formatNumber(1e15, 'en-US')).toMatch(/1E15/i);
    expect(formatNumber(1.2345678901234567e20, 'en-US')).toMatch(
      /1.23456789012346E20/i,
    );
    expect(formatNumber(1e-7, 'en-US')).toMatch(/1E-7/i);
    expect(formatNumber(0.0000001234567890123456, 'en-US')).toMatch(
      /1.23456789012346E-7/i,
    );
  });

  it('preserves up to 15 significant digits', () => {
    expect(formatNumber(1.234567890123456, 'en-US')).toBe('1.23456789012346');
  });

  it('applies grouping in standard notation only', () => {
    expect(formatNumber(1234567.89, 'en-US')).toBe('1,234,567.89');
    expect(formatNumber(1234567.89, 'pt-BR')).toBe('1.234.567,89');
  });

  it('surfaces non-finite inputs as "NaN"', () => {
    expect(formatNumber(Infinity, 'en-US')).toBe('NaN');
    expect(formatNumber(-Infinity, 'en-US')).toBe('NaN');
    expect(formatNumber(NaN, 'en-US')).toBe('NaN');
  });

  it('falls back to en-US for the pseudo locale', () => {
    expect(formatNumber(1234.5, 'pseudo')).toBe('1,234.5');
  });
});
