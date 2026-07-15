/**
 * Pure mapping from a physical keyboard event to a T-007 command.
 *
 * Single T-007-owned interpreter. Both the keypad and the keyboard converge
 * on the T-006 semantic commands exposed by `useCalculator`; this module is
 * the keyboard's translation layer only.
 *
 * The mapping is deterministic:
 *
 *   - it depends only on the explicit `locale`, `canRetry`, and typed
 *     characters (`event.key`);
 *   - it ignores events with modifier keys (Ctrl, Alt, Meta) so the browser
 *     retains standard shortcuts (Cmd+R reload, Ctrl+F find, …);
 *   - it never falls back to an unrelated command; unrecognized keys map to
 *     `null`.
 *
 * This module must not:
 *   - touch the DOM;
 *   - call `preventDefault`;
 *   - dispatch actions;
 *   - own state.
 */
import type { Locale } from 'i18n';
import type { Operation } from 'api/types';

/**
 * The vocabulary of keyboard-triggered commands. Includes `retry` because
 * that is a legal keyboard-only affordance (§15). Excludes `signToggle`
 * because the physical calculator exposes `±` only via the keypad.
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

/** The subset of a native `KeyboardEvent` this mapping consumes. */
export interface KeyEventLike {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
}

export interface KeyboardMappingOptions {
  readonly locale: Locale;
  readonly canRetry: boolean;
}

/**
 * Locale-appropriate decimal separator for physical-keyboard input.
 *
 * The physical calculator interprets only the locale's canonical decimal
 * separator so users typing the "wrong" glyph get no silent effect (the
 * event returns `null` here and can be ignored upstream).
 */
function decimalSeparatorFor(locale: Locale): ',' | '.' {
  return locale === 'pt-BR' ? ',' : '.';
}

/**
 * Deterministic map from a keyboard event to a `KeyboardCommand`, or `null`
 * when the event should be ignored (unknown key, or any modifier held).
 */
export function keyEventToCommand(
  event: KeyEventLike,
  options: KeyboardMappingOptions,
): KeyboardCommand | null {
  // Modifier-held events are reserved for the browser/OS.
  if (event.ctrlKey || event.altKey || event.metaKey) return null;

  const { key } = event;
  const { locale, canRetry } = options;

  if (key.length === 1 && key >= '0' && key <= '9') {
    return { kind: 'digit', digit: Number(key) };
  }

  if (key === decimalSeparatorFor(locale)) return { kind: 'decimal' };

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
    case 'S':
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
    case 'R':
      return canRetry ? { kind: 'retry' } : null;
    default:
      return null;
  }
}
