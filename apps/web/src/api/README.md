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
- `types.ts` — transport-level types only (`HttpMethod`, `Json`,
  `RequestOptions`). No calculator-specific types yet.

## Current state

- The client is **transport-generic**. It has no calculator endpoints,
  request shapes, response shapes, or server error codes.
- The **calculator contract is not yet finalized**. Domain types
  (operations, operands, results, error taxonomy) will be added alongside
  the first real endpoint, in the same change as the contract document.
- Errors from any endpoint should normalize into application-owned types
  built on top of `ApiError` — do not leak raw `Response` objects into UI
  components.

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
- Calculator-specific fixtures will live alongside the calculator API
  module once it exists (e.g., `src/api/__fixtures__/calculator.ts`).
- There is **no runtime fake REST server** in this repository, and none
  will be added. See
  [`../../../../docs/architecture.md`](../../../../docs/architecture.md#runtime-fake-backend--deliberately-not-added).

## What is intentionally not here

- **TanStack Query / other data-fetching libraries.** Removed from the
  earlier foundation. For a single-endpoint use case, a typed client plus
  focused custom hooks is clearer than a cache. Reintroduce a data
  library only if a concrete feature justifies it.
- **Retries.** Arithmetic is deterministic; retrying hides real failures.
