/**
 * `useCalculator` — the single owner of React-side state and asynchronous
 * request orchestration for the calculator feature.
 *
 * Responsibilities:
 *
 * 1. hosts the pure reducer (`state/reducer.ts`);
 * 2. constructs canonical requests via `buildCalculationRequest`;
 * 3. owns the active `AbortController`;
 * 4. owns a monotonic sequence token so superseded completions are
 *    rejected regardless of whether their signal fires first;
 * 5. tracks a mounted flag so unmount cannot leak state updates or
 *    unhandled rejections;
 * 6. exposes a small semantic command interface — no raw `dispatch`,
 *    no controllers, no refs, no request tokens.
 *
 * The hook returns exactly the surface the presentation layer needs
 * (`state`, selectors, and named commands). Callers construct payloads
 * only through the hook.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { calculate } from 'api/calculator';
import { isApiError } from 'api/errors';
import type { Operation } from 'api/types';

import { INITIAL_STATE, reducer } from './reducer';
import type { State } from './types';
import {
  buildCalculationRequest,
  classifyApiError,
  selectDisplayValue,
  selectErrorKey,
  selectPreviousResult,
  selectStatus,
  type CalculatorStatus,
} from './logic';
import type { Locale } from 'i18n';

export interface CalculatorApi {
  /** Raw feature state — exposed for pure selectors and tests, not setters. */
  readonly state: State;
  readonly displayValue: string;
  readonly previousResult: number | null;
  readonly status: CalculatorStatus;
  readonly errorKey: ReturnType<typeof selectErrorKey>;
  readonly canRetry: boolean;

  // Semantic commands. All command identities are stable across renders.
  readonly pressDigit: (digit: number) => void;
  readonly pressDecimal: () => void;
  readonly toggleSign: () => void;
  readonly pressBackspace: () => void;
  readonly selectOperation: (op: Operation) => void;
  readonly pressUnarySqrt: () => void;
  readonly submit: () => void;
  readonly retry: () => void;
  readonly clear: () => void;
}

export function useCalculator(options: { locale: Locale }): CalculatorApi {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  /**
   * Ownership tokens for the active request. Stored in refs so they never
   * appear in `State` and never participate in rendering.
   */
  const sequenceRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  /** Latest state pointer for callbacks; kept in a ref so commands stay stable. */
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // Invalidate ownership *before* aborting so a fired abort listener
      // cannot dispatch anything.
      mountedRef.current = false;
      sequenceRef.current += 1;
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
    };
  }, []);

  /**
   * Executes the request built from `sourceState`. Enforces:
   *   - single request-construction path via `buildCalculationRequest`;
   *   - abort of any previously owned controller;
   *   - fresh controller + monotonically increasing ownership token;
   *   - stale-response suppression by token equality, not by signal
   *     inspection.
   *
   * Never throws — callers do not need `try`/`catch`.
   */
  const performCalculation = useCallback(async (sourceState: State) => {
    const request = buildCalculationRequest(sourceState);
    if (request === null) return;

    // Abort and forget the previously owned controller *before* allocating
    // a new token so a fired abort listener will already see the old
    // controller detached and refuse to dispatch anything.
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    const token = ++sequenceRef.current;

    dispatch({ type: 'calculationStarted' });

    const isCurrent = () =>
      mountedRef.current &&
      sequenceRef.current === token &&
      controllerRef.current === controller;

    try {
      const response = await calculate(request, { signal: controller.signal });
      if (!isCurrent()) return;
      controllerRef.current = null;
      dispatch({ type: 'calculationSucceeded', result: response.result });
    } catch (error: unknown) {
      if (!isCurrent()) return;
      controllerRef.current = null;
      if (!isApiError(error)) {
        dispatch({ type: 'calculationFailed', kind: 'network' });
        return;
      }
      const { kind, code } = classifyApiError(error);
      if (kind === 'aborted') {
        // Only surface aborts that belong to the *current* request; older
        // aborts were suppressed by the token check above.
        dispatch({ type: 'calculationAborted' });
        return;
      }
      if (
        kind === 'network' ||
        kind === 'unknown' ||
        kind === 'invalidResponse'
      ) {
        dispatch({ type: 'calculationFailed', kind: 'network' });
        return;
      }
      dispatch({ type: 'calculationFailed', kind: 'domain', code });
    }
  }, []);

  const submit = useCallback(() => {
    void performCalculation(stateRef.current);
  }, [performCalculation]);

  const retry = useCallback(() => {
    const current = stateRef.current;
    if (current.type !== 'retryableFailure') return;
    void performCalculation(current.previousState);
  }, [performCalculation]);

  const clear = useCallback(() => {
    // Invalidate ownership *before* aborting so any in-flight completion
    // dispatched from the abort handler is rejected by the token check.
    sequenceRef.current += 1;
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    dispatch({ type: 'cleared' });
  }, []);

  const pressDigit = useCallback(
    (digit: number) => dispatch({ type: 'digit', digit }),
    [],
  );
  const pressDecimal = useCallback(() => dispatch({ type: 'decimal' }), []);
  const toggleSign = useCallback(() => dispatch({ type: 'signToggle' }), []);
  const pressBackspace = useCallback(() => dispatch({ type: 'backspace' }), []);
  const selectOperation = useCallback(
    (op: Operation) => dispatch({ type: 'operator', op }),
    [],
  );
  const pressUnarySqrt = useCallback(() => dispatch({ type: 'unarySqrt' }), []);

  const { locale } = options;

  const displayValue = useMemo(
    () => selectDisplayValue(state, locale),
    [state, locale],
  );
  const previousResult = useMemo(() => selectPreviousResult(state), [state]);
  const status = useMemo(() => selectStatus(state), [state]);
  const errorKey = useMemo(() => selectErrorKey(state), [state]);
  const canRetry = state.type === 'retryableFailure';

  return {
    state,
    displayValue,
    previousResult,
    status,
    errorKey,
    canRetry,
    pressDigit,
    pressDecimal,
    toggleSign,
    pressBackspace,
    selectOperation,
    pressUnarySqrt,
    submit,
    retry,
    clear,
  };
}
