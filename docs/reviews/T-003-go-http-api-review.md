# T-003 Go HTTP API Review

- **Reviewer:** Junie (Claude Opus 4.7), independent post-implementation review session
- **Review type:** Independent implementation review with bounded corrections
- **Reviewed task:** [`docs/tasks/T-003-implement-go-http-api.md`](../tasks/T-003-implement-go-http-api.md)
- **Verdict:** PASS WITH CORRECTIONS

## Scope reviewed

Files inspected:

- `apps/api/internal/httpapi/doc.go`
- `apps/api/internal/httpapi/errors.go`
- `apps/api/internal/httpapi/handler.go`
- `apps/api/internal/httpapi/handler_test.go`

Authoritative inputs re-read: `docs/calculator-contract.md`,
`docs/tasks/T-001-…md`, `docs/tasks/T-002-…md`,
`docs/tasks/T-003-…md`, `docs/architecture.md`,
`docs/implementation-guide.md`, `docs/delivery-workflow.md`,
`docs/ai-change-checklist.md`, `docs/what-not-to-do.md`,
`apps/api/README.md`, `apps/api/go.mod`, and the calculator domain
package (read-only). No T-003 review report existed prior to this
session.

## Implementation strengths

- Uses `http.MaxBytesReader` correctly, before any unbounded read.
- Uses `mime.ParseMediaType` (rather than string matching) for the
  content-type gate.
- Uses `errors.Is` for every domain-error mapping and `errors.As` for
  `*http.MaxBytesError` and `*json.UnmarshalTypeError`.
- Delegates every arithmetic decision to `calculator.Calculate`;
  no domain logic leaks into the boundary.
- Handler is stateless and safe for concurrent use.
- Unknown fields are rejected via `decoder.DisallowUnknownFields()`.
- Response and error envelopes use standard-library JSON encoding
  (no manual string concatenation).

## Blockers

None.

## Major findings

### F-01 — `null` JSON operand accepted as `0` (contract §7 rule 8 violation)

- **ID:** F-01
- **Severity:** Major
- **Location:** `apps/api/internal/httpapi/handler.go` — request DTO
  `Operands *[]float64`.
- **Finding:** Because `encoding/json` unmarshals a literal `null`
  into a `float64` as the zero value with no error, a request such as
  `{"operation":"add","operands":[null,2]}` was silently treated as
  `[0,2]` and returned `200 OK` with `result: 2`. Contract §7 rule 8
  (and §5.2) mandate `400 invalid_request` for `null` operand elements.
- **Why it matters:** Contract-visible correctness defect; frontend
  narrowing and downstream tests rely on this exact classification.
- **Required correction:** Decode operands into `[]*float64` and
  reject nil elements as `invalid_request` before dereferencing.
- **Disposition:** Corrected.

### F-02 — Empty body classified as `invalid_request` instead of `invalid_json`

- **ID:** F-02
- **Severity:** Major
- **Location:** `apps/api/internal/httpapi/handler.go` —
  `classifyDecodeError` `io.EOF` branch.
- **Finding:** Empty and whitespace-only bodies produced
  `400 invalid_request`. Contract §7 rule 7 (well-formed JSON) and
  the T-003 "Required behavior" line (`Empty body → 400, code
  invalid_json`) both require `invalid_json`.
- **Why it matters:** Direct deviation from two higher-priority
  authorities. The reviewer prompt for this session states the
  opposite; per the assignment's own authority order (contract >
  T-003 > reviewer preference), contract and T-003 win. The
  contradiction is noted here.
- **Required correction:** Route empty-body / whitespace-only decode
  failures through the default `invalid_json` classifier.
- **Disposition:** Corrected.

### F-03 — Dead `http.ServeMux` in `NewHandler`

- **ID:** F-03
- **Severity:** Major (maintainability)
- **Location:** `apps/api/internal/httpapi/handler.go` — `NewHandler`
  built a `http.ServeMux`, registered path handlers on it, and then
  returned a wrapping `http.HandlerFunc` that never consulted the
  mux. The mux and its registrations were dead code.
- **Why it matters:** Misleads reviewers, invites the false belief
  that the mux participates in dispatch, and would cause
  behavioral divergence if a maintainer later called the mux.
- **Required correction:** Remove the dead mux; keep the explicit
  switch-based dispatch that already owns every 404 / 405 body per
  contract §11.
- **Disposition:** Corrected.

## Minor findings

### F-04 — `err == io.EOF` instead of `errors.Is`

- **ID:** F-04
- **Severity:** Minor (idiom / robustness)
- **Location:** `handleCalculations` trailing-value check and
  `classifyDecodeError` empty-body branch.
- **Finding:** Direct `==` comparison bypasses wrapped errors.
- **Required correction:** Use `errors.Is(err, io.EOF)`.
- **Disposition:** Corrected.

### F-05 — Domain `err.Error()` echoed as the wire message

