/**
 * `useCalculatorKeyboard` — feature-root keyboard adapter for the physical
 * calculator.
 *
 * Owns exactly one React-level concern: turning a `React.KeyboardEvent` that
 * bubbles to the calculator root into a T-006 command invocation, using the
 * pure `keyEventToCommand` mapping.
 *
 * The hook:
 *
 *   - never attaches a global `window` / `document` / `body` listener;
 *   - never stores calculator state or a locale mirror;
 *   - never re-implements T-006 semantics;
 *   - never runs `preventDefault` for unhandled keys;
 *   - avoids duplicate dispatch when Enter or Space is pressed on a focused
 *     native button (the browser already produces a `click`; the root
 *     handler must not additionally dispatch `equals`).
 */
import { useCallback } from 'react';
import type React from 'react';

import type { CalculatorApi } from '../state/useCalculator';
import {
  keyEventToCommand,
  type KeyboardCommand,
} from '../presentation/keyboardMapping';
import type { Locale } from 'i18n';

/**
 * Narrow slice of the T-006 hook API this adapter needs. Passing the whole
 * `CalculatorApi` would work but hides the actual dependency surface.
 */
export type KeyboardDispatch = Pick<
  CalculatorApi,
  | 'pressDigit'
  | 'pressDecimal'
  | 'pressBackspace'
  | 'selectOperation'
  | 'pressUnarySqrt'
  | 'submit'
  | 'retry'
  | 'clear'
>;

export interface UseCalculatorKeyboardOptions {
  readonly locale: Locale;
  readonly canRetry: boolean;
  readonly dispatch: KeyboardDispatch;
}

/**
 * Returns a stable `onKeyDown` handler for the calculator feature-root.
 *
 * The identity of the returned callback intentionally *is not* memoized
 * across renders — React handler identity does not affect correctness for
 * an inline `onKeyDown={handleKeyDown}` prop, and manual memoization would
 * only capture stale `locale`/`canRetry`/`dispatch` closures.
 */
export function useCalculatorKeyboard(
  options: UseCalculatorKeyboardOptions,
): (event: React.KeyboardEvent<Element>) => void {
  const { locale, canRetry, dispatch } = options;

  return useCallback(
    (event: React.KeyboardEvent<Element>) => {
      // Skip Enter/Space when a nested native button holds focus: the
      // browser already fires `click` on that button, so a root-level
      // `equals` dispatch here would double-activate the calculator.
      if (
        (event.key === 'Enter' || event.key === ' ') &&
        event.target !== event.currentTarget &&
        (event.target as HTMLElement).tagName === 'BUTTON'
      ) {
        return;
      }

      const command = keyEventToCommand(event.nativeEvent, {
        locale,
        canRetry,
      });
      if (command === null) return;

      // Only prevent default for keys we own — must not suppress unrelated
      // browser behavior (e.g. tab navigation, refresh, dev tools).
      event.preventDefault();

      applyKeyboardCommand(command, dispatch);
    },
    [locale, canRetry, dispatch],
  );
}

/**
 * Dispatches a `KeyboardCommand` through the T-006 hook's named methods.
 *
 * The exhaustive switch is a compile-time guarantee that any new
 * `KeyboardCommand` variant must extend both the pure mapping and the
 * dispatch adapter — the two cannot silently drift.
 */
function applyKeyboardCommand(
  command: KeyboardCommand,
  dispatch: KeyboardDispatch,
): void {
  switch (command.kind) {
    case 'digit':
      dispatch.pressDigit(command.digit);
      return;
    case 'decimal':
      dispatch.pressDecimal();
      return;
    case 'operator':
      dispatch.selectOperation(command.op);
      return;
    case 'unarySqrt':
      dispatch.pressUnarySqrt();
      return;
    case 'equals':
      dispatch.submit();
      return;
    case 'backspace':
      dispatch.pressBackspace();
      return;
    case 'clear':
      dispatch.clear();
      return;
    case 'retry':
      dispatch.retry();
      return;
    default: {
      const _exhaustive: never = command;
      void _exhaustive;
    }
  }
}
