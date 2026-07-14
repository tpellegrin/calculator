import { apiClient } from './client';
import { ApiError, isApiError } from './errors';
import type {
  ApiErrorCode,
  CalculationRequest,
  CalculationResponse,
  Json,
  Operation,
} from './types';

const API_ERROR_CODES = [
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
] as const satisfies readonly ApiErrorCode[];

const OPERATIONS = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'power',
  'sqrt',
  'percentage',
] as const satisfies readonly Operation[];

const API_ERROR_CODE_SET: ReadonlySet<string> = new Set(API_ERROR_CODES);
const OPERATION_SET: ReadonlySet<string> = new Set(OPERATIONS);

export interface CalculateOptions {
  readonly signal?: AbortSignal;
}

interface ApiErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOperation(value: unknown): value is Operation {
  return typeof value === 'string' && OPERATION_SET.has(value);
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && API_ERROR_CODE_SET.has(value);
}

/**
 * Validates a calculation response while permitting additional properties.
 */
export function isCalculationResponse(
  value: unknown,
): value is CalculationResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isOperation(value.operation) &&
    Array.isArray(value.operands) &&
    value.operands.every(isFiniteNumber) &&
    isFiniteNumber(value.result)
  );
}

/**
 * Validates the structural portion of a backend error envelope.
 *
 * The error code is intentionally validated separately because the server may
 * return an unknown code that still belongs to an otherwise valid envelope.
 */
export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value) || !isRecord(value.error)) {
    return false;
  }

  return (
    typeof value.error.code === 'string' &&
    typeof value.error.message === 'string'
  );
}

function validateRequest(request: CalculationRequest): void {
  if (request.operands.every(isFiniteNumber)) {
    return;
  }

  throw new ApiError(
    'unknown',
    'CalculationRequest operands must be finite numbers.',
    {
      body: request.operands,
    },
  );
}

/**
 * Produces an explicitly JSON-compatible request body.
 *
 * Constructing the object avoids asserting that the complete request object is
 * JSON-compatible and ensures that only contract fields are transmitted.
 */
function toRequestBody(request: CalculationRequest): Json {
  return {
    operation: request.operation,
    operands: [...request.operands],
  };
}

function normalizeApiError(error: ApiError): ApiError {
  if (error.kind !== 'apiError') {
    return error;
  }

  const { body, status } = error;

  if (!isApiErrorEnvelope(body)) {
    return new ApiError(
      'invalidResponse',
      'Server returned an error status but the error envelope was malformed.',
      {
        status,
        body,
        cause: error,
      },
    );
  }

  const { code, message } = body.error;

  if (isApiErrorCode(code)) {
    return new ApiError('apiError', message, {
      status,
      body,
      code,
      cause: error,
    });
  }

  return new ApiError('apiError', message, {
    status,
    body,
    code: 'internal_error',
    rawCode: code,
    cause: error,
  });
}

function normalizeThrownValue(error: unknown): ApiError {
  if (isApiError(error)) {
    return normalizeApiError(error);
  }

  return new ApiError(
    'unknown',
    'An unexpected error occurred while performing the calculation.',
    {
      cause: error,
    },
  );
}

/**
 * Performs a calculation using the Go REST service.
 *
 * @param request - Operation and operands to submit.
 * @param options - Optional request configuration.
 * @returns The validated calculation response.
 * @throws {ApiError} If validation, transport, cancellation, parsing, or
 * response validation fails.
 */
export async function calculate(
  request: CalculationRequest,
  options?: CalculateOptions,
): Promise<CalculationResponse> {
  validateRequest(request);

  let payload: unknown;

  try {
    payload = await apiClient.post(
      '/api/v1/calculations',
      toRequestBody(request),
      options,
    );
  } catch (error: unknown) {
    throw normalizeThrownValue(error);
  }

  if (!isCalculationResponse(payload)) {
    throw new ApiError(
      'invalidResponse',
      'Server returned a successful status but the response body was malformed.',
      {
        body: payload,
      },
    );
  }

  return payload;
}
