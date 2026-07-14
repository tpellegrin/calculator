/**
 * Transport-generic API types.
 *
 * The calculator domain contract (operations, payload shapes, server error
 * codes) will be added alongside the first real endpoint. Keep this file free
 * of domain-specific types until then.
 */

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
