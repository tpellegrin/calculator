# `src/api/`

Transport-only boundary between the frontend and the future Go REST service.
All frontend network access must go through this layer — do not scatter
raw `fetch` in components.

## Files

- `client.ts` — thin `fetch` wrapper with configurable base URL, JSON body
  handling, abort-signal support, and normalized error handling.
- `errors.ts` — `ApiError` class + `ApiErrorKind` union
  (`network | aborted | invalidResponse | apiError | unknown`) used by the
  UI to render failure states.
- `calculator.ts` — typed calculator API integration that calls the Go REST
  service (`POST /api/v1/calculations`). Implements §13 of the
  [contract](../../../docs/calculator-contract.md).
- `types.ts` — transport-level types (`HttpMethod`, `Json`,
  `RequestOptions`) and calculator domain types (`Operation`,
  `CalculationRequest`, `CalculationResponse`).

## Current state

- The client is fully implemented with **calculator-specific types and
  endpoints**.
- It implements the [Calculator Contract](../../../../docs/calculator-contract.md).
- Errors are normalized into application-owned types built on top of
  `ApiError`, including specific handling for calculator error codes.

## Configuration

```
VITE_API_BASE_URL=http://localhost:8080
```

An empty base URL resolves to same-origin requests, which is convenient
for tests and for a future Vite dev proxy.

## Testing seam

- Frontend tests should mock either the boundary (the module exporting
  the calculator API) or `fetch` on `globalThis`. Vitest's `vi.mock` and
  `vi.spyOn(globalThis, 'fetch')` are sufficient here.
- Calculator-specific fixtures live alongside the calculator API
  module (e.g., `src/api/__fixtures__/calculator.ts`).
- There is **no runtime fake REST server** in this repository, and none
  will be added. See
  [`../../../../docs/architecture.md`](../../../../docs/architecture.md#runtime-fake-backend--deliberately-not-added).

## What is intentionally not here

- **TanStack Query / other data-fetching libraries.** Removed from the
  earlier foundation. For a single-endpoint use case, a typed client plus
  focused custom hooks is clearer than a cache. Reintroduce a data
  library only if a concrete feature justifies it.
- **Retries.** Arithmetic is deterministic; retrying hides real failures.
