import { describe, expect, it } from 'vitest';

import { INITIAL_STATE, reducer } from './reducer';
import type { State } from './types';

/**
 * Reducer tests are pure — they never touch the DOM, React, or an
 * `AbortController`. Async orchestration (request identity, abort,
 * cancellation suppression) is tested in `useCalculator.test.ts` and
 * `Calculator.test.tsx` where the hook owns those tokens.
 */
describe('calculator reducer (pure)', () => {
  it('returns the initial state', () => {
    expect(INITIAL_STATE).toEqual({
      type: 'entry',
      buffer: '0',
      pendingResult: null,
    });
  });

  describe('digit entry', () => {
    it('replaces the initial 0 with the pressed digit', () => {
      const next = reducer(INITIAL_STATE, { type: 'digit', digit: 5 });
      expect(next).toEqual({ type: 'entry', buffer: '5', pendingResult: null });
    });

    it('appends subsequent digits', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 1 });
      s = reducer(s, { type: 'digit', digit: 2 });
      expect(s).toEqual({ type: 'entry', buffer: '12', pendingResult: null });
    });

    it('collapses leading zeros', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 0 });
      s = reducer(s, { type: 'digit', digit: 0 });
      s = reducer(s, { type: 'digit', digit: 5 });
      expect((s as Extract<State, { type: 'entry' }>).buffer).toBe('5');
    });

    it('respects the max buffer length', () => {
      let s: State = {
        type: 'entry',
        buffer: '1'.repeat(32),
        pendingResult: null,
      };
      s = reducer(s, { type: 'digit', digit: 2 });
      expect((s as Extract<State, { type: 'entry' }>).buffer).toBe(
        '1'.repeat(32),
      );
    });
  });

  describe('decimal', () => {
    it('appends a decimal to the initial 0', () => {
      const next = reducer(INITIAL_STATE, { type: 'decimal' });
      expect((next as Extract<State, { type: 'entry' }>).buffer).toBe('0.');
    });

    it('rejects a duplicate decimal', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 5 });
      s = reducer(s, { type: 'decimal' });
      s = reducer(s, { type: 'digit', digit: 2 });
      s = reducer(s, { type: 'decimal' });
      expect((s as Extract<State, { type: 'entry' }>).buffer).toBe('5.2');
    });
  });

  describe('sign toggle', () => {
    it('toggles the leading minus', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 5 });
      s = reducer(s, { type: 'signToggle' });
      expect((s as Extract<State, { type: 'entry' }>).buffer).toBe('-5');
      s = reducer(s, { type: 'signToggle' });
      expect((s as Extract<State, { type: 'entry' }>).buffer).toBe('5');
    });
  });

  describe('backspace', () => {
    it('removes the last character', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 1 });
      s = reducer(s, { type: 'digit', digit: 2 });
      s = reducer(s, { type: 'backspace' });
      expect((s as Extract<State, { type: 'entry' }>).buffer).toBe('1');
    });

    it('reverts to 0 when the buffer becomes empty', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 1 });
      s = reducer(s, { type: 'backspace' });
      expect((s as Extract<State, { type: 'entry' }>).buffer).toBe('0');
    });

    it('reverts to entry echoing the left operand when the binary buffer empties', () => {
      // Start with an already-empty-ish buffer to isolate the "empty →
      // revert to left operand" rule from the "collapse to 0" rule.
      const s: State = { type: 'binary', left: 7, op: 'add', buffer: '' };
      const next = reducer(s, { type: 'backspace' });
      expect(next).toEqual({
        type: 'entry',
        buffer: '7',
        pendingResult: null,
      });
    });
  });

  describe('operator selection', () => {
    it('transitions from entry to binary', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 1 });
      s = reducer(s, { type: 'operator', op: 'add' });
      expect(s).toEqual({ type: 'binary', left: 1, op: 'add', buffer: '0' });
    });

    it('replaces a pending operator', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 1 });
      s = reducer(s, { type: 'operator', op: 'add' });
      s = reducer(s, { type: 'operator', op: 'multiply' });
      expect(s).toEqual({
        type: 'binary',
        left: 1,
        op: 'multiply',
        buffer: '0',
      });
    });

    it('seeds a new binary from a previous success', () => {
      const s: State = { type: 'success', result: 42 };
      const next = reducer(s, { type: 'operator', op: 'subtract' });
      expect(next).toEqual({
        type: 'binary',
        left: 42,
        op: 'subtract',
        buffer: '0',
      });
    });
  });

  describe('unary sqrt', () => {
    it('transitions to unarySqrtPending, carrying the buffer', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 9 });
      s = reducer(s, { type: 'unarySqrt' });
      expect(s).toEqual({ type: 'unarySqrtPending', buffer: '9' });
    });
  });

  describe('clear', () => {
    it('resets to the initial state', () => {
      let s = reducer(INITIAL_STATE, { type: 'digit', digit: 1 });
      s = reducer(s, { type: 'operator', op: 'add' });
      s = reducer(s, { type: 'cleared' });
      expect(s).toEqual(INITIAL_STATE);
    });
  });

  describe('async lifecycle', () => {
    const previousState: State = {
      type: 'binary',
      left: 1,
      op: 'add',
      buffer: '2',
    };
    const submittingState: State = { type: 'submitting', previousState };

    it('transitions to success on calculationSucceeded', () => {
      const s = reducer(submittingState, {
        type: 'calculationSucceeded',
        result: 3,
      });
      expect(s).toEqual({ type: 'success', result: 3 });
    });

    it('ignores calculationSucceeded when not submitting', () => {
      const s = reducer(previousState, {
        type: 'calculationSucceeded',
        result: 99,
      });
      expect(s).toBe(previousState);
    });

    it('transitions to retryableFailure on a network kind', () => {
      const s = reducer(submittingState, {
        type: 'calculationFailed',
        kind: 'network',
      });
      expect(s).toEqual({ type: 'retryableFailure', previousState });
    });

    it('transitions to domainFailure on a domain kind with code', () => {
      const s = reducer(submittingState, {
        type: 'calculationFailed',
        kind: 'domain',
        code: 'division_by_zero',
      });
      expect(s).toEqual({
        type: 'domainFailure',
        code: 'division_by_zero',
        previousState,
      });
    });

    it('reverts to the previous state on expected abort', () => {
      const s = reducer(submittingState, { type: 'calculationAborted' });
      expect(s).toBe(previousState);
    });

    it('does not transition on calculationStarted from a non-composing state', () => {
      const s = reducer(submittingState, { type: 'calculationStarted' });
      expect(s).toBe(submittingState);
    });
  });
});
