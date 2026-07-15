import { describe, expect, it } from 'vitest';

import { keyEventToCommand } from './keyboardMapping';

const en = { locale: 'en-US' as const, canRetry: false };
const enRetry = { locale: 'en-US' as const, canRetry: true };
const pt = { locale: 'pt-BR' as const, canRetry: false };

describe('keyEventToCommand', () => {
  it('maps digits 0–9 to digit commands', () => {
    for (let d = 0; d <= 9; d++) {
      expect(keyEventToCommand({ key: String(d) }, en)).toEqual({
        kind: 'digit',
        digit: d,
      });
    }
  });

  it('maps the locale decimal separator to decimal', () => {
    expect(keyEventToCommand({ key: '.' }, en)).toEqual({ kind: 'decimal' });
    expect(keyEventToCommand({ key: ',' }, pt)).toEqual({ kind: 'decimal' });
  });

  it('ignores the non-locale decimal separator', () => {
    expect(keyEventToCommand({ key: ',' }, en)).toBeNull();
    expect(keyEventToCommand({ key: '.' }, pt)).toBeNull();
  });

  it.each([
    ['+', 'add'],
    ['-', 'subtract'],
    ['*', 'multiply'],
    ['/', 'divide'],
    ['^', 'power'],
    ['%', 'percentage'],
  ] as const)('maps operator key %s to operator %s', (key, op) => {
    expect(keyEventToCommand({ key }, en)).toEqual({ kind: 'operator', op });
  });

  it('maps s / S to unarySqrt regardless of retryability', () => {
    expect(keyEventToCommand({ key: 's' }, en)).toEqual({ kind: 'unarySqrt' });
    expect(keyEventToCommand({ key: 'S' }, en)).toEqual({ kind: 'unarySqrt' });
  });

  it('maps Enter and = to equals', () => {
    expect(keyEventToCommand({ key: 'Enter' }, en)).toEqual({ kind: 'equals' });
    expect(keyEventToCommand({ key: '=' }, en)).toEqual({ kind: 'equals' });
  });

  it('maps Backspace to backspace', () => {
    expect(keyEventToCommand({ key: 'Backspace' }, en)).toEqual({
      kind: 'backspace',
    });
  });

  it('maps Escape and Delete to clear', () => {
    expect(keyEventToCommand({ key: 'Escape' }, en)).toEqual({ kind: 'clear' });
    expect(keyEventToCommand({ key: 'Delete' }, en)).toEqual({ kind: 'clear' });
  });

  it('gates r/R to retry only when canRetry is true', () => {
    expect(keyEventToCommand({ key: 'r' }, en)).toBeNull();
    expect(keyEventToCommand({ key: 'R' }, en)).toBeNull();
    expect(keyEventToCommand({ key: 'r' }, enRetry)).toEqual({ kind: 'retry' });
    expect(keyEventToCommand({ key: 'R' }, enRetry)).toEqual({ kind: 'retry' });
  });

  it('never silently substitutes an unrelated command for an ungated key', () => {
    // Historic bug: `r` used to fall through to `unarySqrt` when canRetry was
    // false. The mapping must return null instead.
    expect(keyEventToCommand({ key: 'r' }, en)).toBeNull();
  });

  it('returns null for unknown keys', () => {
    expect(keyEventToCommand({ key: 'a' }, en)).toBeNull();
    expect(keyEventToCommand({ key: 'F5' }, en)).toBeNull();
    expect(keyEventToCommand({ key: 'ArrowLeft' }, en)).toBeNull();
    expect(keyEventToCommand({ key: 'Tab' }, en)).toBeNull();
    expect(keyEventToCommand({ key: ' ' }, en)).toBeNull();
  });

  it('ignores events with modifier keys (Ctrl, Alt, Meta)', () => {
    expect(keyEventToCommand({ key: '5', ctrlKey: true }, en)).toBeNull();
    expect(keyEventToCommand({ key: '+', altKey: true }, en)).toBeNull();
    expect(keyEventToCommand({ key: 'r', metaKey: true }, enRetry)).toBeNull();
    expect(keyEventToCommand({ key: 'Enter', metaKey: true }, en)).toBeNull();
  });
});