- **ID:** F-05
- **Severity:** Minor
- **Location:** `writeDomainError` (previously `mapDomainError`).
- **Finding:** Each domain error was rendered with `err.Error()`,
  coupling the wire message to the domain's internal error strings
  and inviting accidental leakage if domain errors were ever
  enriched with details.
- **Required correction:** Emit stable, boundary-owned diagnostic
  messages; keep the `error.code` as the machine contract.
- **Disposition:** Corrected.

### F-06 — Response emission not atomic

- **ID:** F-06
- **Severity:** Minor
- **Location:** `sendError` / handler success paths.
- **Finding:** Headers were written and status set before invoking
  `json.NewEncoder(w).Encode`. A late encoding failure would leave
  the client with the success status and a truncated body. Every
  DTO here is statically shaped, so this is unlikely in practice,
  but a buffered write costs nothing.
- **Required correction:** Encode to a `bytes.Buffer` first; only
  write headers and body on success, with a pre-serialized
  `internal_error` envelope as a defensive fallback.
- **Disposition:** Corrected.

## Test-quality findings

### F-07 — `Allow` header value not asserted

- **Location:** `handler_test.go`.
- **Finding:** 405 tests only checked that `Allow` was non-empty.
- **Correction:** New table asserts `Allow: POST` for
  `/api/v1/calculations` and `Allow: GET` for `/healthz` for every
  non-permitted method (GET/PUT/DELETE/PATCH on calculations, POST
  /PUT/DELETE on healthz).
- **Disposition:** Corrected.

### F-08 — Negative-zero test relied on substring only

- **Location:** `TestZeroNormalization`.
- **Finding:** `strings.Contains(body, "-0")` is a necessary but not
  sufficient check; it would silently pass for a JSON body that
  happened to contain no minus sign for unrelated reasons.
- **Correction:** New `TestNegativeZeroNormalization` decodes the
  response and asserts `math.Signbit` on every echoed operand and
  the result (Go's `encoding/json` round-trips signed zero
  faithfully, so `Signbit` after decode is the authoritative
  observation).
- **Disposition:** Corrected.

### F-09 — Body-limit boundary not covered

- **Location:** `handler_test.go`.
- **Finding:** Only the oversized case was tested; contract §7 rule 3
  ("strictly greater than 16 384 bytes") requires proof that exactly
  16 384 bytes is accepted.
- **Correction:** Added `TestBodySize_ExactBoundaryIsAccepted` that
  pads a valid payload with legal JSON whitespace to hit exactly
  `maxRequestBytes` and asserts `200 OK`; and
  `TestBodySize_OverBoundaryRejects` that adds one padding byte and
  asserts `413 payload_too_large` with `codePayloadTooLarge`.
- **Disposition:** Corrected.

### F-10 — Duplicate-`operands` case, arity mismatch, unknown paths, and content-type variations untested

- **Location:** `handler_test.go`.
- **Finding:** The original suite tested duplicate `operation` only,
  no arity mismatch, no `/api/v1/calculations/extra`,
  `/api/v2/calculations`, or trailing-slash 404 cases, and no
  malformed / `application/xml` / `application/problem+json`
  content-type rejections.
- **Correction:** Added dedicated cases for each rule, including
  duplicate operands (last-value-wins asserts `[10 20]` / `30`),
  unary-vs-binary arity mismatches, empty-operands arity,
  divide-by-negative-zero, power-domain zero-negative-exponent,
  multiply overflow, `Application/JSON` and quoted-charset
  acceptance, and top-level non-object JSON representations.
- **Disposition:** Corrected.

### F-11 — Race safety not exercised by an explicit test

- **Location:** `handler_test.go`.
- **Finding:** `go test -race` passed only because the handler was
  invoked serially. A concurrent exerciser makes the safety
  guarantee explicit and future-proofs against reintroduced state.
- **Correction:** Added `TestConcurrentHandlerUse` (32 workers × 20
  iterations against a single handler instance).
- **Disposition:** Corrected.

### F-12 — Fuzz safety net

- **Location:** `handler_test.go`.
- **Finding:** Optional per the T-003 fuzz-assessment guidance. The
  boundary handles arbitrary input; a small in-package fuzz target
  cheaply verifies "never panics; always emits a JSON envelope with
  a known error code."
- **Correction:** Added `FuzzCalculationsHandler` seeded with the
  canonical shapes. No external dependency; runs in milliseconds
  under `go test`.
- **Disposition:** Corrected.

## Corrections applied

| Finding | File | Description |
| ------- | ---- | ----------- |
| F-01 | `apps/api/internal/httpapi/handler.go` | Decode operands as `[]*float64`; reject nil elements as `invalid_request`. |
| F-02 | `apps/api/internal/httpapi/handler.go` | Empty / whitespace-only body → `invalid_json`. |
| F-03 | `apps/api/internal/httpapi/handler.go` | Removed dead `http.ServeMux`; kept explicit path/method switch. |
| F-04 | `apps/api/internal/httpapi/handler.go` | `errors.Is(err, io.EOF)` at the trailing-value gate. |
| F-05 | `apps/api/internal/httpapi/handler.go` | Boundary-owned diagnostic messages for every domain error. |
| F-06 | `apps/api/internal/httpapi/errors.go` | Buffered `writeJSON`; static fallback envelope on encoder failure. |
| F-07..F-12 | `apps/api/internal/httpapi/handler_test.go` | Complete rewrite of the suite (per-rule tables, `Allow` value asserts, boundary tests, signbit assertion, concurrency, fuzz). |

