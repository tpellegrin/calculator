import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../../../api/calculator';
import { ApiError } from '../../../api/errors';
import type { CalculationResponse } from '../../../api/types';

import { useCalculator } from './useCalculator';

vi.mock('../../../api/calculator', () => ({
  calculate: vi.fn(),
}));

/**
 * Deferred promise helper: no `setTimeout`, no shared state between tests.
 * Every `Deferred` is created fresh inside a test.
 */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const optsEn = { locale: 'en-US' as const };

describe('useCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with idle status and buffer "0"', () => {
    const { result } = renderHook(() => useCalculator(optsEn));
    expect(result.current.displayValue).toBe('0');
    expect(result.current.status).toBe('idle');
  });

  it('records digit entry', () => {
    const { result } = renderHook(() => useCalculator(optsEn));
    act(() => {
      result.current.pressDigit(5);
    });
    expect(result.current.displayValue).toBe('5');
  });

  it('submits the canonical binary payload', async () => {
    vi.mocked(api.calculate).mockResolvedValue({
      operation: 'add',
      operands: [1, 2],
      result: 3,
    });

    const { result } = renderHook(() => useCalculator(optsEn));

    act(() => {
      result.current.pressDigit(1);
      result.current.selectOperation('add');
      result.current.pressDigit(2);
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(api.calculate).toHaveBeenCalledWith(
      { operation: 'add', operands: [1, 2] },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(result.current.displayValue).toBe('3');
  });

  it('surfaces a typed domain error as a stable error key', async () => {
    vi.mocked(api.calculate).mockRejectedValue(
      new ApiError('apiError', 'Division by zero', {
        code: 'division_by_zero',
      }),
    );

    const { result } = renderHook(() => useCalculator(optsEn));

    act(() => {
      result.current.pressDigit(1);
      result.current.pressDigit(0);
      result.current.selectOperation('divide');
      result.current.pressDigit(0);
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.status).toBe('domain-error'));
    expect(result.current.errorKey).toBe('division_by_zero');
  });

  it('rejects a stale success once a newer request has resolved', async () => {
    const first = deferred<CalculationResponse>();
    vi.mocked(api.calculate).mockReturnValueOnce(first.promise);

    const { result } = renderHook(() => useCalculator(optsEn));

    act(() => {
      result.current.pressDigit(1);
      result.current.selectOperation('add');
      result.current.pressDigit(1);
    });
    act(() => {
      result.current.submit();
    });
    expect(result.current.status).toBe('pending');

    vi.mocked(api.calculate).mockResolvedValueOnce({
      operation: 'add',
      operands: [2, 2],
      result: 4,
    });

    act(() => {
      result.current.pressDigit(2);
      result.current.selectOperation('add');
      result.current.pressDigit(2);
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.displayValue).toBe('4');

    // Now let the superseded slow request resolve. Its ownership token is
    // stale, so it must NOT overwrite the newer success.
    await act(async () => {
      first.resolve({ operation: 'add', operands: [1, 1], result: 2 });
      // Yield a microtask so any (incorrect) dispatch would have run.
      await Promise.resolve();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.displayValue).toBe('4');
  });

  it('clear aborts an in-flight request without surfacing an error', async () => {
    const pending = deferred<CalculationResponse>();
    vi.mocked(api.calculate).mockReturnValueOnce(pending.promise);

    const { result } = renderHook(() => useCalculator(optsEn));

    act(() => {
      result.current.pressDigit(1);
      result.current.selectOperation('add');
      result.current.pressDigit(1);
    });
    act(() => {
      result.current.submit();
    });
    expect(result.current.status).toBe('pending');

    act(() => {
      result.current.clear();
    });

    // Reject with an aborted ApiError to model what the transport layer does.
    await act(async () => {
      pending.reject(new ApiError('aborted', 'cancelled'));
      await Promise.resolve();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.displayValue).toBe('0');
    expect(result.current.errorKey).toBeNull();
  });
});
