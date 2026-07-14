/**
 * Minimal typed JSON API client.
 *
 * Design notes:
 *   - The calculator will call a single Go REST service, so a thin wrapper over
 *     `fetch` is proportional. TanStack Query and generic repository classes
 *     were intentionally NOT reintroduced.
 *   - The client normalizes transport-level failures into a single `ApiError`
 *     taxonomy (see `errors.ts`) so callers can render UI states declaratively.
 *   - Base URL is configurable via `VITE_API_BASE_URL`. When empty, requests
 *     are made to the same origin (useful for dev proxying and tests).
 *   - There is no automatic retry — arithmetic requests are deterministic and
 *     retrying on failure would hide real problems.
 */

import { ApiError, isAbortError } from './errors';
import type { RequestOptions } from './types';

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: 'application/json',
};

const readBaseUrl = (): string => {
  const fromEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta.env?.VITE_API_BASE_URL as string | undefined)
      : undefined;
  return (fromEnv ?? '').replace(/\/$/, '');
};

const buildUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  const base = readBaseUrl();
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
};

const safeParseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiError('invalidResponse', 'Server returned invalid JSON.', {
      status: response.status,
      body: text,
      cause,
    });
  }
};

/**
 * Perform a JSON request against the configured API.
 *
 * On success, resolves with the parsed JSON body typed as `T` (callers are
 * responsible for validating the shape). On failure, always rejects with an
 * `ApiError`.
 */
export const request = async <T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { method = 'GET', body, headers, signal } = options;

  const init: RequestInit = {
    method,
    headers: {
      ...DEFAULT_HEADERS,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    signal,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), init);
  } catch (cause) {
    if (isAbortError(cause)) {
      throw new ApiError('aborted', 'Request was aborted.', { cause });
    }
    throw new ApiError('network', 'Network request failed.', { cause });
  }

  const payload = await safeParseJson(response);

  if (!response.ok) {
    throw new ApiError(
      'apiError',
      `Request failed with status ${response.status}.`,
      { status: response.status, body: payload },
    );
  }

  return payload as T;
};

export const apiClient = {
  request,
  get: <T = unknown>(
    path: string,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...options, method: 'GET' }),
  post: <T = unknown>(
    path: string,
    body?: RequestOptions['body'],
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => request<T>(path, { ...options, method: 'POST', body }),
};
