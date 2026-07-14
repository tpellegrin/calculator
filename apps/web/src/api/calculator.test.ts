import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculate } from './calculator';
import { ApiError } from './errors';
import type { ApiErrorCode, Operation } from './types';

describe('calculator api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const mockJsonResponse = (data: unknown, status = 200) => {
    fetchMock.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(data)),
      json: () => Promise.resolve(data),
    } as Response);
  };

  describe('request serialization', () => {
    it('sends a valid POST request with JSON body', async () => {
      mockJsonResponse({
        operation: 'add',
        operands: [1, 2],
        result: 3,
      });

      await calculate({ operation: 'add', operands: [1, 2] });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      // Same-origin default (empty `VITE_API_BASE_URL`) must produce the
      // exact contract path without leading host or trailing slash duplication.
      expect(url).toBe('/api/v1/calculations');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(
        JSON.stringify({ operation: 'add', operands: [1, 2] }),
      );
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        Accept: 'application/json',
      });
    });

    it('omits the signal when the caller does not provide one', async () => {
      mockJsonResponse({ operation: 'add', operands: [1, 2], result: 3 });

      await calculate({ operation: 'add', operands: [1, 2] });

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(init.signal).toBeUndefined();
    });

    it('supports all operations', async () => {
      const operations: Operation[] = [
        'add',
        'subtract',
        'multiply',
        'divide',
        'power',
        'sqrt',
        'percentage',
      ];

      for (const operation of operations) {
        mockJsonResponse({
          operation,
          operands: operation === 'sqrt' ? [4] : [1, 2],
          result: 0,
        });

        await calculate({
          operation,
          operands: operation === 'sqrt' ? [4] : [1, 2],
        });
      }

      expect(fetchMock).toHaveBeenCalledTimes(operations.length);
    });

    it('forwards the AbortSignal', async () => {
      mockJsonResponse({
        operation: 'add',
        operands: [1, 2],
        result: 3,
      });
      const controller = new AbortController();
      const signal = controller.signal;

      await calculate({ operation: 'add', operands: [1, 2] }, { signal });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ signal }),
      );
    });

    it('rejects non-finite operands before sending with a normalized ApiError', async () => {
      const promise = calculate({ operation: 'add', operands: [NaN, 1] });
      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ kind: 'unknown' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects ±Infinity operands before sending', async () => {
      const promise = calculate({
        operation: 'add',
        operands: [Number.POSITIVE_INFINITY, 1],
      });
      await expect(promise).rejects.toBeInstanceOf(ApiError);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('success responses', () => {
    it('returns a validated response for binary operations', async () => {
      const data = {
        operation: 'divide',
        operands: [10, 4],
        result: 2.5,
      };
      mockJsonResponse(data);

      const result = await calculate({
        operation: 'divide',
        operands: [10, 4],
      });
      expect(result).toEqual(data);
    });

    it('returns a validated response for unary operations', async () => {
      const data = {
        operation: 'sqrt',
        operands: [9],
        result: 3,
      };
      mockJsonResponse(data);

      const result = await calculate({ operation: 'sqrt', operands: [9] });
      expect(result).toEqual(data);
    });

    it('tolerates unknown additional response fields', async () => {
      mockJsonResponse({
        operation: 'add',
        operands: [1, 2],
        result: 3,
        metadata: { latency: '10ms' },
      });

      const result = await calculate({ operation: 'add', operands: [1, 2] });
      expect(result).toEqual(
        expect.objectContaining({ operation: 'add', result: 3 }),
      );
    });
  });

  describe('invalid success responses', () => {
    const cases = [
      { name: 'null', data: null },
      { name: 'array', data: [] },
      { name: 'missing operation', data: { operands: [1, 2], result: 3 } },
      {
        name: 'unknown operation',
        data: { operation: 'mod', operands: [1, 2], result: 3 },
      },
      { name: 'missing operands', data: { operation: 'add', result: 3 } },
      {
        name: 'operands not array',
        data: { operation: 'add', operands: 1, result: 3 },
      },
      {
        name: 'non-number operand',
        data: { operation: 'add', operands: [1, '2'], result: 3 },
      },
      {
        name: 'missing result',
        data: { operation: 'add', operands: [1, 2] },
      },
      {
        name: 'non-number result',
        data: { operation: 'add', operands: [1, 2], result: '3' },
      },
      {
        name: 'NaN result',
        data: { operation: 'add', operands: [1, 2], result: NaN },
      },
    ];

    it.each(cases)('throws invalidResponse for $name', async ({ data }) => {
      mockJsonResponse(data);
      const promise = calculate({ operation: 'add', operands: [1, 2] });
      await expect(promise).rejects.toThrow(ApiError);
      await expect(promise).rejects.toMatchObject({ kind: 'invalidResponse' });
    });

    it('throws invalidResponse for malformed JSON', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('not json'),
      } as Response);

      const promise = calculate({ operation: 'add', operands: [1, 2] });
      await expect(promise).rejects.toThrow(ApiError);
      await expect(promise).rejects.toMatchObject({ kind: 'invalidResponse' });
    });
  });

  describe('API errors', () => {
    const codes: ApiErrorCode[] = [
      'invalid_json',
      'invalid_request',
      'unsupported_operation',
      'invalid_operands',
      'division_by_zero',
      'math_domain',
      'numeric_overflow',
      'payload_too_large',
      'unsupported_media_type',
      'method_not_allowed',
      'not_found',
      'internal_error',
    ];

    it.each(codes)(
      'narrows known error code %s correctly',
      async (errorCode) => {
        const status = errorCode === 'internal_error' ? 500 : 422;
        mockJsonResponse(
          {
            error: {
              code: errorCode,
              message: `Diagnostic: ${errorCode}`,
            },
          },
          status,
        );

        const promise = calculate({ operation: 'add', operands: [1, 2] });
        await expect(promise).rejects.toThrow(ApiError);
        await expect(promise).rejects.toMatchObject({
          kind: 'apiError',
          code: errorCode,
          status,
        });
      },
    );

    it('falls back to internal_error for unknown error codes', async () => {
      mockJsonResponse(
        {
          error: {
            code: 'something_weird',
            message: 'A weird error occurred',
          },
        },
        422,
      );

      const promise = calculate({ operation: 'add', operands: [1, 2] });
      const error = await promise.catch((e) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error.kind).toBe('apiError');
      expect(error.code).toBe('internal_error');
      expect(error.rawCode).toBe('something_weird');
    });

    it('throws invalidResponse if error envelope is malformed', async () => {
      mockJsonResponse({ error: 'not an object' }, 400);

      const promise = calculate({ operation: 'add', operands: [1, 2] });
      await expect(promise).rejects.toMatchObject({ kind: 'invalidResponse' });
    });

    const malformedEnvelopes = [
      { name: 'null body', data: null },
      { name: 'missing nested error', data: { message: 'oops' } },
      {
        name: 'missing code',
        data: { error: { message: 'no code here' } },
      },
      {
        name: 'non-string code',
        data: { error: { code: 42, message: 'x' } },
      },
      {
        name: 'missing message',
        data: { error: { code: 'invalid_request' } },
      },
      {
        name: 'non-string message',
        data: { error: { code: 'invalid_request', message: 42 } },
      },
    ];

    it.each(malformedEnvelopes)(
      'throws invalidResponse when non-2xx body is $name',
      async ({ data }) => {
        mockJsonResponse(data, 422);
        const promise = calculate({ operation: 'add', operands: [1, 2] });
        await expect(promise).rejects.toBeInstanceOf(ApiError);
        await expect(promise).rejects.toMatchObject({
          kind: 'invalidResponse',
        });
      },
    );

    it('classifies a valid success body on a non-2xx status as invalidResponse', async () => {
      mockJsonResponse({ operation: 'add', operands: [1, 2], result: 3 }, 500);
      const promise = calculate({ operation: 'add', operands: [1, 2] });
      await expect(promise).rejects.toMatchObject({ kind: 'invalidResponse' });
    });

    it('classifies a valid error envelope on a 2xx status as invalidResponse', async () => {
      mockJsonResponse(
        { error: { code: 'division_by_zero', message: 'nope' } },
        200,
      );
      const promise = calculate({ operation: 'add', operands: [1, 2] });
      await expect(promise).rejects.toMatchObject({ kind: 'invalidResponse' });
    });
  });

  describe('network and cancellation', () => {
    it('surfaces network kind on fetch rejection', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const promise = calculate({ operation: 'add', operands: [1, 2] });
      await expect(promise).rejects.toMatchObject({ kind: 'network' });
    });

    it('surfaces aborted kind on AbortError', async () => {
      const abortError = new DOMException('Aborted', 'AbortError');
      fetchMock.mockRejectedValueOnce(abortError);

      const promise = calculate({ operation: 'add', operands: [1, 2] });
      await expect(promise).rejects.toMatchObject({ kind: 'aborted' });
    });

    it('surfaces aborted kind when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      fetchMock.mockImplementationOnce(() => {
        // Real `fetch` rejects synchronously with an AbortError when it
        // receives an already-aborted signal.
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      });

      const promise = calculate(
        { operation: 'add', operands: [1, 2] },
        { signal: controller.signal },
      );
      await expect(promise).rejects.toBeInstanceOf(ApiError);
      await expect(promise).rejects.toMatchObject({ kind: 'aborted' });
    });

    it('does not retry on network failure', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      await expect(
        calculate({ operation: 'add', operands: [1, 2] }),
      ).rejects.toBeInstanceOf(ApiError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
