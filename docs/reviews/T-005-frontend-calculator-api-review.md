# T-005 Frontend Calculator API Review

- **Reviewer:** Junie (independent implementation-review session, 2026-07-14)
- **Review type:** Independent implementation review with bounded corrections
- **Reviewed task:** `docs/tasks/T-005-implement-frontend-api-integration.md`
- **Verdict:** PASS WITH CORRECTIONS

## Scope reviewed

Files inspected under the T-005 permitted scope:

- `apps/web/src/api/README.md`
- `apps/web/src/api/client.ts` (existing transport client, unchanged by
  T-005 — reviewed for interaction correctness only)
- `apps/web/src/api/errors.ts` (extended by T-005)
- `apps/web/src/api/types.ts` (extended by T-005)
- `apps/web/src/api/calculator.ts` (introduced by T-005)
- `apps/web/src/api/calculator.test.ts` (introduced by T-005)
- `apps/web/tsconfig.json`, `apps/web/vite.config.ts`,
  `apps/web/package.json`
- The T-005 task file itself.

Authoritative references consulted:
`AGENTS.md`, `README.md`, `docs/calculator-contract.md` (esp. §6, §7,
§8, §13, §16), `docs/architecture.md`, `docs/implementation-guide.md`,
`docs/delivery-workflow.md`, `docs/ai-change-checklist.md`,
`docs/what-not-to-do.md`, `docs/frontend-foundation.md`,
`docs/tasks/T-001…T-004`, `docs/tasks/README.md`.

## Implementation strengths

- Types match contract §13 exactly: the `Operation` union is the seven
  required identifiers, `ApiErrorCode` is the exact twelve codes from
  §8, no aliases, no widening to `string`, no arbitrary augmentation.
- All parsed network data is treated as `unknown` and narrowed by
  hand-written checks (`isCalculationResponse`, `isApiErrorEnvelope`);
  no schema-validation dependency.
- `Number.isFinite` is used for every operand/result check (not global
  `isFinite`), so string coercion cannot slip through.
- `isRecord` correctly excludes `null` and arrays before the
  `typeof value === 'object'` narrowing — a common pitfall the
  implementation avoids.
- Unknown backend codes fall back to the local stable code
  `internal_error` with the raw string preserved in
  `ApiError.rawCode`, matching contract §13.
- No client-side arithmetic; no automatic retries; no fake backend;
  no direct `fetch` outside the API layer; the existing transport
  client and its base-URL discipline are reused (same-origin default,
  `VITE_API_BASE_URL` override).
- `ApiError` sets its prototype explicitly, so `instanceof ApiError`
  remains reliable when the class is subclassed or transpiled.
- `AbortSignal` is forwarded verbatim through the transport client; no
  internal controller replaces it and no stateful cancellation
  management is added (T-006 stays untouched).

## Blockers

None.

## Major findings

### F-1 — Raw `Error` leaked from the API surface

- **Severity:** Major
- **Location:** `apps/web/src/api/calculator.ts`, non-finite-operand
  guard inside `calculate`.
- **Finding:** The defensive guard threw
  `new Error('CalculationRequest operands must be finite numbers')`.
- **Why it matters:** Contract §13 requires the frontend API boundary
  to “never throw raw `Response` or raw `Error` at the UI; all
  failures are normalized to typed error objects with a stable kind.”
  A plain `Error` bypasses `instanceof ApiError` checks the UI will
  rely on and has no `kind`/`code`/`status`, breaking the taxonomy.
- **Required correction:** Throw an `ApiError` with a stable `kind`.
  Since this is a client-side pre-flight invariant (not a response
  problem), `kind: 'unknown'` from the existing transport taxonomy is
  the correct classification.
- **Disposition:** Corrected.

## Minor findings

### F-2 — Request-URL assertion accepted trailing suffixes

- **Severity:** Minor
- **Location:** `apps/web/src/api/calculator.test.ts`, request
  serialization test.
- **Finding:** The test asserted
  `expect.stringContaining('/api/v1/calculations')`, which would
  accept `/api/v1/calculations-legacy` or a rogue host prefix.
- **Why it matters:** T-005 §Required behavior demands the URL match
  §6.1 exactly. A substring match hides slash-joining or base-URL
  regressions.
- **Required correction:** Assert the URL is exactly
  `/api/v1/calculations` (same-origin default with empty
  `VITE_API_BASE_URL`).
- **Disposition:** Corrected.

### F-3 — Header/body assertions were structurally lax

