/**
 * Application-owned API error taxonomy.
 *
 * These are intentionally transport-generic. The upcoming calculator API will
 * add its own domain error codes on top of `ApiError` (see `./README.md`).
 */

import type { ApiErrorCode } from './types';

export type ApiErrorKind =
  /** The request could not be sent (offline, DNS, TLS, etc.). */
  | 'network'
  /** The caller aborted the request before it completed. */
  | 'aborted'
  /** The server responded, but the payload could not be parsed. */
  | 'invalidResponse'
  /** The server responded with a structured, non-2xx error. */
  | 'apiError'
  /** Anything unexpected — should be treated as a bug. */
  | 'unknown';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly body?: unknown;
  readonly cause?: unknown;
  readonly code?: ApiErrorCode;
  readonly rawCode?: string;

  constructor(
    kind: ApiErrorKind,
    message: string,
    options?: {
      status?: number;
      body?: unknown;
      cause?: unknown;
      code?: ApiErrorCode;
      rawCode?: string;
    },
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options?.status;
    this.body = options?.body;
    this.cause = options?.cause;
    this.code = options?.code;
    this.rawCode = options?.rawCode;

    // Fix prototype chain for custom error in some environments
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const isApiError = (value: unknown): value is ApiError =>
  value instanceof ApiError;

export const isAbortError = (value: unknown): boolean =>
  value instanceof DOMException && value.name === 'AbortError';