Also renamed the private helper `sendError` → `writeError`, extracted
`maxRequestBytes`, `pathCalculations`, `pathHealthz`, and
`mediaTypeJSON` constants for readability, and added Go-doc comments
matching CodeReviewComments conventions.

## Remaining recommendations

- **Out of scope for T-003, deferred to T-004:** server startup,
  timeouts, panic recovery middleware, structured logging,
  graceful-shutdown wiring. Confirmed not present in
  `internal/httpapi`; still absent after corrections.
- **Non-defect observation:** The T-003 spec listed the DTOs as
  exported (`CalculationRequest`, `CalculationResponse`). Because no
  other package in the workspace consumes them (the server package
  will only need `NewHandler()`), and because the reviewer prompt
  and Go CodeReviewComments prefer minimizing exports, they remain
  package-private. `ErrorEnvelope` stays exported because in-package
  tests document the envelope shape via that type and future
  integration harnesses inside `apps/api` may reasonably reuse it.
  Recorded here for owner visibility; not applied as a change either
  way.
- **Authority contradiction noted (F-02):** The reviewer prompt for
  this session asked that first-decode `io.EOF` be classified as
  `invalid_request`, contradicting the contract and T-003. Per the
  session's own authority order, contract and T-003 win. Reported
  for owner awareness; no change to the accepted contract implied.

## Official Go sources consulted

- `net/http`: `Handler`, `HandlerFunc`, `MaxBytesReader`,
  `MaxBytesError`, `ServeMux` semantics (Go 1.22 default
  `text/plain` 405 body confirmed — the reason the package owns the
  405 body explicitly).
- `net/http/httptest`: `NewRequest`, `NewRecorder`.
- `encoding/json`: `Decoder`, `Decoder.DisallowUnknownFields`,
  `Decoder.Decode`, `SyntaxError`, `UnmarshalTypeError`, duplicate
  member behavior (last-value-wins), `null` → zero-value behavior
  for numeric types.
- `errors`: `Is`, `As`.
- `mime`: `ParseMediaType` (case-insensitive type; quoted parameters
  permitted).
- `go.dev/wiki/CodeReviewComments`, `go.dev/doc/effective_go`
  (naming, package doc, exported-symbol discipline).

No source citations were embedded in production code.

## Validation

| Command                                                          | Baseline | Final |
| ---------------------------------------------------------------- | -------- | ----- |
| `test -z "$(gofmt -l .)"` (from `apps/api`)                      | PASS     | PASS  |
| `go vet ./...` (from `apps/api`)                                 | PASS     | PASS  |
| `go test ./internal/httpapi/...`                                 | PASS     | PASS  |
| `go test -race ./internal/httpapi/...`                           | PASS     | PASS  |
| `go test ./internal/calculator ./internal/httpapi`               | PASS     | PASS  |
| `go test -race ./internal/calculator ./internal/httpapi`         | PASS     | PASS  |
| `go test ./...` (from `apps/api`)                                | PASS     | PASS  |
| `go build ./...` (from `apps/api`)                               | PASS     | PASS  |

Test coverage after corrections spans: routing (known paths, unknown
paths, trailing slash, method matrix), Allow header exact value,
health body exact bytes, content-type gate (missing / plain / xml /
problem+json / malformed / plain / charset / capitalised /
quoted-parameter), body-limit boundary (16 384 accepted / 16 385
rejected), invalid JSON (empty / whitespace / truncated / NaN /
Infinity / -Infinity / bad escape / trailing object / trailing
literal / trailing garbage), invalid request (13 representative
shapes including `null` operand, boolean operand, object operand,
stringified NaN, unknown field), duplicate members (operation and
operands, last-value-wins asserted), full domain mapping (all 5
sentinel errors including power-domain and overflow), success
responses for every operation, negative-zero normalization via
`math.Signbit`, partial-body classification, concurrent handler
use, and a fuzz safety net.

## Final verdict rationale

The pre-review implementation compiled and its tests passed, but it
carried three material defects (`null` operand silently zeroed,
empty body mis-classified, dead mux in the wire path) and a suite
that skipped several rules required by the contract and T-003.
Every defect fell inside the T-003 file scope, none required a new
dependency, none reopened accepted decisions, and each correction
is covered by a targeted test. No calculator-domain or server file
was touched. After corrections the boundary satisfies contract §6
through §9 and §11, and T-003's required behavior list.

Verdict: **PASS WITH CORRECTIONS.**
