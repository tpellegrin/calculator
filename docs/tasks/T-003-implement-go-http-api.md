# T-003 — Implement the Go HTTP API

- **Status**: Implemented
- **Depends on**: T-001, T-002
- **Owner**: Thiago (implementer TBD)

## Objective

Implement the HTTP boundary that realizes the accepted request,
response, status, header, and error-envelope contract, delegating all
arithmetic to `internal/calculator`.

## Authoritative inputs

- [`docs/calculator-contract.md`](../calculator-contract.md), especially
  §6 Request/response, §7 Validation, §8 Error vocabulary, §9 Headers
  and routing, §11 HTTP boundary, §20 Security constraints.
- [`docs/architecture.md`](../architecture.md).
- [`docs/what-not-to-do.md`](../what-not-to-do.md).
- [`apps/api/README.md`](../../apps/api/README.md).

## Context

`apps/api/internal/httpapi` is a boundary placeholder. This task
creates HTTP handlers, DTOs, decoding, encoding, status mapping, and
tests using `net/http/httptest`.

## Accepted decisions

- Endpoints: `POST /api/v1/calculations`, `GET /healthz`.
- Body limit `16 KiB` via `http.MaxBytesReader`.
- Strict JSON decoding: `DisallowUnknownFields`, one-value-only
  (`decoder.More()` must be false), well-formed body.
- Media type gate: `application/json` with valid parameters permitted.
- Standard Go duplicate-member behavior (no custom parser).
- Error envelope shape from §6.4 with exactly the 12 codes in §8.
- `Cache-Control: no-store`, `Content-Type: application/json; charset=utf-8`,
  `Allow` on `405`.
- Zero normalization on echoed operands (`internal/calculator.NormalizeZero`).
- No CORS in this task.

## Scope

- Package `apps/api/internal/httpapi`:
  - request/response DTOs;
  - error envelope type and encoder;
  - status mapping table (`error.code` → HTTP status);
  - `POST /api/v1/calculations` handler;
  - `GET /healthz` handler;
  - top-level `http.Handler` (a `Mux` or `NewHandler(...)`) with
    method gating, `Allow` headers, and 404 fallback;
  - handler tests using `httptest`.

## File scope

Permitted:

- `apps/api/internal/httpapi/*.go`
- `apps/api/internal/httpapi/*_test.go`
- `apps/api/internal/httpapi/doc.go`

Not permitted:

- Any change to `apps/api/internal/calculator/**` (owned by T-002; if
  a domain gap is discovered, stop and report).
- `apps/api/cmd/server/**` (owned by T-004).
- New Go module dependencies.

## Out of scope

- Server startup, timeouts, signals (T-004).
- CORS, auth, static assets.
- Logging beyond a minimal noop-friendly logger interface.

## Required implementation

1. DTOs:
   ```go
   type CalculationRequest  struct { Operation string    `json:"operation"`; Operands []float64 `json:"operands"` }
   type CalculationResponse struct { Operation string    `json:"operation"`; Operands []float64 `json:"operands"`; Result float64 `json:"result"` }
   type ErrorEnvelope       struct { Error struct { Code string `json:"code"`; Message string `json:"message"` } `json:"error"` }
   ```
2. Status mapping table containing every code in contract §8 exactly
   once. Unknown mapping → `internal_error` / `500`.
3. Calculation handler pipeline:
   1. method gate (`POST`); other → `405` + `Allow: POST`;
   2. body limit via `http.MaxBytesReader(w, r.Body, 16 << 10)`;
   3. media-type gate via `mime.ParseMediaType`; must be
      `application/json`; parameters permitted;
   4. `json.Decoder` with `DisallowUnknownFields()`; decode into
      `CalculationRequest`;
   5. after decode, verify no trailing data via `dec.More()`;
   6. classify decode errors:
      - `http.MaxBytesError` → `payload_too_large`/413;
      - unknown-field error → `invalid_request`/400;
      - trailing data → `invalid_json`/400;
      - syntax / unexpected-EOF / type mismatch → `invalid_request`
        for structural issues that produce identifiable JSON-type
        errors (e.g. numeric string in `operands`), else
        `invalid_json`;
   7. call `calculator.Calculate(Operation(op), operands)`; map
      domain errors via `errors.Is` to `division_by_zero`,
      `math_domain`, `numeric_overflow`, `unsupported_operation`,
      `invalid_operands`;
   8. echo `operation` and zero-normalized `operands` alongside
      `result`.
4. Health handler: `GET` on `/healthz` returns `200 OK` with exactly
   the JSON body `{"status":"ok"}` (contract §6.1), and the standard
   `Content-Type: application/json; charset=utf-8` and
   `Cache-Control: no-store` headers. Wrong method → `405` with
   `Allow: GET` and the JSON envelope (see step 5).
