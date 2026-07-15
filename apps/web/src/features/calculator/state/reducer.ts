/**
 * Pure calculator reducer.
 *
 * The reducer:
 *   - never imports React;
 *   - never allocates or aborts an `AbortController`;
 *   - never generates request identity;
 *   - never calls the API or performs I/O;
 *   - never mutates inputs.
 *
 * Async orchestration (abort, request ownership, cancellation
 * suppression) is the responsibility of `useCalculator`, which dispatches
 * `calculationStarted` / `calculationSucceeded` / `calculationFailed`
 * / `calculationAborted` only for the currently owned request.
 *
 * Every reducer branch returns a valid, complete `State`; unsupported
 * transitions are explicitly no-ops (return the same state) rather than
 * falling through to arbitrary behavior.
 */

import type { Operation } from 'api/types';
import { MAX_BUFFER_LENGTH } from './logic';
import type { Action, State } from './types';

export const INITIAL_STATE: State = {
  type: 'entry',
  buffer: '0',
  pendingResult: null,
};

/**
 * True when the state exposes a live composition buffer (entry, binary,
 * or unarySqrtPending). Grouped so buffer mutations do not need to
 * inspect variant shapes.
 */
type ComposingState = Extract<
  State,
  { type: 'entry' | 'binary' | 'unarySqrtPending' }
>;

function isComposing(state: State): state is ComposingState {
  return (
    state.type === 'entry' ||
    state.type === 'binary' ||
    state.type === 'unarySqrtPending'
  );
}

function withBuffer(state: ComposingState, buffer: string): State {
  switch (state.type) {
    case 'entry':
      return { type: 'entry', buffer, pendingResult: state.pendingResult };
    case 'binary':
      return { type: 'binary', left: state.left, op: state.op, buffer };
    case 'unarySqrtPending':
      return { type: 'unarySqrtPending', buffer };
  }
}

function bufferLengthWithoutSigns(buffer: string): number {
  return buffer.replace(/[.-]/g, '').length;
}

function parseBufferOrNaN(buffer: string): number {
  if (buffer === '' || buffer === '.' || buffer === '-' || buffer === '-.') {
    return NaN;
  }
  const n = Number(buffer);
  return Number.isFinite(n) ? n : NaN;
}

function freshComposing(): Extract<State, { type: 'entry' }> {
  return { type: 'entry', buffer: '0', pendingResult: null };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'cleared':
      return INITIAL_STATE;

    case 'calculationStarted': {
      // Only meaningful from a composing state. If dispatched from any
      // other state (e.g., during a race), keep the current state.
      if (!isComposing(state)) return state;
      return { type: 'submitting', previousState: state };
    }

    case 'calculationSucceeded':
      if (state.type !== 'submitting') return state;
      return { type: 'success', result: action.result };

    case 'calculationFailed':
      if (state.type !== 'submitting') return state;
      if (action.kind === 'network' || !action.code) {
        return { type: 'retryableFailure', previousState: state.previousState };
      }
      return {
        type: 'domainFailure',
        code: action.code,
        previousState: state.previousState,
      };

    case 'calculationAborted':
      // Expected cancellation: revert to the composing state we came from
      // without surfacing an error.
      if (state.type !== 'submitting') return state;
      return state.previousState;

    case 'digit':
      return applyDigit(state, action.digit);

    case 'decimal':
      return applyDecimal(state);

    case 'signToggle':
      return applySignToggle(state);

    case 'backspace':
      return applyBackspace(state);

    case 'operator':
      return applyOperator(state, action.op);

    case 'unarySqrt':
      return applyUnarySqrt(state);
  }
}

function applyDigit(state: State, digit: number): State {
  const target: ComposingState = isComposing(state) ? state : freshComposing();

  if (bufferLengthWithoutSigns(target.buffer) >= MAX_BUFFER_LENGTH) {
    // Digit ignored; keep the collapsed target so subsequent input is well
    // defined even if the previous state was terminal.
    return target === state ? state : target;
  }

  const digitStr = String(digit);
  const newBuffer =
    target.buffer === '0'
      ? digitStr
      : target.buffer === '-0'
        ? '-' + digitStr
        : target.buffer + digitStr;

  return withBuffer(target, newBuffer);
}

function applyDecimal(state: State): State {
  const target: ComposingState = isComposing(state) ? state : freshComposing();

  if (
    target.buffer.includes('.') ||
    bufferLengthWithoutSigns(target.buffer) >= MAX_BUFFER_LENGTH
  ) {
    return target === state ? state : target;
  }

  return withBuffer(target, target.buffer + '.');
}

function applySignToggle(state: State): State {
  // §14: sign-toggle applies only to the buffer under composition.
  if (!isComposing(state)) return state;

  const newBuffer = state.buffer.startsWith('-')
    ? state.buffer.slice(1)
    : '-' + state.buffer;

  return withBuffer(state, newBuffer);
}

function applyBackspace(state: State): State {
  if (!isComposing(state)) return state;

  let newBuffer = state.buffer.slice(0, -1);

  if (newBuffer === '' || newBuffer === '-') {
    if (state.type === 'binary') {
      // §14: if the buffer becomes empty in binary state, revert to entry
      // with the left operand echoed to the display.
      return {
        type: 'entry',
        buffer: String(state.left),
        pendingResult: null,
      };
    }
    newBuffer = '0';
  }

  return withBuffer(state, newBuffer);
}

function applyOperator(state: State, op: Operation): State {
  // Operator replacement inside a pending binary. Contract §14 permits
  // no local arithmetic, so we do not evaluate the pending pair.
  if (state.type === 'binary') {
    return { ...state, op };
  }

  let leftValue: number;
  if (state.type === 'entry' || state.type === 'unarySqrtPending') {
    leftValue = parseBufferOrNaN(state.buffer);
  } else if (state.type === 'success') {
    leftValue = state.result;
  } else {
    return state;
  }

  if (!Number.isFinite(leftValue)) return state;

  return { type: 'binary', left: leftValue, op, buffer: '0' };
}

function applyUnarySqrt(state: State): State {
  let buffer: string;
  if (state.type === 'entry') buffer = state.buffer;
  else if (state.type === 'binary') buffer = state.buffer;
  else if (state.type === 'unarySqrtPending') buffer = state.buffer;
  else if (state.type === 'success') buffer = String(state.result);
  else return state;

  return { type: 'unarySqrtPending', buffer };
}
