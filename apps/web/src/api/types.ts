/**
 * Transport-generic API types.
 *
 * The calculator domain contract (operations, payload shapes, server error
 * codes) will be added alongside the first real endpoint. Keep this file free
 * of domain-specific types until then.
 */

export type ApiErrorCode =
  | 'invalid_json'
  | 'invalid_request'
  | 'unsupported_operation'
  | 'invalid_operands'
  | 'division_by_zero'
  | 'math_domain'
  | 'numeric_overflow'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'method_not_allowed'
  | 'not_found'
  | 'internal_error';

export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage';

export interface CalculationRequest {
  readonly operation: Operation;
  readonly operands: readonly number[];
}

export interface CalculationResponse {
  readonly operation: Operation;
  readonly operands: readonly number[];
  readonly result: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type RequestOptions = {
  method?: HttpMethod;
  /** Parsed JSON body — will be `JSON.stringify`ed by the client. */
  body?: Json;
  /** Extra headers merged over the client defaults. */
  headers?: Record<string, string>;
  /** Abort signal for user- or timeout-driven cancellation. */
  signal?: AbortSignal;
};
