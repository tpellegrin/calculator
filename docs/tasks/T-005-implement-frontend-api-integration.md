# T-005 — Implement frontend calculator API integration

- **Status**: Ready
- **Depends on**: T-001 (may run in parallel with T-002/T-003; runtime validation of shape parity requires T-003)
- **Owner**: Thiago (implementer TBD)

## Objective

Add the typed calculator API function, request/response types,
error-code union, hand-written runtime narrowing, and cancellation
support to `apps/web/src/api/`, without introducing schema-validation
dependencies or duplicating backend arithmetic.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md), especially
  §6, §8, §13, §16.4.
- [`apps/web/src/api/README.md`](../../apps/web/src/api/README.md).
- Existing `client.ts`, `errors.ts`, `types.ts` under
  `apps/web/src/api/`.

## Context

The transport-level client already exists. This task adds the
calculator-specific layer on top of it.

## Accepted decisions

- Union types match the contract exactly:
  - `Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'percentage'`;
  - `ApiErrorCode` = the exact 12 codes in contract §8.
- Response parsing uses `unknown` and hand-written narrowers. No
  `zod`, `io-ts`, or similar.
- No client-side arithmetic to verify results.
- Uses `AbortController`. No automatic retries.
- Unknown additional response fields are tolerated.

## Scope

- New module `apps/web/src/api/calculator.ts` (or similar) exporting:
  - `Operation` union type;
  - `CalculationRequest`, `CalculationResponse` types;
  - `ApiErrorCode` union type;
  - `calculate(request, options?: { signal?: AbortSignal }): Promise<CalculationResponse>`;
  - narrower functions `isCalculationResponse(u: unknown)` and
    `isApiErrorEnvelope(u: unknown)` (or similar).
- Extension of `errors.ts` if needed to expose the `ApiErrorCode`
  union while keeping the existing `ApiErrorKind` for transport
  concerns; the calculator error should carry both.
- Tests under `apps/web/src/api/` for serialization, response
  narrowing, known error codes, unknown error handling,
  cancellation, and network failure normalization.

## File scope

Permitted:

- `apps/web/src/api/*.ts`
- `apps/web/src/api/__tests__/*.ts` or
  `apps/web/src/api/*.test.ts` per repository convention.
- `apps/web/src/api/README.md` for a minimal update.

Not permitted:

- Any file under `apps/web/src/features/`,
  `apps/web/src/containers/`, `apps/web/src/components/` (owned by
  T-006/T-007).
- Any file under `apps/api/**`.
- Adding an npm dependency.

## Out of scope

- Feature-level React components or state model.
- Automatic retries.
- Schema-validation libraries.
- Any arithmetic.

## Required implementation

1. Types:
   ```ts
   export type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'percentage';
   export type ApiErrorCode =
     | 'invalid_json' | 'invalid_request' | 'unsupported_operation'
     | 'invalid_operands' | 'division_by_zero' | 'math_domain'
     | 'numeric_overflow' | 'payload_too_large' | 'unsupported_media_type'
     | 'method_not_allowed' | 'not_found' | 'internal_error';
   export interface CalculationRequest  { operation: Operation; operands: number[]; }
   export interface CalculationResponse { operation: Operation; operands: number[]; result: number; }
   ```
2. `calculate` function:
   - `POST /api/v1/calculations` via the existing transport client;
   - request body is `JSON.stringify(request)`;
   - accepts `options.signal` for cancellation;
   - parses response as `unknown`, narrows via hand-written checks;
   - on 2xx that fails narrowing → throws a typed
     `invalidResponse` error;
   - on non-2xx: parses the envelope; if `error.code` is one of
     `ApiErrorCode`, throws a typed calculator API error with that
     code; unknown code → `apiError` with a fallback code (e.g.
     `internal_error`) and preserves the raw string in a
     `rawCode` field;
   - on `AbortError` → surfaces `aborted` kind;
   - on network failure → surfaces `network` kind.
3. No retries anywhere in this module.
4. Public interface: only `calculate` and the exported types/narrowers.

## Required behavior

Reproducible via `vitest` with `fetch` mocked on `globalThis`:

- Request serialization matches contract §6.2 exactly (JSON body,
  correct headers set by the transport).
- Success narrows and returns `{operation, operands, result}`.
- Unknown additional fields in the success body do not cause
  failure.
- Each of the 12 error codes narrows correctly.
- An unknown `code` value is surfaced as an `apiError` with a
  fallback code and the raw string preserved.
- `signal.abort()` in flight resolves with an `aborted` kind and no
  request-level error is thrown to callers who checked the signal.
- `fetch` rejecting with a `TypeError` yields a `network` kind.
- Two concurrent calls with different signals do not share state.

## Edge cases

- Response body that is not JSON → `invalidResponse`.
- Response body whose `operands` field contains a string → narrower
  fails → `invalidResponse`.
- Response body whose `result` is missing → narrower fails.
- `error.message` present but `error.code` missing → `apiError` with
  fallback code.
- A 2xx response with an error envelope → treated as
  `invalidResponse` (2xx should not carry an envelope).
- HTTP `204` is not a valid success shape (contract requires a body);
  narrower fails → `invalidResponse`.

## Tests

- Vitest tests with `vi.spyOn(globalThis, 'fetch')`.
- Table-driven cases for the 12 codes, with expected `code` and
  `kind` for each.
- Explicit tests for cancellation, network failure, JSON parse
  failure, narrowing failure.
- Type-level tests (`expectTypeOf` or equivalent) that assert the
  operation and error-code unions cover exactly the accepted sets.

## Validation

From repository root:

```bash
pnpm --filter @calculator/web format:check
pnpm --filter @calculator/web lint
pnpm --filter @calculator/web typecheck
pnpm --filter @calculator/web test
pnpm --filter @calculator/web build
pnpm validate
git diff --check
```

## Documentation impact

- Update `apps/web/src/api/README.md` to describe `calculator.ts`
  and point at `docs/calculator-contract.md`.

## Stop conditions

- Contract union and the required code union diverge (stop; escalate).
- Narrowing cannot be expressed without `any`, a new dependency, or
  a schema library (stop; escalate).
- The transport client's public API cannot serialize a JSON body
  and set `Content-Type` without duplication (stop; escalate — this
  hints at needing a minor client extension).

## Completion report

- Files added or modified; test list; type-level union verification;
  validation output; explicit confirmation: no `any`, no new
  dependency, no arithmetic.