- **Severity:** Minor
- **Location:** Same test.
- **Finding:** Headers were matched with `objectContaining` inside an
  outer `objectContaining`, so a wrongly stringified body or an
  unexpected `Content-Type` value would still be tolerated as long as
  a subset matched. `body` was checked but not explicitly typed.
- **Why it matters:** Weak assertions defeat the purpose of a request
  construction test, which is a contract-boundary test.
- **Required correction:** Read the first `fetchMock.mock.calls[0]`
  tuple, type it as `[string, RequestInit]`, assert `method`, `body`,
  and headers directly.
- **Disposition:** Corrected.

### F-4 — Missing coverage for the “no signal provided” path

- **Severity:** Minor
- **Location:** Same test suite.
- **Finding:** Signal forwarding was tested only when a signal was
  provided.
- **Why it matters:** A regression that always attaches an internal
  controller (converting caller-less invocations into always-abortable
  ones or worse) would go undetected. T-005 requires the caller signal
  to be passed through unchanged.
- **Required correction:** Add a test asserting `init.signal` is
  `undefined` when `options` is omitted.
- **Disposition:** Corrected.

### F-5 — Missing coverage for status/body cross-consistency

- **Severity:** Minor
- **Location:** `apps/web/src/api/calculator.test.ts`.
- **Finding:** T-005 §Edge cases explicitly calls out “A 2xx response
  with an error envelope → `invalidResponse`” and, by the review
  brief’s status/body matrix, “failure status carrying a valid success
  body → `invalidResponse`.” Neither branch was covered.
- **Why it matters:** These are exactly the drift points where
  success-vs-error is inferred from body shape instead of status; the
  code’s current behavior happens to be correct, but no test proved it.
- **Required correction:** Add both cases with explicit assertions.
- **Disposition:** Corrected.

### F-6 — Malformed error envelope had only one shape covered

- **Severity:** Minor
- **Location:** `apps/web/src/api/calculator.test.ts`.
- **Finding:** Only `{ error: 'not an object' }` was tested. Missing
  cases: `null` body, missing nested `error`, missing `code`,
  non-string `code`, missing `message`, non-string `message`.
- **Why it matters:** These directly probe `isApiErrorEnvelope`, the
  narrower most likely to accept malformed shapes silently.
- **Required correction:** Add a table-driven test covering the six
  cases and asserting `kind: 'invalidResponse'` and
  `instanceof ApiError`.
- **Disposition:** Corrected.

### F-7 — No explicit already-aborted-signal test

- **Severity:** Minor
- **Location:** `apps/web/src/api/calculator.test.ts`.
- **Finding:** Cancellation was only tested by rejecting fetch with
  an `AbortError` after the fact.
- **Why it matters:** Per the WHATWG Fetch spec, `fetch` invoked with
  an already-aborted signal rejects synchronously with an
  `AbortError`. A regression that swallowed already-aborted
  invocations as `network` would be indistinguishable from the
  existing test.
- **Required correction:** Add a test that aborts the controller
  before calling `calculate` and asserts `kind: 'aborted'`.
- **Disposition:** Corrected.

### F-8 — No explicit no-retry assertion

- **Severity:** Minor
- **Location:** `apps/web/src/api/calculator.test.ts`.
- **Finding:** T-005 forbids automatic retries. Nothing asserted
  `fetchMock` was invoked exactly once on failure.
- **Why it matters:** A future regression that adds an “on network
  error, try once” loop would still make all existing tests pass.
- **Required correction:** Add a test asserting `fetchMock` is called
  once on a `TypeError` rejection.
- **Disposition:** Corrected.

## Test-quality findings

- The `mockJsonResponse` helper originally exposed a `json()` method
  that duplicated the real transport contract. The transport client
  reads the body through `response.text()` and parses it locally
  (`safeParseJson`), so `json()` on the mock is unused. It was left in
  place because removing it would not increase coverage and would
  divorce the mock from a realistic `Response`. No correction applied.
- `vi.unstubAllGlobals()` and `vi.clearAllMocks()` are called in
  `afterEach`; global fetch is fully restored between tests. No
  leakage.
- Every failure-path assertion now checks `instanceof ApiError` *and*
  the specific `kind`, so message-only comparisons cannot hide a
  type-taxonomy regression.
- The known-codes table drives all twelve `ApiErrorCode` values from a
  single array shared with the type; a divergence between the runtime
  set and the union would break the test at compile time.
- The already-existing “tolerates unknown additional response fields”
  test still exercises the additive-field allowance from contract §6.3.

## Corrections applied

