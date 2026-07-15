import type { ApiErrorCode, Operation } from 'api/types';

/**
 * Discriminated union of all valid calculator states.
 *
 * Runtime-only request identity (an `AbortController` and a monotonic
 * sequence token) is intentionally *not* part of `State`. Those tokens are
 * owned by the React hook so the reducer stays pure and cannot express
 * combinations such as "loading with a stale abort controller".
 */
export type State =
  | { type: 'entry'; buffer: string; pendingResult: number | null }
  | { type: 'binary'; left: number; op: Operation; buffer: string }
  | { type: 'unarySqrtPending'; buffer: string }
  | { type: 'submitting'; previousState: State }
  | { type: 'success'; result: number }
  | { type: 'retryableFailure'; previousState: State }
  | { type: 'domainFailure'; code: ApiErrorCode; previousState: State };

/**
 * Closed action union describing user or system events. Actions describe
 * *what happened*, never *which setter to call*.
 *
 * Async completion actions (`calculationSucceeded`, `calculationFailed`)
 * are dispatched by the hook only after it has confirmed the completing
 * request still owns the active request token; the reducer therefore
 * never needs to inspect a sequence number.
 */
export type Action =
  | { type: 'digit'; digit: number }
  | { type: 'decimal' }
  | { type: 'signToggle' }
  | { type: 'backspace' }
  | { type: 'cleared' }
  | { type: 'operator'; op: Operation }
  | { type: 'unarySqrt' }
  | { type: 'calculationStarted' }
  | { type: 'calculationSucceeded'; result: number }
  | {
      type: 'calculationFailed';
      kind: 'network' | 'domain';
      code?: ApiErrorCode;
    }
  | { type: 'calculationAborted' };
