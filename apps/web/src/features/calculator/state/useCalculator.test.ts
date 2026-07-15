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

  describe('retry logic', () => {
    it('Retryable failure exposes retry', async () => {
      vi.mocked(api.calculate).mockRejectedValue(
        new ApiError('network', 'Failed'),
      );
      const { result } = renderHook(() => useCalculator(optsEn));

      act(() => {
        result.current.pressDigit(9);
        result.current.pressUnarySqrt();
      });
      act(() => {
        result.current.submit();
      });

      await waitFor(() => expect(result.current.status).toBe('retryable'));
      expect(result.current.canRetry).toBe(true);
    });

    it('Retry resubmits exact request', async () => {
      const mockCalculate = vi.mocked(api.calculate);
      mockCalculate.mockRejectedValueOnce(new ApiError('network', 'Failed'));

      const { result } = renderHook(() => useCalculator(optsEn));

      act(() => {
        result.current.pressDigit(5);
        result.current.selectOperation('multiply');
        result.current.pressDigit(2);
      });
      act(() => {
        result.current.submit();
      });

      await waitFor(() => expect(result.current.canRetry).toBe(true));
      expect(mockCalculate).toHaveBeenCalledTimes(1);
      const firstCallArgs = mockCalculate.mock.calls[0][0];

      mockCalculate.mockResolvedValueOnce({
        operation: 'multiply',
        operands: [5, 2],
        result: 10,
      });

      act(() => {
        result.current.retry();
      });

      await waitFor(() => expect(result.current.status).toBe('success'));
      expect(mockCalculate).toHaveBeenCalledTimes(2);
      expect(mockCalculate.mock.calls[1][0]).toEqual(firstCallArgs);
      expect(result.current.displayValue).toBe('10');
    });

    it('Retry enters pending', async () => {
      const pending = deferred<CalculationResponse>();
      vi.mocked(api.calculate)
        .mockRejectedValueOnce(new ApiError('network', 'Failed'))
        .mockReturnValueOnce(pending.promise);

      const { result } = renderHook(() => useCalculator(optsEn));

      act(() => {
        result.current.pressDigit(9);
        result.current.pressUnarySqrt();
      });
      act(() => {
        result.current.submit();
      });

      await waitFor(() => expect(result.current.canRetry).toBe(true));

      act(() => {
        result.current.retry();
      });

      expect(result.current.status).toBe('pending');
      expect(result.current.canRetry).toBe(false);

      act(() => {
        pending.resolve({ operation: 'sqrt', operands: [9], result: 3 });
      });
      await waitFor(() => expect(result.current.status).toBe('success'));
    });

    it('Retry success', async () => {
      vi.mocked(api.calculate)
        .mockRejectedValueOnce(new ApiError('network', 'Failed'))
        .mockResolvedValueOnce({ operation: 'sqrt', operands: [9], result: 3 });

      const { result } = renderHook(() => useCalculator(optsEn));

      act(() => {
        result.current.pressDigit(9);
        result.current.pressUnarySqrt();
      });
      act(() => {
        result.current.submit();
      });

      await waitFor(() => expect(result.current.canRetry).toBe(true));

      act(() => {
        result.current.retry();
      });

      await waitFor(() => expect(result.current.status).toBe('success'));
      expect(result.current.displayValue).toBe('3');
      expect(result.current.canRetry).toBe(false);
      expect(result.current.errorKey).toBeNull();
    });

    it('Repeated retryable failure', async () => {
      vi.mocked(api.calculate).mockRejectedValue(
        new ApiError('network', 'Failed'),
      );

      const { result } = renderHook(() => useCalculator(optsEn));

      act(() => {
        result.current.pressDigit(9);
        result.current.pressUnarySqrt();
      });
      act(() => {
        result.current.submit();
      });

      await waitFor(() => expect(result.current.canRetry).toBe(true));

      act(() => {
        result.current.retry();
      });

      // Wait for the second failure
      await waitFor(() => expect(api.calculate).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.canRetry).toBe(true));
    });

    it('Non-retryable error', async () => {
      vi.mocked(api.calculate).mockRejectedValue(
        new ApiError('apiError', 'Domain', { code: 'division_by_zero' }),
      );

      const { result } = renderHook(() => useCalculator(optsEn));

      act(() => {
        result.current.pressDigit(1);
        result.current.selectOperation('divide');
        result.current.pressDigit(0);
      });
      act(() => {
        result.current.submit();
      });

      await waitFor(() => expect(result.current.status).toBe('domain-error'));
      expect(result.current.canRetry).toBe(false);

      act(() => {
        result.current.retry();
      });

      expect(api.calculate).toHaveBeenCalledTimes(1); // No second call
    });

    it('Duplicate protection during retry', async () => {
      const pending = deferred<CalculationResponse>();
      vi.mocked(api.calculate)
        .mockRejectedValueOnce(new ApiError('network', 'Failed'))
        .mockReturnValueOnce(pending.promise);

      const { result } = renderHook(() => useCalculator(optsEn));

      act(() => {
        result.current.pressDigit(9);
        result.current.pressUnarySqrt();
      });
      act(() => {
        result.current.submit();
      });

      await waitFor(() => expect(result.current.canRetry).toBe(true));

      act(() => {
        result.current.retry();
      });
      act(() => {
        result.current.retry();
      });
      act(() => {
        result.current.retry();
      });

      expect(api.calculate).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('Stale retry prevention', async () => {
      vi.mocked(api.calculate)
        .mockRejectedValueOnce(new ApiError('network', 'Failed'))
        .mockResolvedValue({ operation: 'sqrt', operands: [25], result: 5 });

      const { result } = renderHook(() => useCalculator(optsEn));

      // 1. Fail a request
      act(() => {
        result.current.pressDigit(9);
        result.current.pressUnarySqrt();
      });
      act(() => {
        result.current.submit();
      });
      await waitFor(() => expect(result.current.canRetry).toBe(true));

      // 2. Clear or start new calculation
      act(() => {
        result.current.clear();
      });
      expect(result.current.canRetry).toBe(false);

      // 3. Attempting to call retry() should be a no-op
      act(() => {
        result.current.retry();
      });
      expect(api.calculate).toHaveBeenCalledTimes(1);

      // 4. New successful calculation
      act(() => {
        result.current.pressDigit(2);
        result.current.pressDigit(5);
        result.current.pressUnarySqrt();
      });
      act(() => {
        result.current.submit();
      });
      await waitFor(() => expect(result.current.status).toBe('success'));
      expect(result.current.canRetry).toBe(false);

      // 5. Retry should still be a no-op
      act(() => {
        result.current.retry();
      });
      expect(api.calculate).toHaveBeenCalledTimes(2); // Only one for initial fail, one for success
    });
  });
});