| ID  | File                                         | Correction                                                                                             |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| F-1 | `apps/web/src/api/calculator.ts`             | Non-finite operand guard now throws `ApiError('unknown', …, { body })` instead of a raw `Error`.       |
| F-2 | `apps/web/src/api/calculator.test.ts`        | Request URL asserted as exactly `/api/v1/calculations`.                                                |
| F-3 | `apps/web/src/api/calculator.test.ts`        | Request `method`, `body`, and `headers` asserted directly on the captured `RequestInit`.               |
| F-4 | `apps/web/src/api/calculator.test.ts`        | New test: `init.signal` is `undefined` when the caller omits `options`.                                |
| F-1 | `apps/web/src/api/calculator.test.ts`        | Non-finite-operand test now asserts `instanceof ApiError` and `kind: 'unknown'`; adds `±Infinity`.     |
| F-5 | `apps/web/src/api/calculator.test.ts`        | Added `2xx + valid error envelope → invalidResponse` and `non-2xx + valid success body → invalidResponse`. |
| F-6 | `apps/web/src/api/calculator.test.ts`        | Added table-driven malformed-envelope test covering six shapes.                                        |
| F-7 | `apps/web/src/api/calculator.test.ts`        | Added `already-aborted signal → aborted` test.                                                         |
| F-8 | `apps/web/src/api/calculator.test.ts`        | Added `no retry on network failure` (asserts exactly one fetch call).                                  |

## Remaining recommendations

- The transport client (`client.ts`) is out of T-005 scope, but two
  low-risk hardening opportunities are worth logging for a future
  task:
  1. `isAbortError` currently checks `DOMException.name === 'AbortError'`.
     Some environments surface abort as a `DOMException` without the
     `DOMException` global at test time; the existing check is
     adequate for jsdom/Node ≥ 20 but a fallback on
     `error?.name === 'AbortError'` would be more portable.
  2. `safeParseJson` parses regardless of `Content-Type`. Contract §9
     guarantees `application/json; charset=utf-8`, but a defensive
     check could avoid parsing HTML error pages served by an
     intermediate proxy. Neither change belongs to T-005.
- The `ApiError.rawCode` field is only populated on the unknown-code
  fallback path. If any downstream consumer needs to distinguish
  “unknown code” from “known code + rawCode absent,” the field
  contract may need to be documented in `README.md` in a follow-up.

## Official sources consulted

- WHATWG Fetch — <https://developer.mozilla.org/docs/Web/API/Fetch_API>
- `Window.fetch` — <https://developer.mozilla.org/docs/Web/API/Window/fetch>
- `Response.json` — <https://developer.mozilla.org/docs/Web/API/Response/json>
- `AbortController` — <https://developer.mozilla.org/docs/Web/API/AbortController>
- `AbortSignal` — <https://developer.mozilla.org/docs/Web/API/AbortSignal>
- TypeScript narrowing — <https://www.typescriptlang.org/docs/handbook/2/narrowing.html>
- `tsconfig` strict flags — <https://www.typescriptlang.org/tsconfig/strict.html>
- Vitest mocking — <https://vitest.dev/guide/mocking.html>

## Validation

| Command                                                | Baseline | Final |
| ------------------------------------------------------ | -------- | ----- |
| `pnpm --filter @calculator/web format:check`           | PASS     | PASS  |
| `pnpm --filter @calculator/web lint`                   | PASS     | PASS  |
| `pnpm --filter @calculator/web typecheck`              | PASS     | PASS  |
| `pnpm --filter @calculator/web test:run`               | PASS (50 tests) | PASS (62 tests) |
| `pnpm --filter @calculator/web build`                  | PASS     | PASS  |
| `pnpm --filter @calculator/web validate`               | PASS     | PASS  |
| `pnpm validate` (root, delegates to `validate:web`)    | PASS     | PASS  |
| `git diff --check`                                     | PASS     | PASS  |

## Final verdict rationale

The T-005 implementation meets every accepted contract decision:
exact operation and error-code unions, hand-written narrowers over
`unknown`, unknown-code fallback with raw-code preservation, no
schema library, no retries, no client arithmetic, no runtime fake
backend, `AbortSignal` forwarded verbatim, and a strict same-origin
transport that reuses the existing client. The single behavioral
defect — a raw `Error` leaking from the pre-flight non-finite guard —
is corrected. Test quality has been raised to prove the URL, method,
body, headers, signal forwarding, no-retry, status/body cross-
consistency, malformed envelope shapes, and already-aborted signal
behavior explicitly. All validation commands pass on the final tree.
Verdict: **PASS WITH CORRECTIONS.**