5. Router:
   - `POST /api/v1/calculations` → calculation handler;
   - `GET  /healthz` → health handler;
   - other methods on known paths → `method_not_allowed` with `Allow`;
   - any other path → `not_found`.
   The HTTP boundary **must own the body of every `405` response**.
   Go 1.22's `net/http.ServeMux` handles wrong-method matches by
   emitting a `text/plain` body via `http.Error`, which violates
   contract §6.4 and §9. Do **not** rely on that default body.
   Acceptable implementations include:
   - explicit method dispatch inside each path handler that emits the
     JSON envelope with `Allow` set;
   - explicit fallback handlers registered per known path (for
     example `mux.HandleFunc("/api/v1/calculations", ...)` doing its
     own method switch, or a second registration for the disallowed
     method that writes the envelope);
   - a small middleware that wraps the mux and rewrites `405`
     responses to the JSON envelope while preserving the mux's
     `Allow` header.
   Whichever technique is chosen, every `405` response must carry:
   - `Content-Type: application/json; charset=utf-8`;
   - `Cache-Control: no-store`;
   - `Allow: POST` for `/api/v1/calculations`, `Allow: GET` for
     `/healthz`;
   - the envelope
     `{"error":{"code":"method_not_allowed","message":"<diagnostic English message>"}}`.
   The same envelope discipline applies to `404`, `413`, `415`, and
   every other non-2xx response the HTTP boundary emits. Do not
   prescribe a fragile body-rewriting technique unless necessary;
   the observable outcome is what the tests check.
6. Every response sets `Content-Type: application/json; charset=utf-8`
   and `Cache-Control: no-store`.
7. Panic protection is left to T-004; handlers must not intentionally
   panic.

## Required behavior

Reproducible via `httptest`:

- `POST /api/v1/calculations` with `{"operation":"divide","operands":[10,4]}`
  → `200`, body `{"operation":"divide","operands":[10,4],"result":2.5}`.
- Same with `[1,0]` → `422`, code `division_by_zero`.
- `power([-2,0.5])` → `422`, code `math_domain`.
- `power([10,1000])` → `422`, code `numeric_overflow`.
- `sqrt([-1])` → `422`, code `math_domain`.
- Empty body → `400`, code `invalid_json`.
- Trailing data (`{...}{...}`) → `400`, code `invalid_json`.
- Body containing a literal `NaN`, `Infinity`, or `-Infinity` token
  (e.g. `{"operation":"add","operands":[NaN, 1]}`) → `400`, code
  `invalid_json` (RFC 8259 §6; `encoding/json` returns
  `*json.SyntaxError`).
- Unknown field (`"foo":1`) → `400`, code `invalid_request`.
- Wrong operand type — stringified non-finite (`"NaN"`, `"Infinity"`),
  `null`, boolean, array, object — → `400`, code `invalid_request`
  (`*json.UnmarshalTypeError`).
- Operand count mismatch → `422`, code `invalid_operands`.
- Unknown `operation` → `422`, code `unsupported_operation`.
- `Content-Type: text/plain` → `415`, code `unsupported_media_type`.
- `Content-Type: application/json; charset=utf-8` → accepted.
- Body of 16 KiB + 1 → `413`, code `payload_too_large`.
- `GET /api/v1/calculations` → `405` + `Allow: POST`, code
  `method_not_allowed`.
- `POST /healthz` → `405` + `Allow: GET`.
- `GET /unknown` → `404`, code `not_found`.
- Every response has `Content-Type: application/json; charset=utf-8`
  and `Cache-Control: no-store`.
- Successful zero result normalizes `-0` operands and results to `0`
  on the wire.

## Edge cases

- Duplicate JSON keys: the last value wins (Go stdlib default);
  accepted and asserted in a test.
- Literal non-finite JSON tokens (`NaN`, `Infinity`, `-Infinity`) are
  not valid JSON per RFC 8259 §6; `encoding/json` rejects them
  structurally with `*json.SyntaxError`, mapping to `invalid_json`,
  never `invalid_request`. Test with the literal token `NaN` in the
  body (unquoted). Stringified non-finite values (`"NaN"`,
  `"Infinity"`) decode successfully as strings and fail schema-shape
  classification via `*json.UnmarshalTypeError` → `invalid_request`;
  cover both.
- `Content-Type: application/JSON` and
  `Content-Type: application/json; charset="utf-8"` must both be
  accepted (case-insensitive type, quoted parameters permitted).
- Empty `operands` for a unary operation is an arity mismatch, not a
  domain overflow.

## Tests

- `httptest.NewRequest` / `httptest.NewRecorder` for every
  behavior above.
- Table-driven organization keyed by rule name; each row asserts
  status, response `code`, and required headers.
- One test asserts that responses tolerate readers observing partial
  bodies (`w.Result().Body`), and that the body is well-formed JSON.

## Validation

From `apps/api/`:

```bash
test -z "$(gofmt -l .)"
go vet ./...
go test ./internal/httpapi/...
go test -race ./internal/httpapi/...
go build ./...
```

## Documentation impact

- `apps/api/internal/httpapi/doc.go` summarizing the HTTP boundary.
- No edits to root docs; the contract already documents this behavior.

## Stop conditions

- A rule cannot be implemented without changing `internal/calculator`
  (stop; escalate).
- A rule requires a new dependency (stop; escalate).
- Contract and this task appear to conflict (stop; escalate).

## Completion report

- **Files added**: `internal/httpapi/errors.go`, `internal/httpapi/handler.go`, `internal/httpapi/handler_test.go`.
- **Endpoints wired**: `POST /api/v1/calculations`, `GET /healthz`.
- **Status-mapping table**: Implemented in `internal/httpapi/errors.go` covering all 12 contract codes.
- **Validation**:
  - `go test ./internal/httpapi/...`: PASS
  - `go test -race ./internal/httpapi/...`: PASS
  - `go vet ./...`: PASS
  - `go build ./...`: PASS
- **Scope confirmation**:
  - No dependencies added.
  - No changes to `internal/calculator` or `cmd/server`.
  - Every 405 is JSON with `Allow` header.
  - Body limit (16 KiB) and strict JSON decoding enforced.
  - Zero normalization preserved.
